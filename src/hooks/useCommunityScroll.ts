import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { getCommunityPosition, rememberCommunityPosition } from '../services/communityViewState';

export function useCommunityScroll(userId: string, loading: boolean) {
  const { pathname, search, state, key } = useLocation();
  const navigationType = useNavigationType();
  const restore = Boolean(state?.restoreCommunityScroll) || navigationType === 'POP';

  useLayoutEffect(() => {
    if (pathname !== '/comunidad' || loading) return;
    const url = pathname + search;
    const saved = getCommunityPosition(userId);
    const target = restore && saved?.url === url ? saved.scrollY : 0;
    let restoring = true;
    let observer: ResizeObserver | undefined;
    let timeout = 0;
    const remember = () => {
      if (!restoring) rememberCommunityPosition(userId, url, window.scrollY);
    };
    const stopRestoring = () => {
      restoring = false;
      observer?.disconnect();
      window.clearTimeout(timeout);
      remember();
    };
    const scroll = () => {
      window.scrollTo({ top: target, left: 0, behavior: 'instant' });
      if (Math.abs(window.scrollY - target) < 2) stopRestoring();
    };
    scroll();
    // Cached pages normally restore immediately; wait for layout if media is still loading.
    if (restoring) {
      observer = new ResizeObserver(scroll);
      observer.observe(document.getElementById('root') ?? document.body);
      timeout = window.setTimeout(stopRestoring, 3000);
    }
    window.addEventListener('scroll', remember, { passive: true });
    window.addEventListener('pointerdown', stopRestoring, { passive: true });
    window.addEventListener('touchstart', stopRestoring, { passive: true });
    window.addEventListener('wheel', stopRestoring, { passive: true });
    window.addEventListener('keydown', stopRestoring);
    return () => {
      observer?.disconnect();
      window.clearTimeout(timeout);
      window.removeEventListener('scroll', remember);
      window.removeEventListener('pointerdown', stopRestoring);
      window.removeEventListener('touchstart', stopRestoring);
      window.removeEventListener('wheel', stopRestoring);
      window.removeEventListener('keydown', stopRestoring);
    };
  }, [userId, loading, pathname, search, key, restore]);
}
