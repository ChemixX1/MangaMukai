import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { GLOBAL_LOADING_EVENT, type GlobalLoadingDetail } from '../../utils/globalLoading';
import { lockPageScroll } from '../../utils/scrollLock';

const HOME_LOADING_EVENT = 'mangamukai:home-loading';
const MINIMUM_VISIBLE_TIME = 720;
const MAXIMUM_VISIBLE_TIME = 10000;

export const GlobalLoader = () => {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(6);
  const releaseScrollRef = useRef<(() => void) | null>(null);
  const startedAtRef = useRef(0);
  const finishingRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const maximumTimerRef = useRef<number | null>(null);
  const routeLoadingRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const { theme } = useTheme();
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
        routeLoadingRef.current = false;
        finish(true);
      }, MAXIMUM_VISIBLE_TIME);
    };

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
        begin(detail.progress ?? 8, true);
        return;
      }

      if (typeof detail.progress === 'number') {
        setProgress(previous => Math.max(previous, Math.min(100, detail.progress!)));
      }

      if (detail.status === 'complete') {
        routeLoadingRef.current = false;
        finish();
      }
    };

    const handleLibraryLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!target || target.target === '_blank' || target.hasAttribute('download')) return;

      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname !== '/biblioteca') return;
      if (window.location.pathname === '/biblioteca') return;
      begin(8, true);
    };

    const handleWindowLoad = () => finish();

    window.addEventListener(HOME_LOADING_EVENT, handleHomeProgress);
    window.addEventListener(GLOBAL_LOADING_EVENT, handleGlobalLoading);
    document.addEventListener('click', handleLibraryLink, true);

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
      document.removeEventListener('click', handleLibraryLink, true);
      window.clearInterval(driftTimer);
      clearFinishTimer();
      clearMaximumTimer();
      restoreScroll();
    };
  }, []);

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
              className="inline-flex max-w-full items-center justify-center gap-[0.16em] whitespace-nowrap text-[clamp(2rem,8vw,4rem)] font-black italic leading-none"
            >
              <span className={isLightMode ? 'text-[#111216]' : 'text-white'}>MANGA</span>
              <span className="text-[#FF4D88]">MUKAI</span>
            </motion.div>

            <div className="mt-6 flex items-center justify-center">
              <motion.svg
                viewBox="0 0 64 64"
                className={`h-12 w-12 ${isLightMode ? 'text-[#15161a]' : 'text-white'}`}
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={reduceMotion ? undefined : { duration: 1.05, ease: 'linear', repeat: Infinity }}
                aria-hidden="true"
              >
                <defs>
                  <path
                    id="loader-blade"
                    d="M31.5 4.5c6.2-.1 12.2 1.8 17.1 5.4l-7.3 1.2 3.2 6.7c-3.9-3.5-8.3-5.3-13-5.4V4.5Z"
                  />
                </defs>
                {Array.from({ length: 8 }, (_, index) => (
                  <use
                    key={index}
                    href="#loader-blade"
                    fill="currentColor"
                    transform={`rotate(${index * 45} 32 32)`}
                  />
                ))}
              </motion.svg>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
