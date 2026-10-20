import { useEffect, useSyncExternalStore } from 'react';

import { AUTH_CHANGED_EVENT, getAuthCacheKey } from './authService';
import { getMusicTracks, type MusicTrack } from './communityService';

export interface MusicPlayerState {
  tracks: MusicTrack[];
  loading: boolean;
  currentId: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: boolean;
  likedIds: number[];
  volume: number;
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
  volume: 50,
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

export const isPlayableTrack = (track: MusicTrack | null | undefined): track is MusicTrack =>
  Boolean(track && track.url && !track.is_locked);

 const getCurrentTrack = (): MusicTrack | null =>
  state.tracks.find((track) => track.id === state.currentId) ?? null;

let audio: HTMLAudioElement | null = null;
let loadedSrc = '';

const ensureAudio = (): HTMLAudioElement => {
  if (audio) return audio;

  audio = new Audio();
  audio.volume = state.volume / 100;
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

const authSignature = getAuthCacheKey;

let inflight: Promise<void> | null = null;
let loadedSignature: string | null = null;

const applyTracks = (tracks: MusicTrack[]) => {
  const current = tracks.find((track) => track.id === state.currentId) ?? tracks[0] ?? null;
  const wasPlaying = state.isPlaying;

  setState({ tracks, loading: false, currentId: current?.id ?? null });

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

export const ensureMusicLibrary = (): Promise<void> => {
  if (inflight) return inflight;
  if (loadedSignature === authSignature()) return Promise.resolve();
  return fetchLibrary();
};

export const refreshMusicLibrary = (): Promise<void> => (inflight ? inflight : fetchLibrary());

if (typeof window !== 'undefined') {

  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    if (loadedSignature !== null && loadedSignature !== authSignature()) void fetchLibrary();
  });
}

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

export const setVolume = (value: number) => {
  if (!Number.isFinite(value)) return;
  const volume = Math.min(100, Math.max(0, value));
  if (audio) audio.volume = volume / 100;
  setState({ volume });
};

export const seekTo = (seconds: number) => {
  const element = ensureAudio();
  if (!Number.isFinite(seconds) || !loadedSrc) return;
  element.currentTime = seconds;
  setState({ currentTime: seconds });
};

export const useMusicPlayer = (): MusicPlayerState => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void ensureMusicLibrary();
  }, []);

  return snapshot;
};
