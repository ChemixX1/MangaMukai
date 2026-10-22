import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { useHomeData } from './HomeDataContext';
import { AUTH_CHANGED_EVENT, getAuthCacheKey } from '../services/authService';
import { prepareHomeManga } from '../services/homeNavigationPrefetch';
import { scheduleBackgroundTask } from '../utils/backgroundTasks';
import { createHomeNavigationQueue, type HomePrefetchTarget } from '../utils/homeNavigationQueue';
import { prefetchRoute } from '../utils/prefetchRoute';

const HomePrefetchContext = createContext<ReturnType<typeof createHomeNavigationQueue> | null>(null);

export function HomePrefetchProvider({ children }: { children: ReactNode }) {
  const { isReady, isOutage } = useHomeData();
  const queue = useMemo(() => {
    let sequence = 0;
    return createHomeNavigationQueue(
      task => scheduleBackgroundTask(`home:navigation:${++sequence}`, task), prepareHomeManga,
    );
  }, []);

  useEffect(() => {
    const updateVisibility = () => queue.setEnabled(isReady && !isOutage && !document.hidden);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    const stop = () => { queue.stop(); document.removeEventListener('visibilitychange', updateVisibility); };
    if (!isReady || isOutage) return stop;
    const cancelDetail = prefetchRoute('/manga/home', 'idle');
    const cancelReader = prefetchRoute('/read/home', 'idle');
    const cancelMusic = scheduleBackgroundTask('home:music', async () => {
      const { ensureMusicLibrary } = await import('../services/musicPlayer');
      return ensureMusicLibrary();
    });
    return () => { stop(); cancelDetail(); cancelReader(); cancelMusic(); };
  }, [queue, isReady, isOutage]);
  useEffect(() => {
    let owner = getAuthCacheKey();
    const changed = () => {
      const next = getAuthCacheKey();
      if (owner === next) return;
      owner = next;
      queue.reset();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, changed);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, changed);
  }, [queue]);
  return <HomePrefetchContext.Provider value={queue}>{children}</HomePrefetchContext.Provider>;
}

/** Only the active tab/page and its immediate successor are registered. */
export function useHomePrefetchGroup(
  ref: RefObject<HTMLElement | null>,
  current: HomePrefetchTarget[],
  next: HomePrefetchTarget[] = [],
) {
  const queue = useContext(HomePrefetchContext);
  const key = useId();
  const [visible, setVisible] = useState(false);
  const selection = JSON.stringify({ current, next });
  useEffect(() => {
    const element = ref.current;
    if (!queue || !element) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [queue, ref]);
  useEffect(() => {
    if (queue) queue.setGroup(key, { ...JSON.parse(selection), visible });
  }, [queue, key, selection, visible]);
  useEffect(() => () => queue?.removeGroup(key), [queue, key]);
}
