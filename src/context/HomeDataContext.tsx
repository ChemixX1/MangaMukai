import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { MangaCapitulo } from '../types/manga';
import {
  getPopularWomenByViews,
  getPopularMenByViews,
  getLatestWomenUpdates,
  getLatestMenUpdates,
  getNewReleases,
} from '../services/mangaService';

interface HomeData {
  popularHistorical: MangaCapitulo[];
  popularMenHistorical: MangaCapitulo[];
  latestWomen: MangaCapitulo[];
  latestMen: MangaCapitulo[];
  newReleases: MangaCapitulo[];
  isReady: boolean;
}

type HomeDataPayload = Omit<HomeData, 'isReady'>;

const HOME_LOADING_EVENT = 'mangamukai:home-loading';

let cachedHomeData: HomeDataPayload | null = null;
let pendingHomeData: Promise<HomeDataPayload> | null = null;

const emitLoadingProgress = (progress: number, complete = false) => {
  window.dispatchEvent(new CustomEvent(HOME_LOADING_EVENT, {
    detail: { progress, complete },
  }));
};

const preloadImage = (source: string): Promise<void> => new Promise((resolve) => {
  if (!source) {
    resolve();
    return;
  }

  const image = new Image();
  const timeout = window.setTimeout(resolve, 2500);
  const finish = () => {
    window.clearTimeout(timeout);
    resolve();
  };

  image.onload = finish;
  image.onerror = finish;
  image.src = source;
  if (image.complete) finish();
});

const preloadCriticalImages = async (payload: HomeDataPayload) => {
  const sources = [
    ...payload.popularHistorical.slice(0, 3),
    ...payload.popularMenHistorical.slice(0, 2),
    ...payload.latestWomen.slice(0, 2),
    ...payload.latestMen.slice(0, 2),
    ...payload.newReleases.slice(0, 1),
  ].map(manga => manga.portada).filter(Boolean);

  await Promise.allSettled([...new Set(sources)].map(preloadImage));
};

const loadHomeData = (): Promise<HomeDataPayload> => {
  if (cachedHomeData) return Promise.resolve(cachedHomeData);
  if (pendingHomeData) return pendingHomeData;

  let completedRequests = 0;
  const track = async <T,>(request: Promise<T>): Promise<T> => {
    try {
      return await request;
    } finally {
      completedRequests += 1;
      emitLoadingProgress(completedRequests * 17);
    }
  };

  pendingHomeData = Promise.all([
    track(getPopularWomenByViews('historical', false)),
    track(getPopularMenByViews('historical', false)),
    track(getLatestWomenUpdates(72)),
    track(getLatestMenUpdates(72)),
    track(getNewReleases()),
  ]).then(([
    popularWomen,
    popularMen,
    latestWomen,
    latestMen,
    newReleases,
  ]) => {
    cachedHomeData = {
      popularHistorical: popularWomen.slice(0, 12),
      popularMenHistorical: popularMen.slice(0, 12),
      latestWomen: latestWomen.slice(0, 72),
      latestMen: latestMen.slice(0, 72),
      newReleases,
    };
    return cachedHomeData;
  }).finally(() => {
    pendingHomeData = null;
  });

  return pendingHomeData;
};

const HomeDataContext = createContext<HomeData>({
  popularHistorical: [],
  popularMenHistorical: [],
  latestWomen: [],
  latestMen: [],
  newReleases: [],
  isReady: false,
});

export const useHomeData = () => useContext(HomeDataContext);

export const HomeDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<HomeData>({
    popularHistorical: [],
    popularMenHistorical: [],
    latestWomen: [],
    latestMen: [],
    newReleases: [],
    isReady: false,
  });

  useEffect(() => {
    let cancelled = false;
    emitLoadingProgress(cachedHomeData ? 100 : 8);

    loadHomeData()
      .then(async (payload) => {
        if (cancelled) return;
        emitLoadingProgress(92);
        await preloadCriticalImages(payload);
        if (cancelled) return;
        setData({ ...payload, isReady: true });
        window.requestAnimationFrame(() => emitLoadingProgress(100, true));
      })
      .catch((error) => {
        console.error('HomeDataContext preload error:', error);
        if (cancelled) return;
        setData(prev => ({ ...prev, isReady: true }));
        emitLoadingProgress(100, true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <HomeDataContext.Provider value={data}>{children}</HomeDataContext.Provider>;
};
