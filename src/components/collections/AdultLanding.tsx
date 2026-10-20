import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HERO_AUTOPLAY_MS, HERO_TRANSITION_SECONDS } from '../home/heroMotion';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useHomeData } from '../../context/HomeDataContext';
import { useTheme } from '../../hooks/useTheme';
import { getPopularMenByViews, getPopularWomenByViews, getUltimosCapitulos } from '../../services/mangaService';
import type { MangaCapitulo } from '../../types/manga';
import { preloadImages } from '../../utils/preloadImages';
import { buildViewsIndex, withKnownViews } from '../../utils/seriesViews';
import { whenIdle } from '../../utils/whenIdle';
import { byTotalViews, filterMenHot, filterWomenHot } from '../../utils/womenBlackWhite';
import { HomeAnnouncements } from '../home/HomeAnnouncements';
import { Footer } from '../layout/Footer';
import { TrendingCarousel } from './TrendingCarousel';
import { AdultLatestUpdates } from './AdultLatestUpdates';
import { AdultHeroCoverflow } from './AdultMotionCarousels';
import { HeroCarousel } from '../home/HomeHero';
import { toHeroItems } from '../home/homeModels';

const ADULT_PATTERN = /\+19|adult|ecchi|hentai|hot|er[oó]tico|maduro|harem|yuri/i;

const belongsToCollection = (manga: MangaCapitulo) =>
  ADULT_PATTERN.test([manga.tipo, manga.genero, ...(manga.genres || [])].filter(Boolean).join(' '));

