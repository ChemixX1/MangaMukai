import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, BookOpen, Mars } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useHomeData } from '../../context/HomeDataContext';
import { useTheme } from '../../hooks/useTheme';
import type { MangaCapitulo } from '../../types/manga';
import FilterStripTactical from '../home/FilterStripTactical';

const youthPattern = /hombre|juvenil|shounen|seinen|acci[oó]n|comedia|escolar|aventura/i;

const cleanTitle = (value = '') => value
  .replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '')
  .trim();

const uniqueBySeries = (items: MangaCapitulo[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.eroSeri || item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function BlackWhiteYouthAccordion() {
  const { theme } = useTheme();
  const { popularMenWeekly, popularMenHistorical, latestMen, isReady } = useHomeData();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isLightMode = theme === 'light';

  const items = useMemo(() => {
    const pool = uniqueBySeries([...latestMen, ...popularMenWeekly, ...popularMenHistorical]);
    const juvenile = pool.filter((manga) => youthPattern.test([
      manga.tipo,
      manga.genero,
      ...(manga.genres || []),
    ].filter(Boolean).join(' ')));
    return uniqueBySeries([...juvenile, ...pool]).slice(0, 7);
  }, [latestMen, popularMenHistorical, popularMenWeekly]);

  useEffect(() => {
    if (isPaused || items.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [isPaused, items.length]);

  return (
    <section className={`relative overflow-hidden pb-0 transition-colors duration-500 ${isLightMode ? 'bg-[#eef1f4] text-black' : 'bg-[#08090b] text-white'}`} aria-labelledby="bn-youth-title">
      <div className="relative z-20 h-[82px] w-full md:h-[88px]">
        <div aria-hidden="true" className="home-men-ramp pointer-events-none absolute bottom-[-8px] left-0 h-10 w-full bg-gradient-to-r from-[#67E8F9] via-[#38BDF8] to-[#3B82F6]" />
        <div className="desktop-content-shell relative z-10 mx-auto flex h-full w-full max-w-[1500px] items-center px-5 lg:px-16">
          <h2 id="bn-youth-title" className="flex -translate-y-1.5 items-center gap-3 text-3xl font-black uppercase italic tracking-[-0.035em] sm:text-4xl">
            <span aria-hidden="true" className="h-7 w-[3px] shrink-0 bg-[#00C2FF] sm:h-8" />
            <Mars className="h-7 w-7 shrink-0 text-[#00C2FF] sm:h-8 sm:w-8" strokeWidth={3} />
            Mangas <span className="text-[#00C2FF]">juveniles</span>
          </h2>
        </div>
      </div>

      <div className="desktop-content-shell relative z-10 mx-auto max-w-[1500px] px-5 pb-14 pt-12 lg:px-16 lg:pt-14">

        {!isReady || items.length === 0 ? (
          <div className="flex h-[560px] gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className={`h-full flex-1 animate-pulse rounded-[18px] ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />)}
          </div>
        ) : (
          <div
            className="flex h-[650px] flex-col gap-2 sm:h-[530px] sm:flex-row"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {items.map((manga, index) => {
              const isActive = index === activeIndex;
              const title = cleanTitle(manga.titulo);
              const description = manga.descripcion?.trim() || 'Una nueva historia juvenil en blanco y negro lista para descubrir.';
              const tags = (manga.genres?.length ? manga.genres : [manga.tipo || 'Manga']).slice(0, 3);

              return (
                <motion.article
                  key={manga.id}
                  layout={!reduceMotion}
                  animate={{ flexGrow: isActive ? 5.2 : 1 }}
                  transition={{ type: 'spring', stiffness: 190, damping: 25, mass: 0.85 }}
                  style={{ flexBasis: 0 }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`manga-bn-accordion-panel group relative min-h-0 min-w-0 overflow-hidden rounded-[18px] border ${isLightMode ? 'border-black/10 bg-white' : 'border-white/10 bg-[#101216]'}`}
                >
                  <img src={manga.portada} alt={title} className="manga-bn-interactive-cover absolute inset-0 h-full w-full object-cover object-center sm:object-top" />
                  <span className={`absolute inset-0 transition-colors duration-500 ${isActive ? 'bg-gradient-to-t from-black via-black/20 to-transparent' : 'bg-black/35 group-hover:bg-black/20'}`} />
                  <button type="button" onClick={() => setActiveIndex(index)} aria-expanded={isActive} aria-label={`Mostrar ${title}`} className="absolute inset-0 z-10 cursor-pointer" />

                  <AnimatePresence initial={false} mode="wait">
                    {isActive ? (
                      <motion.div key={`open-${manga.id}`} className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-7" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }} transition={{ duration: 0.32 }}>
                        <div className="mb-3 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="bg-[#00C2FF] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-black">{tag}</span>)}</div>
                        <h3 className="line-clamp-2 max-w-2xl text-2xl font-black uppercase italic leading-[1.02] tracking-[-0.035em] text-white sm:text-3xl">{title}</h3>
                        <p className="mt-3 line-clamp-3 max-w-2xl text-[13px] font-medium leading-6 text-white/75 sm:text-sm">{description}</p>
                        <Link to={`/manga/${manga.id}`} className="relative z-30 mt-5 inline-flex h-11 items-center gap-2 bg-white px-5 text-[10px] font-black uppercase tracking-[0.15em] text-black transition hover:bg-[#00C2FF]"><BookOpen size={14} /> Ver manga <ArrowUpRight size={14} /></Link>
                      </motion.div>
                    ) : (
                      <motion.span key={`closed-${manga.id}`} className="absolute inset-0 z-20 hidden -rotate-90 items-center justify-center overflow-visible whitespace-nowrap text-[clamp(1rem,1.8vw,1.55rem)] font-black uppercase tracking-[0.12em] text-white sm:flex" initial={{ opacity: 0 }} animate={{ opacity: 0.26 }} exit={{ opacity: 0 }}>{manga.tipo || 'Manga'}</motion.span>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative z-30 mt-2 w-full">
        <FilterStripTactical />
      </div>
    </section>
  );
}
