import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, Mars, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useHomeData } from '../../context/HomeDataContext';
import { useSavedMangas } from '../../hooks/useSavedMangas';
import { useTheme } from '../../hooks/useTheme';
import type { MangaCapitulo } from '../../types/manga';
import { collectionTags } from '../../utils/collectionTags';
import { filterMenBlackWhite } from '../../utils/womenBlackWhite';

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
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { popularMenWeekly, popularMenHistorical, latestMen, isReady } = useHomeData();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isLightMode = theme === 'light';
  // Guardado real: mismo estado que la ficha y la página de guardados.
  const { isSaved, toggle: toggleSaved } = useSavedMangas();

  const items = useMemo(() => {
    // Solo mangas con público Hombre dentro de la colección B&N.
    const pool = uniqueBySeries([...latestMen, ...popularMenWeekly, ...popularMenHistorical]);
    return filterMenBlackWhite(pool).slice(0, 7);
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
      <div className="relative z-20 h-[80px] w-full md:h-24">
        <div aria-hidden="true" className="home-men-ramp pointer-events-none absolute bottom-[-8px] left-0 h-10 w-full bg-gradient-to-r from-[#67E8F9] via-[#38BDF8] to-[#3B82F6]" />
        {/* En móvil el título va más a la izquierda y algo más pequeño para no pisar el escalón de la rampa (72 %). */}
        <div className="desktop-content-shell relative z-10 mx-auto flex h-full w-full max-w-[1500px] items-end px-3 pb-1 sm:px-5 md:items-center md:pb-0 lg:px-16">
          <h2 id="bn-youth-title" className="flex -translate-y-1 items-center gap-2 text-[20px] font-black uppercase italic tracking-[-0.035em] sm:gap-3 sm:text-[23px] md:text-4xl">
            <Mars className="h-6 w-6 shrink-0 text-[#00C2FF] sm:h-8 sm:w-8" strokeWidth={3} />
            Mangas <span className="text-[#00C2FF]">juveniles</span>
          </h2>
        </div>
      </div>

      <div className="desktop-content-shell relative z-10 mx-auto max-w-[1500px] px-5 pb-14 pt-12 lg:px-16 lg:pt-14">

        {!isReady || items.length === 0 ? (
          <div className="flex h-[640px] gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className={`h-full flex-1 animate-pulse rounded-[18px] ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />)}
          </div>
        ) : (
          <div
            className="flex h-[760px] flex-col gap-2 sm:h-[640px] sm:flex-row"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {items.map((manga, index) => {
              const isActive = index === activeIndex;
              const title = cleanTitle(manga.titulo);
              const description = manga.descripcion?.trim() || 'Una nueva historia juvenil en blanco y negro lista para descubrir.';
              const tags = collectionTags(manga, 'bn');

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
                  <img src={manga.portada} alt={`Portada del manga ${title}`} className="manga-bn-interactive-cover absolute inset-0 h-full w-full object-cover object-center sm:object-top" />
                  <span className={`absolute inset-0 transition-colors duration-500 ${isActive ? 'bg-gradient-to-t from-black via-black/20 to-transparent' : 'bg-black/35 group-hover:bg-black/20'}`} />
                  <button type="button" onClick={() => (isActive ? navigate(`/manga/${manga.id}`) : setActiveIndex(index))} aria-expanded={isActive} aria-label={isActive ? `Ver ${title}` : `Mostrar ${title}`} className="absolute inset-0 z-10 cursor-pointer" />

                  <AnimatePresence initial={false} mode="wait">
                    {isActive ? (
                      <motion.div key={`open-${manga.id}`} className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-7" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }} transition={{ duration: 0.32 }}>
                        <div className="mb-3 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${isLightMode ? 'bg-black text-white' : 'bg-white text-black'}`}>{tag}</span>)}</div>
                        <h3 className="line-clamp-2 max-w-2xl text-2xl font-black uppercase italic leading-[1.02] tracking-[-0.035em] text-white sm:text-3xl">{title}</h3>
                        <p className="mt-3 line-clamp-3 max-w-2xl text-[13px] font-medium leading-6 text-white/75 sm:text-sm">{description}</p>
                        <div className="relative z-30 mt-5 flex flex-wrap items-center gap-3">
                          <Link to={`/manga/${manga.id}`} className="inline-flex h-11 items-center gap-2 bg-white px-5 text-[10px] font-black uppercase tracking-[0.15em] text-black transition hover:bg-[#00C2FF]"><Play size={13} fill="currentColor" /> Leer ahora</Link>
                          <button
                            type="button"
                            onClick={() => void toggleSaved(manga.id)}
                            className={`inline-flex h-11 items-center gap-2 border bg-transparent px-5 text-[10px] font-black uppercase tracking-[0.15em] transition ${isSaved(manga.id) ? 'border-[#00C2FF] text-[#00C2FF]' : 'border-white/60 text-white hover:border-[#00C2FF] hover:text-[#00C2FF]'}`}
                          >
                            <Bookmark size={13} fill={isSaved(manga.id) ? 'currentColor' : 'none'} />
                            {isSaved(manga.id) ? 'Guardado' : 'Guardar'}
                          </button>
                        </div>
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
      </div>
    </section>
  );
}