const uniqueMangas = (items: MangaCapitulo[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.eroSeri || item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function AdultLanding() {
  const { theme: colorMode } = useTheme();
  const {
    latestWomen,
    latestMen,
    popularHistorical,
    popularWeekly,
    popularMenWeekly,
    popularMenHistorical,
    newReleases,
    isReady: homeReady,
  } = useHomeData();
  const isLightMode = colorMode === 'light';
  const [mangas, setMangas] = useState<MangaCapitulo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [backdropSrc, setBackdropSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [popularMenMonthly, setPopularMenMonthly] = useState<MangaCapitulo[]>([]);

  useEffect(() => {
    let mounted = true;
    const cancelIdle = whenIdle(() => {
      getPopularMenByViews('monthly', false)
        .then((list) => { if (mounted) setPopularMenMonthly(list); })
        .catch(() => undefined);
    });
    return () => {
      mounted = false;
      cancelIdle();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([getUltimosCapitulos(), getPopularWomenByViews('historical', false)])
      .then(([library, popular]) => {
        if (!mounted) return;
        const all = uniqueMangas([...library, ...popular]);
        const matching = all.filter(belongsToCollection);
        setMangas(matching.length >= 6 ? matching : all);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const latestWomenWithChapters = useMemo(
    () => filterWomenHot(uniqueMangas([...latestWomen, ...popularWeekly, ...popularHistorical, ...newReleases, ...mangas])),
    [latestWomen, popularWeekly, popularHistorical, newReleases, mangas],
  );
  const latestMenWithChapters = useMemo(
    () => filterMenHot(uniqueMangas([...latestMen, ...popularMenWeekly, ...popularMenHistorical, ...newReleases, ...mangas])),
    [latestMen, popularMenWeekly, popularMenHistorical, newReleases, mangas],
  );

  const viewsIndex = useMemo(
    () => buildViewsIndex(popularMenWeekly, popularMenMonthly, popularMenHistorical, popularWeekly, popularHistorical, newReleases, latestMen, latestWomen, mangas),
    [popularMenWeekly, popularMenMonthly, popularMenHistorical, popularWeekly, popularHistorical, newReleases, latestMen, latestWomen, mangas],
  );
  const youthHotMen = useMemo(
    () => withKnownViews(filterMenHot(uniqueMangas([...latestMen, ...popularMenWeekly, ...popularMenHistorical, ...mangas])), viewsIndex),
    [latestMen, popularMenWeekly, popularMenHistorical, mangas, viewsIndex],
  );

  const heroItems = useMemo(() => {
    const pool = uniqueMangas([...popularHistorical, ...popularWeekly, ...latestWomen, ...newReleases, ...mangas]);
    return filterWomenHot(pool).sort(byTotalViews).slice(0, 8);
  }, [mangas, popularHistorical, popularWeekly, latestWomen, newReleases]);
  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, heroItems.length - 1)));
  }, [heroItems.length]);

  useEffect(() => {
    const onVisibility = () => setIsPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting));
    if (heroRef.current) observer.observe(heroRef.current);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (heroItems.length < 2 || isPaused || !isInView || !isPageVisible || reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroItems.length);
    }, HERO_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [heroItems.length, activeIndex, isPaused, isInView, isPageVisible, reduceMotion]);

  const active = heroItems[activeIndex % Math.max(heroItems.length, 1)];
  const activeCover = active?.portada ?? '';
  useEffect(() => {
    let cancelled = false;
    if (activeCover) void preloadImages([activeCover]).then(() => {
      if (!cancelled) setBackdropSrc(activeCover);
    });
    return () => { cancelled = true; };
  }, [activeCover]);
  const heroCoverKey = heroItems.map((manga) => manga.portada).filter(Boolean).join('|');

  useEffect(() => {
    if (loading || !homeReady) return;
    void preloadImages(heroCoverKey.split('|').slice(0, 3));
  }, [loading, homeReady, heroCoverKey]);

  const showPreviousHero = () => {
    if (heroItems.length < 2) return;
    setActiveIndex((current) => (current - 1 + heroItems.length) % heroItems.length);
  };

  const showNextHero = () => {
    if (heroItems.length < 2) return;
    setActiveIndex((current) => (current + 1) % heroItems.length);
  };

  const sectionBackground = 'bg-surface';
  const isDataReady = !loading || homeReady;

  return (
    <main className={`collection-landing min-h-screen overflow-hidden transition-colors duration-700 ${isDataReady ? 'home-data-ready' : 'home-data-pending'} ${isLightMode ? 'home-theme-light bg-surface text-slate-950' : 'home-theme-dark bg-surface text-white'}`}>

      <h1 className="sr-only">Mangas para adultos</h1>
      <section ref={heroRef} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} onTouchCancel={() => setIsPaused(false)} className="home-block home-block-hero relative min-h-[960px] overflow-hidden lg:min-h-[850px]">
        <div className={`absolute inset-0 bg-surface`} aria-hidden="true">
          <AnimatePresence initial={false}>
          {backdropSrc && <motion.img key={backdropSrc} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0, delay: reduceMotion ? 0 : HERO_TRANSITION_SECONDS } }} transition={{ duration: reduceMotion ? 0 : HERO_TRANSITION_SECONDS, ease: 'easeOut' }} src={backdropSrc} alt="" className={`absolute inset-0 h-full w-full scale-105 object-cover grayscale blur-[2px] transition-[filter] duration-700 ${isLightMode ? 'brightness-[0.82] contrast-[1.03]' : 'brightness-[0.36] contrast-[1.08]'}`} />}
          </AnimatePresence>
          <div className="home-hero-theme-scrim absolute inset-0" />
          <div className={`absolute inset-0 bg-gradient-to-r transition-colors duration-700 ${isLightMode ? 'from-white/90 via-white/55 to-white/5' : 'from-black/90 via-black/65 to-black/10'}`} />
        </div>
        <AdultHeroCoverflow
          items={heroItems}
          activeIndex={activeIndex % Math.max(heroItems.length, 1)}
          isLight={isLightMode}
          onPrevious={showPreviousHero}
          onNext={showNextHero}
          onSelect={setActiveIndex}
        />
      </section>
      <section className={`home-block home-block-popular relative -mt-3 pb-10 pt-8 sm:-mt-4 sm:pb-12 sm:pt-8 ${sectionBackground}`}>
        <TrendingCarousel selectorColor="#ff6b00" audience="women" filterMangas={filterWomenHot} />
      </section>
      <div className="home-block home-block-latest">
        <AdultLatestUpdates
          items={latestWomenWithChapters}
          isLight={isLightMode}
          sectionId="adult-latest-women"
          rowTone="neutral"
          includeUpcoming
          loading={loading && !homeReady}
        />
      </div>
      <div className={`pb-8 pt-2 ${sectionBackground}`}>
        <HomeAnnouncements />
      </div>
      <div className="home-block home-block-men">
        <HeroCarousel items={toHeroItems(youthHotMen)} loading={loading && !homeReady} accent="cyan" label="Mangas juveniles destacados" coverLayout="row" />
      </div>
      <section className={`home-block home-block-youth relative py-14 sm:py-16 ${sectionBackground}`}>
        <TrendingCarousel selectorColor="#ff6b00" audience="men" filterMangas={filterMenHot} minItemsForMotion={7} />
      </section>
      <div className="home-block home-block-youth-latest">
        <AdultLatestUpdates
          items={latestMenWithChapters}
          isLight={isLightMode}
          sectionId="adult-latest-youth"
          accent="blue"
          rowTone="neutral"
          includeUpcoming
          loading={loading && !homeReady}
        />
      </div>
      <Footer homeDesign className="mt-[94px] lg:mt-[125px]" />
    </main>
  );
}
