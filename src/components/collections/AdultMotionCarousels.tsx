import { HERO_TRANSITION_SECONDS, HERO_COVER_EASE } from '../home/heroMotion';
import { HERO_TAG_CLASS, HERO_TAG_ROW, HERO_TITLE_CLASS } from '../home/heroTagStyles';
import { toTitleCase } from '../../utils/titleCase';
import { CollectionHeroActions } from './CollectionHeroActions';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSavedMangas } from '../../hooks/useSavedMangas';
import type { MangaCapitulo } from '../../types/manga';
import { allMangaTags } from '../../utils/collectionTags';

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

  const { isSaved, toggle: toggleSaved } = useSavedMangas();
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

  const title = toTitleCase(cleanTitle(active.titulo));
  const description = cleanDescription(title, active.descripcion)
    || 'Una historia intensa de romance, deseo y fantasía seleccionada para lectores adultos.';
  const tags = allMangaTags(active, 'adult');
  const isBookmarked = isSaved(active.id);

  return (
    <div className="lg:!max-w-[1366px] relative z-10 mx-auto flex min-h-[960px] w-full max-w-[1500px] flex-col px-5 pb-14 pt-28 sm:px-8 lg:min-h-[850px] lg:px-16 lg:pb-10 lg:pt-24">
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
                initial={false}
                tabIndex={distance <= 2 ? 0 : -1}
                aria-hidden={distance > 2}
                animate={{
                  x: relative * (isCompact ? 76 : 160),
                  y: isActive ? -8 : 16 + Math.min(distance, 2) * 12,
                  scale: isActive ? 1.12 : distance === 1 ? 0.82 : 0.68,
                  z: reduceMotion || isActive || distance <= 2 ? 0 : -260,
                  rotateY: reduceMotion || isActive ? 0 : (relative < 0 ? 1 : -1) * (distance <= 2 ? 12 : 62),
                  opacity: distance <= 2 ? (isActive ? 1 : 0.74) : 0,
                  zIndex: isActive ? 70 : 40 - distance,
                }}
                transition={reduceMotion ? { duration: 0 } : {
                  duration: HERO_TRANSITION_SECONDS,
                  ease: HERO_COVER_EASE,
                  z: { duration: HERO_TRANSITION_SECONDS * 0.7, ease: HERO_COVER_EASE },
                  rotateY: { duration: HERO_TRANSITION_SECONDS * 0.75, ease: HERO_COVER_EASE },
                  opacity: { duration: HERO_TRANSITION_SECONDS * 0.55, ease: 'easeOut' },
                }}
                style={{ pointerEvents: distance <= 2 ? 'auto' : 'none' }}
                className={`group relative h-full w-full overflow-hidden rounded-[24px] border text-left ${isActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isLight ? 'border-black/12 bg-white' : 'border-white/15 bg-[#13060c]'}`}
                aria-label={isActive ? `Leer ${cleanTitle(manga.titulo)}` : `Mostrar ${cleanTitle(manga.titulo)}`}
              >
                <img src={manga.portada} alt={`Portada del manga ${cleanTitle(manga.titulo)}`} draggable={false} className="h-full w-full select-none object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
              </motion.button>
            </div>
          );
        })}

        <button type="button" onClick={onPrevious} aria-label="Manga +19 anterior" className={`absolute left-0 top-1/2 z-50 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border backdrop-blur-md transition hover:border-[#FF6B00] hover:text-[#FF6B00] sm:left-5 sm:h-12 sm:w-12 lg:left-[8%] ${isLight ? 'border-black/15 bg-white/80 text-black' : 'border-white/15 bg-black/60 text-white'}`}><ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" /></button>
        <button type="button" onClick={onNext} aria-label="Manga +19 siguiente" className={`absolute right-0 top-1/2 z-50 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border backdrop-blur-md transition hover:border-[#FF6B00] hover:text-[#FF6B00] sm:right-5 sm:h-12 sm:w-12 lg:right-[8%] ${isLight ? 'border-black/15 bg-white/80 text-black' : 'border-white/15 bg-black/60 text-white'}`}><ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" /></button>

        <div className="absolute inset-x-0 bottom-1 z-50 flex justify-center gap-2">
          {items.map((manga, index) => <button key={`adult-hero-dot-${manga.id}`} type="button" onClick={() => onSelect(index)} aria-label={`Ir a ${cleanTitle(manga.titulo)}`} className={`h-1.5 -skew-x-12 transition-all ${index === activeIndex ? 'w-10 bg-[#FF6B00]' : isLight ? 'w-3 bg-black/20' : 'w-3 bg-white/20'}`} />)}
        </div>
      </div>


        <div
          className={`mx-auto mt-4 grid w-full max-w-[1160px] gap-6 rounded-[24px] border p-6 backdrop-blur-xl lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-9 ${isLight ? 'border-black/10 bg-white/65' : 'border-white/10 bg-black/45'}`}
        >
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="bg-[#FF6B00] px-3 py-1.5 font-montserrat text-[10px] font-semibold uppercase tracking-normal text-white">Mangas para mujeres +19</span>
            </div>
            <h2 className={HERO_TITLE_CLASS}>{title}</h2>

            <div className={`manga-tag-row mt-5 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${HERO_TAG_ROW}`}>
              {tags.map((tag) => <span key={tag} className={HERO_TAG_CLASS} style={{ backgroundColor: '#ff6b00', borderColor: '#ff6b00' }}>{tag}</span>)}
            </div>
          </div>

          <div className="relative flex min-w-0 flex-col pl-5 lg:pl-7">
            <span className={`absolute bottom-3 left-0 top-0 w-[3px] ${isLight ? 'bg-black' : 'bg-white'}`} aria-hidden="true" />
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="h-[1.15em] w-1 shrink-0 rounded-full bg-[#FF6B00]" aria-hidden="true" />
              <h3 className={`text-[12px] font-black uppercase tracking-[0.18em] ${isLight ? 'text-black' : 'text-white'}`}>Sinopsis</h3>
            </div>
            <p className={`line-clamp-4 text-justify text-[14px] font-medium leading-7 sm:text-[15px] ${isLight ? 'text-black/70' : 'text-white/75'}`}>{description}</p>

            <div className="mt-auto pt-6">
              <CollectionHeroActions saved={isBookmarked} onRead={() => navigate(`/manga/${active.id}`)} onSave={() => { void toggleSaved(active.id); }} />
            </div>
          </div>
        </div>
    </div>
  );
}
