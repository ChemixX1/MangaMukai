import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { MangaCapitulo } from '../../types/manga';

const cleanTitle = (value = '') => value
  .replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '')
  .trim();

const cleanDescription = (title: string, value = '') => {
  const trimmed = value.trim();
  if (trimmed.toLocaleLowerCase('es').startsWith(title.toLocaleLowerCase('es'))) {
    return trimmed.slice(title.length).trim();
  }
  return trimmed;
};

interface AdultHeroCoverflowProps {
  items: MangaCapitulo[];
  activeIndex: number;
  isLight: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}

export function AdultHeroCoverflow({
  items,
  activeIndex,
  isLight,
  onPrevious,
  onNext,
  onSelect,
}: AdultHeroCoverflowProps) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  const active = items[activeIndex];

  useEffect(() => {
    const compactMedia = window.matchMedia('(max-width: 639px)');
    const updateCompactMode = (event: MediaQueryListEvent | MediaQueryList) => setIsCompact(event.matches);
    updateCompactMode(compactMedia);
    compactMedia.addEventListener('change', updateCompactMode);
    return () => compactMedia.removeEventListener('change', updateCompactMode);
  }, []);

  if (!active) return null;

  const title = cleanTitle(active.titulo);
  const description = cleanDescription(title, active.descripcion)
    || 'Una historia intensa de romance, deseo y fantasía seleccionada para lectores adultos.';
  const tags = (active.genres?.length ? active.genres : [active.tipo || 'Manga']).slice(0, 4);

  return (
    <div className="desktop-content-shell relative z-10 mx-auto flex min-h-[960px] w-full max-w-[1500px] flex-col px-5 pb-14 pt-28 sm:px-8 lg:min-h-[850px] lg:px-16 lg:pb-10 lg:pt-24">
      <div className="relative h-[320px] shrink-0 sm:h-[455px]" style={{ perspective: '1450px' }}>
        {items.map((manga, index) => {
          let relative = index - activeIndex;
          if (relative > items.length / 2) relative -= items.length;
          if (relative < -items.length / 2) relative += items.length;
          const distance = Math.abs(relative);
          const isActive = relative === 0;

          return (
            <div
              key={manga.id}
              className="absolute left-1/2 top-1/2 h-[206px] w-[132px] -translate-x-1/2 -translate-y-1/2 sm:h-[360px] sm:w-[240px]"
              style={{ zIndex: isActive ? 70 : 40 - distance }}
            >
              <motion.button
                type="button"
                onClick={() => isActive ? navigate(`/manga/${manga.id}`) : onSelect(index)}
                drag={isActive && !reduceMotion ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.72}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -65 || info.velocity.x < -520) onNext();
                  if (info.offset.x > 65 || info.velocity.x > 520) onPrevious();
                }}
                animate={{
                  x: relative * (isCompact ? 76 : 160),
                  y: isActive ? -8 : 16 + Math.min(distance, 2) * 12,
                  scale: isActive ? 1.12 : distance === 1 ? 0.82 : 0.68,
                  rotateY: relative * -13,
                  opacity: distance <= 2 ? (isActive ? 1 : 0.74) : 0,
                  zIndex: isActive ? 70 : 40 - distance,
                }}
                transition={{ type: 'spring', stiffness: 195, damping: 25, mass: 0.9 }}
                style={{ pointerEvents: distance <= 2 ? 'auto' : 'none' }}
                className={`group relative h-full w-full overflow-hidden rounded-[24px] border text-left ${isActive ? 'cursor-grab shadow-[0_28px_85px_rgba(255,77,136,0.3)] active:cursor-grabbing' : 'cursor-pointer'} ${isLight ? 'border-black/12 bg-white' : 'border-white/15 bg-[#13060c]'}`}
                aria-label={isActive ? `Leer ${cleanTitle(manga.titulo)}` : `Mostrar ${cleanTitle(manga.titulo)}`}
              >
                <img src={manga.portada} alt={cleanTitle(manga.titulo)} draggable={false} className="h-full w-full select-none object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
              </motion.button>
            </div>
          );
        })}

        <button type="button" onClick={onPrevious} aria-label="Manga +19 anterior" className={`absolute left-0 top-1/2 z-50 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border backdrop-blur-md transition hover:border-[#FF4D88] hover:text-[#FF4D88] sm:left-5 sm:h-12 sm:w-12 lg:left-[8%] ${isLight ? 'border-black/15 bg-white/80 text-black' : 'border-white/15 bg-black/60 text-white'}`}><ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" /></button>
        <button type="button" onClick={onNext} aria-label="Manga +19 siguiente" className={`absolute right-0 top-1/2 z-50 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border backdrop-blur-md transition hover:border-[#FF4D88] hover:text-[#FF4D88] sm:right-5 sm:h-12 sm:w-12 lg:right-[8%] ${isLight ? 'border-black/15 bg-white/80 text-black' : 'border-white/15 bg-black/60 text-white'}`}><ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" /></button>

        <div className="absolute inset-x-0 bottom-1 z-50 flex justify-center gap-2">
          {items.map((manga, index) => <button key={`adult-hero-dot-${manga.id}`} type="button" onClick={() => onSelect(index)} aria-label={`Ir a ${cleanTitle(manga.titulo)}`} className={`h-1.5 -skew-x-12 transition-all ${index === activeIndex ? 'w-10 bg-[#FF4D88]' : isLight ? 'w-3 bg-black/20' : 'w-3 bg-white/20'}`} />)}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className={`mx-auto mt-4 grid w-full max-w-[1160px] gap-6 rounded-[24px] border p-6 backdrop-blur-xl lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-9 ${isLight ? 'border-black/10 bg-white/65' : 'border-white/10 bg-black/45'}`}
        >
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="bg-[#FF4D88] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">Mangas para hombres +19</span>
            </div>
            <h1 className="line-clamp-3 text-[clamp(1.3rem,2.2vw,2.25rem)] font-black uppercase italic leading-[0.98] tracking-[-0.04em]">{title}</h1>
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => <span key={tag} className={`border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] ${isLight ? 'border-black/15 bg-white/45 text-black/70' : 'border-white/15 bg-white/[0.05] text-white/70'}`}>{tag}</span>)}
            </div>
          </div>

          <div className="relative flex min-w-0 flex-col pl-5 lg:pl-7">
            <span className={`absolute bottom-3 left-0 top-0 w-[3px] ${isLight ? 'bg-black' : 'bg-white'}`} aria-hidden="true" />
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="h-[1.15em] w-1 shrink-0 rounded-full bg-[#FF4D88]" aria-hidden="true" />
              <h2 className={`text-[12px] font-black uppercase tracking-[0.18em] ${isLight ? 'text-black' : 'text-white'}`}>Sinopsis</h2>
            </div>
            <p className={`line-clamp-4 text-justify text-[14px] font-medium leading-7 sm:text-[15px] ${isLight ? 'text-black/70' : 'text-white/75'}`}>{description}</p>
            <div className="mt-auto flex flex-wrap justify-start gap-3 pt-6">
              <button type="button" onClick={() => navigate(`/manga/${active.id}`)} className="flex h-12 items-center gap-2 rounded-[7px] bg-[#FF4D88] px-6 text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-black"><Play size={15} fill="currentColor" /> Leer ahora</button>
              <button type="button" onClick={() => setIsBookmarked((current) => !current)} className={`flex h-12 items-center gap-2 rounded-[7px] border px-6 text-[11px] font-black uppercase tracking-[0.14em] transition ${isBookmarked ? 'border-[#FF4D88] bg-[#FF4D88]/15 text-[#FF4D88]' : isLight ? 'border-black/20 bg-white/50 text-black hover:border-[#FF4D88]' : 'border-white/20 bg-black/25 text-white hover:border-[#FF4D88]'}`}><Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} /> {isBookmarked ? 'Guardado' : 'Guardar'}</button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
