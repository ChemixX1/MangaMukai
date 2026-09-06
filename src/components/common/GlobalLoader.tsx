import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { GLOBAL_LOADING_EVENT, type GlobalLoadingDetail } from '../../utils/globalLoading';
import { lockPageScroll } from '../../utils/scrollLock';
import { MukaiLoaderWheel } from './MukaiLoaderWheel';

const HOME_LOADING_EVENT = 'mangamukai:home-loading';
const MINIMUM_VISIBLE_TIME = 720;
const MAXIMUM_VISIBLE_TIME = 10000;
// El lector trae su propia rueda y precarga los capitulos vecinos: nunca cubrirlo con el loader global.
const isReaderDestination = (to: string) => /^\/read\/[^/?]+/.test(to);
const isAuthViewTransition = (from: string, to: string) => {
  const fromPath = from.split('?')[0];
  const toPath = to.split('?')[0];
  return fromPath.startsWith('/auth/') && toPath.startsWith('/auth/');
};

export const GlobalLoader = () => {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(6);
  const releaseScrollRef = useRef<(() => void) | null>(null);
  const startedAtRef = useRef(0);
  const finishingRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const maximumTimerRef = useRef<number | null>(null);
  const routeLoadingRef = useRef(false);
  const explicitLoadingRef = useRef(false);
  const activeScopesRef = useRef(new Set<string>());
  const beginRef = useRef<((initialProgress?: number, isRouteLoading?: boolean) => void) | null>(null);
  const finishRef = useRef<((force?: boolean) => void) | null>(null);
  const previousRouteRef = useRef<string | null>(null);
  const reduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const location = useLocation();
  const isLightMode = theme === 'light';

  const restoreScroll = () => {
    releaseScrollRef.current?.();
    releaseScrollRef.current = null;
  };

  useEffect(() => {
    // El fondo crítico del HTML permanece hasta que este overlay ya fue pintado.
    document.documentElement.classList.remove('app-preloading');

    const clearFinishTimer = () => {
      if (finishTimerRef.current === null) return;
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    };

    const clearMaximumTimer = () => {
      if (maximumTimerRef.current === null) return;
      window.clearTimeout(maximumTimerRef.current);
      maximumTimerRef.current = null;
    };

    const finish = (force = false) => {
      if (routeLoadingRef.current && !force) return;
      if (finishingRef.current) return;
      finishingRef.current = true;
      clearMaximumTimer();
      setProgress(100);
      const elapsed = performance.now() - startedAtRef.current;
      const remaining = Math.max(220, MINIMUM_VISIBLE_TIME - elapsed);
      finishTimerRef.current = window.setTimeout(() => setShow(false), remaining);
    };

    const begin = (initialProgress = 6, isRouteLoading = false) => {
      clearFinishTimer();
      clearMaximumTimer();
      routeLoadingRef.current = isRouteLoading || routeLoadingRef.current;
      startedAtRef.current = performance.now();
      finishingRef.current = false;
      setProgress(initialProgress);
      setShow(true);

      if (!releaseScrollRef.current) releaseScrollRef.current = lockPageScroll();
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      maximumTimerRef.current = window.setTimeout(() => {
        activeScopesRef.current.clear();
        explicitLoadingRef.current = false;
        routeLoadingRef.current = false;
        finish(true);
      }, MAXIMUM_VISIBLE_TIME);
    };

    beginRef.current = begin;
    finishRef.current = finish;

    begin();

    const handleHomeProgress = (event: Event) => {
      if (routeLoadingRef.current) return;
      const detail = (event as CustomEvent<{ progress?: number; complete?: boolean }>).detail;
      if (typeof detail?.progress === 'number') {
        setProgress(previous => Math.max(previous, Math.min(100, detail.progress!)));
      }
      if (detail?.complete) finish();
    };

    const handleGlobalLoading = (event: Event) => {
      const detail = (event as CustomEvent<GlobalLoadingDetail>).detail;
      if (!detail) return;

      if (detail.status === 'start') {
        activeScopesRef.current.add(detail.scope || 'page');
        explicitLoadingRef.current = true;
        begin(detail.progress ?? 8, true);
        return;
      }

      if (typeof detail.progress === 'number') {
        setProgress(previous => Math.max(previous, Math.min(100, detail.progress!)));
      }

      if (detail.status === 'complete') {
        activeScopesRef.current.delete(detail.scope || 'page');
        if (activeScopesRef.current.size > 0) return;
        explicitLoadingRef.current = false;
        routeLoadingRef.current = false;
        finish();
      }
    };

    const handleInternalLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!target || target.target === '_blank' || target.hasAttribute('download')) return;

      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const currentRoute = `${window.location.pathname}${window.location.search}`;
      const destinationRoute = `${destination.pathname}${destination.search}`;
      if (currentRoute === destinationRoute) return;
      if (isAuthViewTransition(currentRoute, destinationRoute)) return;
      if (isReaderDestination(destinationRoute)) return;
      explicitLoadingRef.current = false;
      begin(8, true);
    };

    const handleWindowLoad = () => finish();

    window.addEventListener(HOME_LOADING_EVENT, handleHomeProgress);
    window.addEventListener(GLOBAL_LOADING_EVENT, handleGlobalLoading);
    document.addEventListener('click', handleInternalLink, true);

    const driftTimer = window.setInterval(() => {
      setProgress(previous => previous >= 90 ? previous : Math.min(90, previous + (previous < 35 ? 4 : 1)));
    }, 180);

    if (window.location.pathname !== '/') {
      if (document.readyState === 'complete') {
        finish();
      } else {
        window.addEventListener('load', handleWindowLoad, { once: true });
      }
    }

    return () => {
      window.removeEventListener(HOME_LOADING_EVENT, handleHomeProgress);
      window.removeEventListener(GLOBAL_LOADING_EVENT, handleGlobalLoading);
      window.removeEventListener('load', handleWindowLoad);
      document.removeEventListener('click', handleInternalLink, true);
      window.clearInterval(driftTimer);
      clearFinishTimer();
      clearMaximumTimer();
      beginRef.current = null;
      finishRef.current = null;
      restoreScroll();
    };
  }, []);

  useEffect(() => {
    const route = `${location.pathname}${location.search}`;
    if (previousRouteRef.current === null) {
      previousRouteRef.current = route;
      return;
    }
    const previousRoute = previousRouteRef.current;
    if (previousRoute === route) return;
    previousRouteRef.current = route;

    if (isAuthViewTransition(previousRoute, route) || isReaderDestination(route)) {
      explicitLoadingRef.current = false;
      routeLoadingRef.current = false;
      return;
    }

    if (!routeLoadingRef.current) {
      explicitLoadingRef.current = false;
      beginRef.current?.(8, true);
    }

    let secondFrame: number | null = null;
    let finishTimer: number | null = null;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        finishTimer = window.setTimeout(() => {
          if (explicitLoadingRef.current) return;
          routeLoadingRef.current = false;
          finishRef.current?.();
        }, 520);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
      if (finishTimer !== null) window.clearTimeout(finishTimer);
    };
  }, [location.pathname, location.search]);

  return (
    <AnimatePresence onExitComplete={restoreScroll}>
      {show && (
        <motion.div
          key="global-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.42, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed inset-0 z-[999999] flex cursor-default select-none items-center justify-center overflow-hidden transition-colors duration-300 ${isLightMode ? 'bg-[#f6f7f9]' : 'bg-[#070709]'}`}
          role="status"
          aria-live="polite"
          aria-label={`Cargando MangaMukai, ${Math.round(progress)}%`}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-[min(76vw,320px)] flex-col items-center px-5 text-center"
            aria-hidden="true"
          >
            <motion.div
              initial={{ opacity: 0, letterSpacing: '-0.07em' }}
              animate={{ opacity: 1, letterSpacing: '-0.045em' }}
              transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex max-w-full items-center justify-center gap-[0.16em] whitespace-nowrap text-[clamp(2.5rem,10vw,4rem)] font-black italic leading-none"
            >
              <span className={isLightMode ? 'text-[#111216]' : 'text-white'}>MANGA</span>
              <span className="text-[#FF4D88]">MUKAI</span>
            </motion.div>

            <div className="mt-6 flex items-center justify-center">
              <MukaiLoaderWheel size={104} progress={progress} isLight={isLightMode} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
