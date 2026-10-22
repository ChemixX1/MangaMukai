import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { blockBackgroundTasks, getBackgroundPolicy, scheduleBackgroundTask } from '../../utils/backgroundTasks';
import { idleRouteCandidates, routeModuleKey } from '../../utils/routePrefetchPolicy';
import { prefetchRoute } from '../../utils/prefetchRoute';

export function NavigationPreload() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/read/')) return blockBackgroundTasks();
    const policy = getBackgroundPolicy();
    const cancellations = policy.allowSpeculation
      ? idleRouteCandidates(pathname, policy.constrained).map(path => prefetchRoute(path, 'idle'))
      : [];
    return () => cancellations.forEach(cancel => cancel());
  }, [pathname]);

  useEffect(() => {
    let cancelIntent = () => {};
    let activeLink: HTMLAnchorElement | null = null;
    const clear = () => { cancelIntent(); activeLink = null; };
    const warm = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link === activeLink || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const path = url.hash.startsWith('#/') ? url.hash.slice(1) : url.pathname;
      if (routeModuleKey(path) === routeModuleKey(pathname)) return;
      clear();
      activeLink = link;
      const cancelRoute = prefetchRoute(path);
      const mangaId = /^\/manga\/([^/?#]+)/.exec(path)?.[1];
      const controller = new AbortController();
      const cancelDetail = mangaId ? scheduleBackgroundTask(`detail:${mangaId}`, async () => {
        const { prepareHomeManga } = await import('../../services/homeNavigationPrefetch');
        if (!controller.signal.aborted) await prepareHomeManga({ mangaId, chapterIds: [] }, controller.signal, 'detail');
      }, { priority: 'intent' }) : () => {};
      cancelIntent = () => { cancelRoute(); cancelDetail(); controller.abort(); };
    };
    const leave = (event: Event) => {
      const next = (event as MouseEvent).relatedTarget;
      if (!activeLink || (next instanceof Node && activeLink.contains(next))) return;
      clear();
    };
    // Delegation also covers cards and links added after data arrives, without per-card effects.
    document.addEventListener('pointerover', warm, { passive: true });
    document.addEventListener('focusin', warm);
    document.addEventListener('pointerout', leave);
    document.addEventListener('focusout', leave);
    document.addEventListener('touchstart', warm, { passive: true });
    return () => {
      clear();
      document.removeEventListener('pointerover', warm);
      document.removeEventListener('focusin', warm);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('focusout', leave);
      document.removeEventListener('touchstart', warm);
    };
  }, [pathname]);
  return null;
}
