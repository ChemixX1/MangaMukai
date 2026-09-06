import { useEffect, useSyncExternalStore } from 'react';

import { AUTH_CHANGED_EVENT, getStoredToken, getStoredUser } from './authService';
import { getMusicTracks, type MusicTrack } from './communityService';

/**
 * Reproductor único de Mukai Music.
 *
 * Toda la web comparte esta instancia: una sola petición a /music, un solo
 * elemento de audio y un solo estado. Así la tarjeta se puede montar en
 * MangaDetail y en el lector sin duplicar peticiones ni pistas sonando a la vez,
 * y el desbloqueo (suscripción activada) se refleja en todas al instante.
 */
export interface MusicPlayerState {
  tracks: MusicTrack[];
  loading: boolean;
  currentId: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: boolean;
  likedIds: number[];
}

const initialState: MusicPlayerState = {
  tracks: [],
  loading: true,
  currentId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  error: false,
  likedIds: [],
};

let state: MusicPlayerState = initialState;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setState = (patch: Partial<MusicPlayerState>) => {
  state = { ...state, ...patch };
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

/** Una pista solo suena si la sesión tiene acceso: el backend oculta la url. */
export const isPlayableTrack = (track: MusicTrack | null | undefined): track is MusicTrack =>
  Boolean(track && track.url && !track.is_locked);

export const getCurrentTrack = (): MusicTrack | null =>
  state.tracks.find((track) => track.id === state.currentId) ?? null;

// --- Audio compartido -------------------------------------------------------

let audio: HTMLAudioElement | null = null;
let loadedSrc = '';

const ensureAudio = (): HTMLAudioElement => {
  if (audio) return audio;

  audio = new Audio();
  audio.preload = 'metadata';
  audio.addEventListener('timeupdate', () => setState({ currentTime: audio?.currentTime ?? 0 }));
  audio.addEventListener('loadedmetadata', () => setState({ duration: audio?.duration ?? 0 }));
  audio.addEventListener('play', () => setState({ isPlaying: true, error: false }));
  audio.addEventListener('pause', () => setState({ isPlaying: false }));
  audio.addEventListener('ended', () => playNext(true));
  audio.addEventListener('error', () => setState({ error: true, isPlaying: false }));
  return audio;
};

const startPlayback = () => {
  const element = ensureAudio();
  void element.play().catch(() => setState({ error: true, isPlaying: false }));
};

/** Apunta el audio compartido a la pista indicada (y opcionalmente la lanza). */
const syncSource = (track: MusicTrack | null, autoplay: boolean) => {
  const url = isPlayableTrack(track) ? track.url : '';

  if (url === loadedSrc) {
    if (autoplay && url) startPlayback();
    return;
  }

  const element = ensureAudio();
  loadedSrc = url;

  if (!url) {
    element.pause();
    element.removeAttribute('src');
    element.load();
    setState({ isPlaying: false, currentTime: 0, duration: 0 });
    return;
  }

  element.src = url;
  element.load();
  setState({ currentTime: 0, duration: 0, error: false });
  if (autoplay) startPlayback();
};

// --- Biblioteca -------------------------------------------------------------

/** Token + estado premium: si cambia, la lista se vuelve a pedir. */
const authSignature = () => {
  const user = getStoredUser();
  return `${getStoredToken() ?? ''}|${user?.isPremium || user?.is_premium ? 1 : 0}`;
};

let inflight: Promise<void> | null = null;
let loadedSignature: string | null = null;

const applyTracks = (tracks: MusicTrack[]) => {
  const current = tracks.find((track) => track.id === state.currentId) ?? tracks[0] ?? null;
  const wasPlaying = state.isPlaying;

  setState({ tracks, loading: false, currentId: current?.id ?? null });
  // Si la suscripción acaba de activarse, la pista ya trae url y arranca sola.
  syncSource(current, wasPlaying && isPlayableTrack(current));
};

const fetchLibrary = (): Promise<void> => {
  const signature = authSignature();
  if (!state.tracks.length) setState({ loading: true });

  inflight = getMusicTracks()
    .then((tracks) => {
      loadedSignature = signature;
      applyTracks(tracks);
    })
    .catch(() => {
      setState({ loading: false });
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
};

/** Carga la lista una sola vez por sesión/estado de cuenta. */
export const ensureMusicLibrary = (): Promise<void> => {
  if (inflight) return inflight;
  if (loadedSignature === authSignature()) return Promise.resolve();
  return fetchLibrary();
};

/** Fuerza la recarga: se usa al volver de un pago o al activar la suscripción. */
export const refreshMusicLibrary = (): Promise<void> => (inflight ? inflight : fetchLibrary());

if (typeof window !== 'undefined') {
  // Iniciar/cerrar sesión o activar el premium cambia la firma: se repite la
  // consulta para que el candado se abra (o se cierre) sin recargar la página.
  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    if (loadedSignature !== null && loadedSignature !== authSignature()) void fetchLibrary();
  });
}

// --- Acciones ---------------------------------------------------------------

export const selectTrack = (id: number, autoplay = true) => {
  const track = state.tracks.find((item) => item.id === id) ?? null;
  if (!track) return;
  setState({ currentId: track.id });
  syncSource(track, autoplay && isPlayableTrack(track));
};

export const togglePlay = () => {
  const track = getCurrentTrack();
  if (!isPlayableTrack(track)) return;

  if (state.isPlaying) {
    ensureAudio().pause();
    return;
  }
  syncSource(track, true);
};

const step = (offset: number, autoplay: boolean) => {
  const { tracks, currentId } = state;
  if (tracks.length === 0) return;
  const index = tracks.findIndex((track) => track.id === currentId);
  const next = tracks[(index + offset + tracks.length) % tracks.length];
  if (next) selectTrack(next.id, autoplay);
};

export const playNext = (autoplay = true) => step(1, autoplay);
export const playPrev = (autoplay = true) => step(-1, autoplay);

export const seekTo = (seconds: number) => {
  const element = ensureAudio();
  if (!Number.isFinite(seconds) || !loadedSrc) return;
  element.currentTime = seconds;
  setState({ currentTime: seconds });
};

export const toggleLike = (id: number) => {
  const likedIds = state.likedIds.includes(id)
    ? state.likedIds.filter((liked) => liked !== id)
    : [...state.likedIds, id];
  setState({ likedIds });
};

// --- Hook -------------------------------------------------------------------

export const useMusicPlayer = (): MusicPlayerState => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void ensureMusicLibrary();
  }, []);

  return snapshot;
};
