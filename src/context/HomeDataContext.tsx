import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';
import type { MangaCapitulo } from '../types/manga';
import {
  getPopularWomenByViews,
  getPopularMenByViews,
  getLatestWomenUpdates,
  getLatestMenUpdates,
  getNewReleases,
} from '../services/mangaService';
import { preloadImages } from '../utils/preloadImages';
import { seedSharedAuthCovers } from '../utils/authCoverCache';

interface HomeData {
  popularWeekly: MangaCapitulo[];
  popularMenWeekly: MangaCapitulo[];
  popularHistorical: MangaCapitulo[];
  popularMenHistorical: MangaCapitulo[];
  latestWomen: MangaCapitulo[];
  latestMen: MangaCapitulo[];
  newReleases: MangaCapitulo[];
  isReady: boolean;
  /** El servidor no respondió a ninguna petición: la portada quedaría vacía. */
  isOutage: boolean;
  /** Vuelve a pedir los datos (la pantalla de emergencia lo hace sola cada pocos segundos). */
  retry: () => void;
}

type HomeDataPayload = Omit<HomeData, 'isReady' | 'retry'>;

/** Con el servidor caído se reintenta en silencio cada tanto hasta que vuelva. */
const OUTAGE_RETRY_MS = 15000;

let cachedHomeData: HomeDataPayload | null = null;
let pendingHomeData: Promise<HomeDataPayload> | null = null;

/**
 * Solo se espera a las portadas que se ven sin desplazar la página. Antes se
 * descargaban y decodificaban las ~32 antes de levantar el loader, así que la
 * pantalla de carga duraba lo que tardaba la última imagen del carrusel; el
 * resto sigue precargándose, pero ya con la página a la vista.
 */
const ABOVE_THE_FOLD_COVERS = 8;

const preloadCriticalImages = async (payload: HomeDataPayload) => {
  const criticalMangas = [
    ...payload.popularWeekly,
    ...payload.popularMenWeekly,
    ...payload.popularHistorical.slice(0, 3),
    ...payload.popularMenHistorical.slice(0, 2),
    ...payload.latestWomen.slice(0, 2),
    ...payload.latestMen.slice(0, 2),
    ...payload.newReleases.slice(0, 1),
  ];
  const authCovers = seedSharedAuthCovers(criticalMangas);
  const sources = authCovers.map(cover => cover.src);

  await preloadImages(sources.slice(0, ABOVE_THE_FOLD_COVERS));
  void preloadImages(sources.slice(ABOVE_THE_FOLD_COVERS));
};

const loadHomeData = (): Promise<HomeDataPayload> => {
  if (cachedHomeData) return Promise.resolve(cachedHomeData);
  if (pendingHomeData) return pendingHomeData;

  pendingHomeData = Promise.all([
    getPopularWomenByViews('weekly', false),
    getPopularMenByViews('weekly', false),
    getPopularWomenByViews('historical', false),
    getPopularMenByViews('historical', false),
    getLatestWomenUpdates(72),
    getLatestMenUpdates(72),
    getNewReleases(),
  ]).then(([
    popularWomenWeekly,
    popularMenWeekly,
    popularWomen,
    popularMen,
    latestWomen,
    latestMen,
    newReleases,
  ]) => {
    const payload: HomeDataPayload = {
      popularWeekly: popularWomenWeekly.slice(0, 12),
      popularMenWeekly: popularMenWeekly.slice(0, 12),
      popularHistorical: popularWomen.slice(0, 12),
      popularMenHistorical: popularMen.slice(0, 12),
      latestWomen: latestWomen.slice(0, 72),
      latestMen: latestMen.slice(0, 72),
      newReleases,
      isOutage: false,
    };
    // Cada servicio devuelve [] cuando su petición falla (HTTP 500, sin red…). Que
    // fallen las siete a la vez solo pasa con el servidor caído: no se guarda en
    // caché, para que el siguiente intento vuelva a preguntar.
    const lists = [payload.popularWeekly, payload.popularMenWeekly, payload.popularHistorical, payload.popularMenHistorical, payload.latestWomen, payload.latestMen, payload.newReleases];
    if (lists.every((list) => list.length === 0)) return { ...payload, isOutage: true };
    cachedHomeData = payload;
    return payload;
  }).finally(() => {
    pendingHomeData = null;
  });

  return pendingHomeData;
};

const EMPTY_HOME_DATA: HomeData = {
  popularWeekly: [],
  popularMenWeekly: [],
  popularHistorical: [],
  popularMenHistorical: [],
  latestWomen: [],
  latestMen: [],
  newReleases: [],
  isReady: false,
  isOutage: false,
  retry: () => {},
};

const HomeDataContext = createContext<HomeData>(EMPTY_HOME_DATA);

export const useHomeData = () => useContext(HomeDataContext);

export const HomeDataProvider = ({ children }: { children: ReactNode }) => {
  /* Al volver a la portada desde otra página el proveedor se monta de nuevo. Si
     ya hay datos cargados se arranca con ellos, así los listados se pintan en el
     primer fotograma en vez de vaciarse y rellenarse otra vez. */
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const [data, setData] = useState<HomeData>(
    () => (cachedHomeData ? { ...cachedHomeData, isReady: true, retry } : { ...EMPTY_HOME_DATA, retry }),
  );

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;

    loadHomeData()
      .then(async (payload) => {
        if (cancelled) return;
        if (payload.isOutage) {
          // Servidor caído: pantalla de emergencia y nuevo intento en unos segundos.
          setData({ ...payload, isReady: true, retry });
          retryTimer = window.setTimeout(retry, OUTAGE_RETRY_MS);
          return;
        }
        await preloadCriticalImages(payload);
        if (cancelled) return;
        // Al volver desde la caché el estado inicial ya es esta misma carga: se
        // deja tal cual para no provocar un repintado con datos idénticos.
        setData((current) => (current.isReady && current.popularWeekly === payload.popularWeekly
          ? current
          : { ...payload, isReady: true, retry }));
      })
      .catch((error) => {
        console.error('HomeDataContext preload error:', error);
        if (cancelled) return;
        // Si los datos llegaron y falló solo la precarga, se pintan igual; sin datos, emergencia.
        const fallback = cachedHomeData;
        setData((prev) => (fallback ? { ...fallback, isReady: true, retry } : { ...prev, isReady: true, isOutage: true, retry }));
        if (!fallback) retryTimer = window.setTimeout(retry, OUTAGE_RETRY_MS);
      });

    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [attempt, retry]);

  return <HomeDataContext.Provider value={data}>{children}</HomeDataContext.Provider>;
};
