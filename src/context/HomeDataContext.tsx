import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
}

type HomeDataPayload = Omit<HomeData, 'isReady'>;

const HOME_LOADING_EVENT = 'mangamukai:home-loading';
const HOME_REQUEST_COUNT = 7;

let cachedHomeData: HomeDataPayload | null = null;
let pendingHomeData: Promise<HomeDataPayload> | null = null;

const emitLoadingProgress = (progress: number, complete = false) => {
  window.dispatchEvent(new CustomEvent(HOME_LOADING_EVENT, {
    detail: { progress, complete },
  }));
};

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

  await preloadImages(sources);
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
      emitLoadingProgress(8 + Math.round((completedRequests / HOME_REQUEST_COUNT) * 80));
    }
  };

  pendingHomeData = Promise.all([
    track(getPopularWomenByViews('weekly', false)),
    track(getPopularMenByViews('weekly', false)),
    track(getPopularWomenByViews('historical', false)),
    track(getPopularMenByViews('historical', false)),
    track(getLatestWomenUpdates(72)),
    track(getLatestMenUpdates(72)),
    track(getNewReleases()),
  ]).then(([
    popularWomenWeekly,
    popularMenWeekly,
    popularWomen,
    popularMen,
    latestWomen,
    latestMen,
    newReleases,
  ]) => {
    cachedHomeData = {
      popularWeekly: popularWomenWeekly.slice(0, 12),
      popularMenWeekly: popularMenWeekly.slice(0, 12),
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
  popularWeekly: [],
  popularMenWeekly: [],
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
    popularWeekly: [],
    popularMenWeekly: [],
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
