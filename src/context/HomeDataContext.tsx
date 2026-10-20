import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';
import { getPopularWomenByViews, getPopularMenByViews, getLatestWomenUpdates, getLatestMenUpdates, getNewReleases } from '../services/mangaService';
import { seedSharedAuthCovers } from '../utils/authCoverCache';
import { createHomeDataLoader, type HomeSnapshot } from '../utils/progressiveHomeData';
import { loadSearchCatalog } from '../services/searchCatalog';
import { scheduleSubscriptionBackground } from '../utils/subscriptionBackground';
import { blockBackgroundTasks, scheduleBackgroundTask } from '../utils/backgroundTasks';

interface HomeData extends HomeSnapshot {
  retry: () => void;
}

const OUTAGE_RETRY_MS = 15000;
const loader = createHomeDataLoader({
  popularHistorical: async () => (await getPopularWomenByViews('historical', false)).slice(0, 12),
  popularWeekly: async () => (await getPopularWomenByViews('weekly', false)).slice(0, 12),
  latestWomen: () => getLatestWomenUpdates(72),
  popularMenHistorical: async () => (await getPopularMenByViews('historical', false)).slice(0, 12),
  popularMenWeekly: async () => (await getPopularMenByViews('weekly', false)).slice(0, 12),
  latestMen: () => getLatestMenUpdates(72),
  newReleases: getNewReleases,
});

const HomeDataContext = createContext<HomeData>({ ...loader.getSnapshot(), retry: () => {} });
export const useHomeData = () => useContext(HomeDataContext);

export const HomeDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState(loader.getSnapshot);
  const retry = useCallback(() => {
    const release = blockBackgroundTasks();
    void loader.load().finally(release);
  }, []);

  useEffect(() => {
    const unsubscribe = loader.subscribe(setData);
    setData(loader.getSnapshot());
    const release = blockBackgroundTasks();
    void loader.load().finally(release);
    return () => { unsubscribe(); release(); };
  }, []);

  useEffect(() => {
    if (!data.isOutage) return;
    const timer = window.setTimeout(retry, OUTAGE_RETRY_MS);
    return () => window.clearTimeout(timer);
  }, [data.isOutage, retry]);

  useEffect(() => {

    seedSharedAuthCovers([
      ...data.popularHistorical,
      ...data.popularWeekly,
      ...data.latestWomen,
      ...data.popularMenHistorical,
      ...data.latestMen,
      ...data.newReleases,
    ], 24);
  }, [data.popularHistorical, data.popularWeekly, data.latestWomen, data.popularMenHistorical, data.latestMen, data.newReleases]);

  useEffect(() => {
    if (!data.isReady || data.isOutage) return;

    return scheduleBackgroundTask('search:catalog', () => loadSearchCatalog());
  }, [data.isReady, data.isOutage]);

  const allListsLoaded = Object.values(data.loaded).every(Boolean);
  useEffect(() => {
    if (!allListsLoaded || data.isOutage) return;
    return scheduleSubscriptionBackground();
  }, [allListsLoaded, data.isOutage]);

  return <HomeDataContext.Provider value={{ ...data, retry }}>{children}</HomeDataContext.Provider>;
};
