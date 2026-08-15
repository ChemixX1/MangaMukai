import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

const HOME_LOADING_EVENT = 'mangamukai:home-loading';
const MINIMUM_VISIBLE_TIME = 720;
const MAXIMUM_VISIBLE_TIME = 7000;

export const GlobalLoader = () => {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(6);
  const previousOverflowRef = useRef('');
  const previousHtmlOverflowRef = useRef('');
  const startedAtRef = useRef(0);
  const finishingRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const isLightMode = theme === 'light';

  const restoreScroll = () => {
    document.body.style.overflow = previousOverflowRef.current;
    document.documentElement.style.overflow = previousHtmlOverflowRef.current;
  };

  useEffect(() => {
    startedAtRef.current = performance.now();
    finishingRef.current = false;
    finishTimerRef.current = null;
    previousOverflowRef.current = document.body.style.overflow;
    previousHtmlOverflowRef.current = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    const finish = () => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setProgress(100);
      const elapsed = performance.now() - startedAtRef.current;
      const remaining = Math.max(220, MINIMUM_VISIBLE_TIME - elapsed);
      finishTimerRef.current = window.setTimeout(() => setShow(false), remaining);
    };

    const handleHomeProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ progress?: number; complete?: boolean }>).detail;
      if (typeof detail?.progress === 'number') {
        setProgress(previous => Math.max(previous, Math.min(100, detail.progress!)));
      }
      if (detail?.complete) finish();
    };

    window.addEventListener(HOME_LOADING_EVENT, handleHomeProgress);

    const driftTimer = window.setInterval(() => {
      setProgress(previous => previous >= 90 ? previous : Math.min(90, previous + (previous < 35 ? 4 : 1)));
    }, 180);

    const maximumTimer = window.setTimeout(finish, MAXIMUM_VISIBLE_TIME);

    if (window.location.pathname !== '/') {
      if (document.readyState === 'complete') {
        finish();
      } else {
        window.addEventListener('load', finish, { once: true });
      }
    }

    return () => {
      window.removeEventListener(HOME_LOADING_EVENT, handleHomeProgress);
      window.removeEventListener('load', finish);
      window.clearInterval(driftTimer);
      window.clearTimeout(maximumTimer);
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
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

            <div className="mt-8 flex items-center justify-center">
              <div className={`relative h-12 w-12 rounded-full border-2 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                <motion.div
                  className={`absolute -inset-[2px] rounded-full border-2 border-transparent ${isLightMode ? 'border-r-[#FF4D88] border-t-[#24262b]' : 'border-r-[#FF4D88] border-t-white'}`}
                  animate={reduceMotion ? undefined : { rotate: 360 }}
                  transition={reduceMotion ? undefined : { duration: 0.85, ease: 'linear', repeat: Infinity }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
