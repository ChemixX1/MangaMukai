import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { BookOpen, Bookmark, Eye, Star, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import FilterStripTactical from "./FilterStripTactical";
import { useHomeData } from '../../context/HomeDataContext';
import { useSavedMangas } from '../../hooks/useSavedMangas';
import { buildViewsIndex, withKnownViews } from '../../utils/seriesViews';
import { filterYouthMen } from '../../utils/youthFilter';

interface Manga {
  id: number | string;
  title: string;
  coverImage: string;
  backgroundHero: string;
  tags: string[];
  description: string;
  rating: number;
  type: string;
  totalViews: number;
}

const formatMenItems = (mangasWP: ReturnType<typeof Array.prototype.map>): Manga[] =>
  (mangasWP as { id: number | string; titulo: string; portada: string; tipo: string; genres?: number[]; descripcion?: string; totalViews?: number; capitulosRecientes: Array<{ numero: string; esGratis: boolean; fecha: string }> }[]).map(manga => {
    const genresList = (manga.genres && manga.genres.length > 0) ? (manga.genres as unknown as string[]) : [];
    const tags = genresList.filter(Boolean).slice(0, 4);
    return {
      id: manga.id, title: manga.titulo, coverImage: manga.portada, backgroundHero: manga.portada,
      tags, description: manga.descripcion || "Sin descripción disponible.", rating: 10,
      type: manga.tipo || "Manga", totalViews: manga.totalViews || 0,
    };
  });

const formatViews = (views: number) => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return String(views);
};

const menTagClassName = "home-men-tag shrink-0 whitespace-nowrap rounded-md border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-300";

const FittingTagRow = ({ tags }: { tags: string[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureRow = measureRef.current;
    if (!container || !measureRow) return;

    let animationFrame = 0;
    const updateVisibleTags = () => {
      const availableWidth = container.clientWidth;
      const gap = Number.parseFloat(window.getComputedStyle(measureRow).columnGap) || 0;
      let occupiedWidth = 0;
      let nextVisibleCount = 0;

      Array.from(measureRow.children).forEach((chip) => {
        const chipWidth = (chip as HTMLElement).getBoundingClientRect().width;
        const nextWidth = occupiedWidth + (nextVisibleCount > 0 ? gap : 0) + chipWidth;

        if (nextWidth <= availableWidth + 0.5) {
          occupiedWidth = nextWidth;
          nextVisibleCount += 1;
        }
      });

      setVisibleCount(nextVisibleCount);
    };

    const scheduleMeasurement = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateVisibleTags);
    };

    const resizeObserver = new ResizeObserver(scheduleMeasurement);
    resizeObserver.observe(container);
    updateVisibleTags();
    void document.fonts?.ready.then(scheduleMeasurement);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [tags]);

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-[560px] overflow-hidden sm:mx-0">
      <div className="flex w-full flex-nowrap items-center justify-center gap-2 sm:justify-start">
        {tags.slice(0, visibleCount).map((tag) => (
          <span key={tag} className={menTagClassName}>{tag}</span>
        ))}
      </div>

      <div ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 flex w-max flex-nowrap items-center gap-2">
        {tags.map((tag) => (
          <span key={tag} className={menTagClassName}>{tag}</span>
        ))}
      </div>
    </div>
  );
};

