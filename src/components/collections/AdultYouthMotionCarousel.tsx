import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, ChevronLeft, ChevronRight, Eye, Mars, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { MangaCapitulo } from '../../types/manga';

interface AdultYouthMotionCarouselProps {
  items: MangaCapitulo[];
  isLight: boolean;
}

const cleanTitle = (value = '') => value
  .replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '')
  .trim();

const formatViews = (value = 0) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 90 : -90, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -90 : 90, scale: 0.985 }),
};

export function AdultYouthMotionCarousel({ items, isLight }: AdultYouthMotionCarouselProps) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const carouselItems = items.slice(0, 10);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const thumbnailRailRef = useRef<HTMLDivElement>(null);
  const active = carouselItems[activeIndex];

  const selectItem = (nextIndex: number, nextDirection?: number) => {
    if (carouselItems.length < 2 || nextIndex === activeIndex) return;
    const normalized = (nextIndex + carouselItems.length) % carouselItems.length;
    setDirection(nextDirection ?? (normalized > activeIndex ? 1 : -1));
    setActiveIndex(normalized);
  };

  const showPrevious = () => selectItem(activeIndex - 1, -1);
  const showNext = () => selectItem(activeIndex + 1, 1);

  useEffect(() => {
    if (isPaused || reduceMotion || carouselItems.length < 2) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((current) => (current + 1) % carouselItems.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [carouselItems.length, isPaused, reduceMotion]);

  useEffect(() => {
    if (activeIndex >= carouselItems.length) setActiveIndex(0);
  }, [activeIndex, carouselItems.length]);

  useEffect(() => {
    const rail = thumbnailRailRef.current;
    if (!rail || !window.matchMedia('(max-width: 639px)').matches) return;
    const selected = rail.querySelector<HTMLElement>(`[data-youth-thumbnail="${activeIndex}"]`);
    if (!selected) return;

    const centeredLeft = selected.offsetLeft - (rail.clientWidth - selected.clientWidth) / 2;
    rail.scrollTo({
      left: Math.max(0, centeredLeft),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeIndex, reduceMotion]);

  if (!active) return null;

  const activeKey = String(active.id);
  const isSaved = savedIds.has(activeKey);
  const tags = (active.genres?.length ? active.genres : [active.tipo || 'Manga']).slice(0, 4);
  const description = active.descripcion || 'Una selección juvenil con acción, aventura y personajes que desafían su propio destino.';

  const toggleSaved = () => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(activeKey)) next.delete(activeKey);
      else next.add(activeKey);
      return next;
    });
  };

  return (
    <section
      className={`relative overflow-hidden py-14 sm:py-20 ${isLight ? 'bg-[#eef9fc] text-slate-950' : 'bg-[#02080b] text-white'}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#00C2FF]/15 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#FF4D88]/10 blur-3xl" />
      </div>

      <div className="desktop-content-shell relative z-10 mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 border-l-4 border-[#00C2FF] pl-4">
            <Mars className="h-7 w-7 text-[#00C2FF] sm:h-8 sm:w-8" strokeWidth={3} />
            <h2 className="text-2xl font-black uppercase italic tracking-tighter sm:text-4xl">
              Mangas <span className="text-[#00C2FF]">juveniles</span>
            </h2>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[26px] border ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-black'}`}>
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={active.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 220, damping: 27, mass: 0.85 }}
              drag={reduceMotion ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              dragMomentum={false}
              whileDrag={{ scale: 0.99 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -55 || info.velocity.x < -450) showNext();
                if (info.offset.x > 55 || info.velocity.x > 450) showPrevious();
              }}
              className="relative grid min-h-[570px] cursor-grab overflow-hidden active:cursor-grabbing lg:min-h-[540px] lg:grid-cols-[minmax(330px,.85fr)_minmax(0,1.15fr)]"
            >
              <div className="relative min-h-[360px] overflow-hidden lg:min-h-full">
                <img src={active.portada} alt="" draggable={false} className="absolute inset-0 h-full w-full scale-110 object-cover object-top blur-2xl" />
                <motion.img
                  layoutId={`adult-youth-cover-${active.id}`}
                  src={active.portada}
                  alt={cleanTitle(active.titulo)}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                <span className="absolute bottom-5 left-5 font-[Montserrat] text-[64px] font-black leading-none text-white/20 sm:text-[88px]">
                  {String(activeIndex + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="relative flex min-w-0 flex-col justify-center p-6 sm:p-9 lg:p-12">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#00C2FF] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-black">{active.tipo || 'Manga'}</span>
                  <span className={`inline-flex -skew-x-12 items-center border px-3 py-1.5 ${isLight ? 'border-black/25 bg-black/[0.04] text-black/55' : 'border-white/25 bg-white/[0.06] text-white/60'}`}>
                    <span className="flex skew-x-12 items-center gap-1.5 text-[11px] font-bold"><Eye size={14} /> {formatViews(active.totalViews)}</span>
                  </span>
                </div>
                <h3 className="line-clamp-3 text-center text-[1.5rem] font-black uppercase italic leading-[0.94] tracking-[-0.045em] lg:text-left lg:text-[2.2rem]">
                  {cleanTitle(active.titulo)}
                </h3>
                <p className={`mt-6 line-clamp-4 max-w-2xl text-justify text-[14px] font-medium leading-7 sm:text-[15px] ${isLight ? 'text-black/65' : 'text-white/[0.68]'}`}>
                  {description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {tags.map((tag) => <span key={tag} className={`rounded-[5px] border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${isLight ? 'border-black/30 text-black/65' : 'border-white/35 text-white/70'}`}>{tag}</span>)}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button type="button" onClick={() => navigate(`/manga/${active.id}`)} className={`flex h-12 items-center gap-2 rounded-[8px] bg-[#00C2FF] px-6 text-[11px] font-black uppercase tracking-[0.14em] transition hover:bg-white hover:text-black ${isLight ? 'text-black' : 'text-white'}`}><Play size={15} fill="currentColor" /> Leer ahora</button>
                  <button type="button" onClick={toggleSaved} className={`flex h-12 items-center gap-2 rounded-[8px] border px-6 text-[11px] font-black uppercase tracking-[0.14em] transition ${isSaved ? 'border-[#00C2FF] bg-[#00C2FF]/10 text-[#00C2FF]' : isLight ? 'border-black/15 text-black hover:border-[#00C2FF]' : 'border-white/15 text-white hover:border-[#00C2FF]'}`}><Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Guardado' : 'Guardar'}</button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <button type="button" onClick={showPrevious} aria-label="Manga juvenil anterior" className={`absolute left-3 top-[180px] z-30 grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md transition hover:border-[#00C2FF] hover:text-[#00C2FF] lg:left-5 lg:top-1/2 lg:-translate-y-1/2 ${isLight ? 'border-black/15 bg-white/80 text-black' : 'border-white/15 bg-black/65 text-white'}`}><ChevronLeft /></button>
          <button type="button" onClick={showNext} aria-label="Manga juvenil siguiente" className={`absolute right-3 top-[180px] z-30 grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md transition hover:border-[#00C2FF] hover:text-[#00C2FF] lg:right-5 lg:top-1/2 lg:-translate-y-1/2 ${isLight ? 'border-black/15 bg-white/80 text-black' : 'border-white/15 bg-black/65 text-white'}`}><ChevronRight /></button>
        </div>

        <div ref={thumbnailRailRef} className="mt-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-[calc(50%_-_95px)] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:snap-none sm:px-0 lg:grid lg:grid-flow-col lg:auto-cols-fr lg:overflow-visible">
          {carouselItems.map((manga, index) => {
            const selected = index === activeIndex;
            return (
              <motion.button
                layout
                key={manga.id}
                type="button"
                data-youth-thumbnail={index}
                onClick={() => selectItem(index)}
                className={`relative flex h-[76px] min-w-[190px] snap-center items-center gap-3 overflow-hidden rounded-[12px] border p-2 text-left transition-colors sm:h-[88px] sm:min-w-[230px] lg:w-full lg:min-w-0 ${selected ? 'border-[#00C2FF]' : isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-black'}`}
              >
                {selected && <motion.span layoutId="adult-youth-active-rail" className="absolute inset-x-0 bottom-0 h-1 bg-[#00C2FF]" />}
                <img src={manga.portada} alt="" draggable={false} className="h-full w-12 shrink-0 rounded-[7px] object-cover sm:w-14" />
                <span className="line-clamp-2 text-[11px] font-black uppercase leading-tight sm:text-[12px]">{cleanTitle(manga.titulo)}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
