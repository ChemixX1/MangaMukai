import { useEffect, useMemo, useState } from 'react';

import { useHomeData } from '../../context/HomeDataContext';
import { useTheme } from '../../hooks/useTheme';
import { getPopularMenByViews, getPopularWomenByViews, getUltimosCapitulos } from '../../services/mangaService';
import type { MangaCapitulo } from '../../types/manga';
import { preloadImages } from '../../utils/preloadImages';
import { buildViewsIndex, withKnownViews } from '../../utils/seriesViews';
import { whenIdle } from '../../utils/whenIdle';
import { byTotalViews, filterMenHot, filterWomenHot } from '../../utils/womenBlackWhite';
import { TrendingCarousel } from './TrendingCarousel';
import { AdultLatestUpdates } from './AdultLatestUpdates';
import { AdultHeroCoverflow } from './AdultMotionCarousels';
import { AdultYouthMotionCarousel } from './AdultYouthMotionCarousel';

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

/**
 * Colección +19 (/manga-19): hero en coverflow, tendencias, últimas
 * actualizaciones y los bloques juveniles, todo filtrado por la etiqueta HOT.
 */
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
  const [loading, setLoading] = useState(true);
  const [popularMenMonthly, setPopularMenMonthly] = useState<MangaCapitulo[]>([]);

  /* El ranking mensual no está en el contexto del home; se pide aquí (queda en
     caché y lo comparte el carrusel de tendencias) solo para sumar sus vistas.
     Como únicamente completa contadores, espera a que el navegador esté libre. */
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

  /* `false` es imprescindible: con el valor por defecto (`true`) esta llamada
     pedía `refresh=1` y obligaba al backend a recalcular el ranking histórico
     que el contexto del home ya estaba trayendo. Así comparte esa misma promesa. */
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

  useEffect(() => {
    if (mangas.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % Math.min(mangas.length, 8));
    }, 6000);
    return () => window.clearInterval(timer);
  }, [mangas.length]);

  /* Cada bloque exige la etiqueta HOT literal: Mujer arriba, Hombre en juveniles
     y abajo. Los rankings de vistas casi no traen mangas HOT, así que cada pool
     suma la biblioteca completa (`mangas`) y el filtro decide. */
  const latestWomenWithChapters = useMemo(
    () => filterWomenHot(uniqueMangas([...latestWomen, ...mangas])),
    [latestWomen, mangas],
  );
  const latestMenWithChapters = useMemo(
    () => filterMenHot(uniqueMangas([...latestMen, ...mangas])),
    [latestMen, mangas],
  );
  /* Vistas por serie: las últimas actualizaciones y el catálogo llegan sin
     `totalViews`, así que el contador de juveniles se completa con la cifra
     que traen los rankings para esa misma serie. */
  const viewsIndex = useMemo(
    () => buildViewsIndex(popularMenWeekly, popularMenMonthly, popularMenHistorical, popularWeekly, popularHistorical, newReleases, latestMen, latestWomen, mangas),
    [popularMenWeekly, popularMenMonthly, popularMenHistorical, popularWeekly, popularHistorical, newReleases, latestMen, latestWomen, mangas],
  );
  const youthHotMen = useMemo(
    () => withKnownViews(filterMenHot(uniqueMangas([...latestMen, ...popularMenWeekly, ...popularMenHistorical, ...mangas])), viewsIndex),
    [latestMen, popularMenWeekly, popularMenHistorical, mangas, viewsIndex],
  );

  /* Hero: solo los más vistos con público Mujer y etiqueta HOT. Sin HOT no entra. */
  const heroItems = useMemo(() => {
    const pool = uniqueMangas([...popularHistorical, ...popularWeekly, ...latestWomen, ...newReleases, ...mangas]);
    return filterWomenHot(pool).sort(byTotalViews).slice(0, 8);
  }, [mangas, popularHistorical, popularWeekly, latestWomen, newReleases]);
  const active = heroItems[activeIndex % Math.max(heroItems.length, 1)];
  const heroCoverKey = heroItems.map((manga) => manga.portada).filter(Boolean).join('|');

  // Se adelanta la descarga de las portadas del hero para que aparezcan ya
  // decodificadas cuando llegan los listados.
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

  const sectionBackground = isLightMode ? 'bg-[#f5f6f8]' : 'bg-black';

  return (
    <main className={`collection-landing min-h-screen overflow-hidden transition-colors duration-700 ${isLightMode ? 'home-theme-light bg-[#f5f6f8] text-slate-950' : 'home-theme-dark bg-[#0b0509] text-white'}`}>
      {/* El título grande del hero es el manga destacado y va rotando: el H1 real
          de la colección se declara aquí para buscadores y lectores de pantalla. */}
      <h1 className="sr-only">Mangas +19 en español para adultos</h1>
      <section className="relative min-h-[960px] overflow-hidden lg:min-h-[850px]">
        <div className={`absolute inset-0 ${isLightMode ? 'bg-[#f5f6f8]' : 'bg-[#121212]'}`} aria-hidden="true">
          {active?.portada && <img src={active.portada} alt="" className={`absolute inset-0 h-full w-full scale-105 object-cover grayscale blur-[2px] transition-[filter] duration-700 ${isLightMode ? 'brightness-[0.82] contrast-[1.03]' : 'brightness-[0.36] contrast-[1.08]'}`} />}
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
      <section className={`relative -mt-3 pb-10 pt-8 sm:-mt-4 sm:pb-12 sm:pt-8 ${sectionBackground}`}>
        <TrendingCarousel audience="women" filterMangas={filterWomenHot} />
      </section>
      <AdultLatestUpdates
        items={latestWomenWithChapters}
        isLight={isLightMode}
        sectionId="adult-latest-women"
        rowTone="neutral"
        includeUpcoming
      />
      <AdultYouthMotionCarousel items={youthHotMen} isLight={isLightMode} />
      <section className={`relative py-14 sm:py-16 ${sectionBackground}`}>
        <TrendingCarousel audience="men" filterMangas={filterMenHot} minItemsForMotion={7} />
      </section>
      <AdultLatestUpdates
        items={latestMenWithChapters}
        isLight={isLightMode}
        titleAccent="actualizaciones"
        sectionId="adult-latest-youth"
        accent="blue"
        rowTone="neutral"
        includeUpcoming
      />
    </main>
  );
}