export const LatestUpdates = () => {
  const { latestMen, popularMenWeekly, popularMenHistorical, isReady } = useHomeData();
  const [items, setItems] = useState<Manga[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const { isSaved, toggle: toggleSaved } = useSavedMangas();
  const activeItem = items && items.length > 0 ? items[currentIndex] : null;
  // Guardado real: mismo estado que la ficha y la página de guardados.
  const isBookmarked = activeItem ? isSaved(activeItem.id) : false;

  const handleBookmark = () => {
    if (activeItem) void toggleSaved(activeItem.id);
  };

  useEffect(() => {
    if (!isReady) return;
    // Las últimas actualizaciones llegan sin vistas: se completan con las
    // cifras de los rankings de populares, que sí las traen.
    const viewsIndex = buildViewsIndex(popularMenWeekly, popularMenHistorical);
    setItems(formatMenItems(withKnownViews(filterYouthMen(latestMen), viewsIndex)));
    setLoading(false);
  }, [isReady, latestMen, popularMenWeekly, popularMenHistorical]);

  const nextSlide = useCallback(() => {
    if (items.length > 0) setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  useEffect(() => {
    if (isPaused || items.length === 0) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused, items.length]);

  const getRelativeIndex = (index: number) => {
    if (items.length === 0) return 0;
    const length = items.length;
    let delta = (index - currentIndex + length) % length;
    if (delta > length / 2) delta -= length;
    return delta;
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section
      className="home-men-showcase relative w-full min-h-[960px] sm:min-h-[1040px] md:min-h-[1080px] lg:min-h-[850px] lg:h-[850px] overflow-hidden bg-transparent text-white font-sans flex flex-col"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      
      {/* 1. HEADER */}
      <div className="absolute left-0 top-0 z-40 h-[70px] w-full md:h-24">
          <div
            aria-hidden="true"
            className="home-men-ramp pointer-events-none absolute bottom-[-20px] left-0 h-10 w-full bg-gradient-to-r from-[#67E8F9] via-[#38BDF8] to-[#3B82F6]"
          />

          <div className="desktop-content-shell relative z-10 mx-auto flex h-full w-full max-w-[1600px] items-end px-4 pb-1 md:items-center md:px-6 md:pb-0 lg:px-12">
              <div className="flex items-center gap-2 overflow-visible md:gap-3">
                  <h2 className="home-men-section-title flex shrink-0 -translate-y-1 items-center gap-2 overflow-visible whitespace-nowrap text-[23px] font-[900] uppercase italic leading-none tracking-tighter text-white sm:translate-y-0 md:gap-3 md:text-4xl lg:translate-y-3">
                      <span className="text-[#38BDF8] drop-shadow-[0_0_10px_rgba(56,189,248,0.5)] shrink-0">
                          <UserRound className="h-6 w-6 md:h-7 md:w-7" strokeWidth={3} />
                      </span>
                      MANGAS <span className="text-[#38BDF8]">JUVENILES</span>
                  </h2>
              </div>
          </div>
      </div>

      {/* 2. BACKGROUND */}
      <div className="home-men-backdrop home-theme-backdrop-base pointer-events-none absolute inset-x-0 bottom-0 top-[70px] z-0 overflow-hidden bg-[#0a0a0a] md:top-24">
         <AnimatePresence initial={false} mode="popLayout">
          {activeItem && (
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 1 }} 
              className="absolute inset-0"
            >
              <img src={activeItem.backgroundHero} alt="" className="home-hero-backdrop-image home-men-backdrop-image home-theme-backdrop-image h-full w-full object-cover" />
              <div aria-hidden="true" className="home-section-theme-scrim absolute inset-0" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div className="desktop-content-shell container relative z-10 mx-auto flex flex-grow flex-col items-center gap-0 px-6 pt-20 sm:gap-5 sm:px-4 sm:pt-[70px] md:gap-8 md:px-6 md:pt-28 lg:flex-row lg:pt-20">
        
        {/* INFO COLUMN */}
        <div className="order-2 z-20 -mt-2 flex w-full flex-col items-center justify-center sm:mt-0 sm:items-start lg:order-1 lg:w-[44%] lg:pl-10">
          <AnimatePresence mode="wait">
            {activeItem && (
                <motion.div
                  key={activeItem.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="w-full space-y-6 text-center sm:space-y-4 sm:text-left md:space-y-6"
                >
                  <div className="home-men-copy-width flex flex-col gap-3 sm:gap-2 md:gap-4">
                      <div className="mx-auto flex w-fit max-w-full flex-nowrap items-center gap-2 overflow-hidden sm:mx-0">
                        <div className="home-men-primary-tag w-fit shrink-0 rounded-md bg-[#38BDF8] px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black">
                          {activeItem.type}
                        </div>
                        <div className="home-hero-chip-muted home-theme-panel flex shrink-0 items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                          <Eye size={10} aria-hidden="true" />
                          <span className="whitespace-nowrap">{formatViews(activeItem.totalViews)}</span>
                        </div>
                      </div>
                      <h2 className="home-men-feature-heading home-theme-title h-auto overflow-hidden text-ellipsis text-center text-3xl font-[1000] uppercase italic leading-[0.9] tracking-tighter text-white drop-shadow-lg line-clamp-2 sm:text-left sm:text-4xl lg:text-[30px]">
                          {activeItem.title}
                      </h2>
                  </div>

                  <div className="home-men-copy-width flex w-full max-w-2xl items-stretch">
                    <div className="home-men-description relative flex min-h-[110px] flex-grow items-center rounded-lg border border-white/5 bg-white/[0.03] px-6 py-4 lg:border-l-4 lg:border-l-[#38BDF8]">
                      <p className="home-men-description-copy text-justify text-[14px] font-medium leading-relaxed text-white line-clamp-5 lg:text-[16px]">
                        {activeItem.description}
                      </p>
                    </div>
                  </div>

                  <div className="!mt-7 w-full">
                    <FittingTagRow tags={activeItem.tags} />
                  </div>
                  
                  <div className="!mt-9 flex flex-wrap justify-center gap-3 sm:!mt-8 sm:justify-start md:gap-4">
                      <Link to={`/manga/${activeItem.id}`}>
                          <button className="px-5 py-3 md:px-8 md:py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                              <BookOpen size={16} className="md:w-[18px] md:h-[18px]" /> Leer Ahora
                          </button>
                      </Link>
                      
                      {/* BOTÓN GUARDAR */}
                      <button 
                          onClick={handleBookmark}
                          className={`px-5 py-3 md:px-8 md:py-3.5 border text-sm md:text-base font-bold rounded-lg flex items-center gap-2 transition-all backdrop-blur-sm ${
                              isBookmarked 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'home-theme-button-outline bg-white/5 hover:bg-white/10 border-white/10 text-white'
                          }`}
                      >
                          <Bookmark size={16} className="md:w-[18px] md:h-[18px]" fill={isBookmarked ? "currentColor" : "none"} /> 
                          {isBookmarked ? "Guardado" : "Guardar"}
                      </button>
                  </div>

                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- COLUMNA DERECHA: CARDS --- */}
        <div className="relative order-1 flex h-[400px] w-full items-center justify-center [perspective:1000px] sm:h-[320px] md:h-[450px] lg:order-2 lg:w-[50%] lg:justify-start lg:pl-20">
            <div className="transform-style-3d relative flex h-full w-full translate-x-0 items-center justify-center sm:-translate-x-1 lg:translate-x-1 lg:justify-start">
              {items.map((item, index) => {
                const relativeIndex = getRelativeIndex(index);
                const isVisible = relativeIndex >= 0 && relativeIndex <= 2;
                const isQueued = relativeIndex === -1 || relativeIndex === 3;
                const xPercent = isVisible ? relativeIndex * 108 : 0;
                const depth = relativeIndex === 0 ? 70 : relativeIndex === 1 ? -40 : relativeIndex === 2 ? -110 : -260;
                const scale = isVisible ? 1 : isQueued ? 0.88 : 0.82;
                const opacity = isVisible ? 1 : 0;
                const rotateY = isVisible ? 0 : Math.sign(relativeIndex) * -10;
                const zIndex = relativeIndex === 0 ? 30 : relativeIndex === 1 ? 20 : relativeIndex === 2 ? 10 : 0;
                
                return (
                  <motion.div
                    key={item.id}
                    data-position={relativeIndex}
                    className={`group absolute h-[240px] w-[154px] sm:w-[148px] md:h-[340px] md:w-[210px] lg:left-0 lg:h-[420px] lg:w-[250px] ${isVisible ? 'cursor-pointer' : 'cursor-default'}`}
                    initial={false}
                    animate={{
                      x: `${xPercent}%`,
                      y: "0%",
                      z: depth,
                      scale,
                      opacity,
                      rotateY,
                    }}
                    transition={{
                      x: { type: 'spring', stiffness: 68, damping: 18, mass: 0.95 },
                      y: { type: 'spring', stiffness: 68, damping: 18, mass: 0.95 },
                      z: { type: 'spring', stiffness: 68, damping: 18, mass: 0.95 },
                      scale: { type: 'spring', stiffness: 68, damping: 18, mass: 0.95 },
                      rotateY: { type: 'spring', stiffness: 68, damping: 18, mass: 0.95 },
                      opacity: { duration: isVisible ? 0.3 : 0.04, ease: [0.22, 1, 0.36, 1] },
                    }}
                    onClick={() => {
                      if (isVisible) setCurrentIndex(index);
                    }}
                    style={{
                      zIndex,
                      pointerEvents: isVisible ? 'auto' : 'none',
                      transformStyle: 'preserve-3d',
                    }}
                    aria-hidden={!isVisible}
                  >
                    <div className={`
                        home-theme-surface
                        h-full overflow-hidden rounded-xl transition-all duration-500 shadow-xl
                        ring-1 ring-white/10 hover:ring-white/30
                    `}>
                        
                        <div className="relative h-full w-full overflow-hidden">
                            <img src={item.coverImage} alt={`Portada del manga ${item.title}`} className="home-showcase-cover-image h-full w-full object-cover" loading="lazy" decoding="async" />
                            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-white/15 bg-black/70 px-2 py-1 text-[10px] font-black text-yellow-400" aria-label={`Valoración ${item.rating}`}>
                              <Star size={11} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
                              {item.rating}
                            </span>
                        </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

        </div>
      </div>

      <div className="relative z-30 -mt-6 flex w-full justify-center gap-2 pb-3 pt-0 sm:mt-0 sm:pb-7 sm:pt-2" aria-label="Cambiar manga juvenil">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex ? "w-9 bg-blue-600" : "w-2.5 bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Ver manga ${i + 1}`}
            aria-current={i === currentIndex ? 'true' : undefined}
          />
        ))}
      </div>

      <div className="relative z-30 w-full mt-auto">
         <FilterStripTactical />
      </div>

    </section>
  );
};
