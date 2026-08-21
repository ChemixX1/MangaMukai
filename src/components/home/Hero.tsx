import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { Play, Loader2, Bookmark, Eye, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useHomeData } from '../../context/HomeDataContext';

interface Manga {
  id: number | string;
  title: string;
  coverImage: string;
  backgroundHero: string;
  tags: string[];
  description: string;
  type: string;
  isNew: boolean;
  totalViews: number;
  rawDate: string;
}

// 🧼 LIMPIADOR DE TÍTULOS (Seguridad Extra en Frontend)
const cleanTitle = (text: string) => {
    if (!text) return "";
    // Borra "Capítulo", "Chapter", "Volumen" y lo que siga
    return text.replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, "").trim();
};

const isNewManga = (fecha: string) => {
  if (!fecha) return false;
  const diffDays = (Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 90;
};

const formatViews = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const heroTagClassName = "home-hero-tag home-theme-panel shrink-0 whitespace-nowrap rounded-sm border border-neutral-600 bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white";

const FittingHeroTagRow = ({ tags }: { tags: string[] }) => {
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

      for (const chip of Array.from(measureRow.children)) {
        const chipWidth = (chip as HTMLElement).getBoundingClientRect().width;
        const nextWidth = occupiedWidth + (nextVisibleCount > 0 ? gap : 0) + chipWidth;

        if (nextWidth > availableWidth + 0.5) break;

        occupiedWidth = nextWidth;
        nextVisibleCount += 1;
      }

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
    <div ref={containerRef} className="relative w-full overflow-hidden">
      <div className="flex w-full flex-nowrap items-center justify-center gap-1.5 lg:justify-start">
        {tags.slice(0, visibleCount).map((tag, index) => (
          <span key={`${tag}-${index}`} className={heroTagClassName}>{tag}</span>
        ))}
      </div>

      <div ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 flex w-max flex-nowrap items-center gap-1.5">
        {tags.map((tag, index) => (
          <span key={`${tag}-${index}`} className={heroTagClassName}>{tag}</span>
        ))}
      </div>
    </div>
  );
};

 
const formatHeroItems = (mangasWP: any[]): Manga[] =>
  mangasWP
    .slice(0, 8)
    .map(item => {
      const tipoObra = item.tipo || "Manga";
      const genresList = (item.genres && item.genres.length > 0) ? item.genres.map((g: unknown) => String(g)) : ["Romance"];
      // rawFecha = ISO date del servidor (antes del formateo a "22 abr")
      const rawDate = item.rawFecha || item.fecha || '';
      return {
        id: item.id,
        title: cleanTitle(item.titulo),
        coverImage: item.portada,
        backgroundHero: item.portada,
        tags: [tipoObra, ...genresList].slice(0, 4),
        description: item.descripcion || "Una historia increíble te espera...",
        type: tipoObra,
        isNew: isNewManga(rawDate),
        totalViews: item.totalViews || 0,
        rawDate,
      };
    });

export default function Hero() {
  const { popularHistorical, isReady } = useHomeData();
  const [items, setItems] = useState<Manga[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPageVisible, setIsPageVisible] = useState<boolean>(true);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const navigate = useNavigate();

  const activeItem = items && items.length > 0 ? items[currentIndex] : null;

  const handleBookmark = () => {
    setIsBookmarked((prev) => !prev);
  };

  useEffect(() => {
    const handleVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    setItems(formatHeroItems(popularHistorical));
    setLoading(false);
  }, [isReady, popularHistorical]);

  // --- SLIDER LOGIC ---
  const nextSlide = useCallback(() => {
    if (items.length > 0) setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  const prevSlide = useCallback(() => {
    if (items.length > 0) setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  useEffect(() => {
    if (isPaused || items.length === 0 || !isPageVisible) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused, items.length, isPageVisible]);

  // --- RENDERIZADO ---

  const skeletonItem: Manga = {
    id: 'loading',
    title: '',
    coverImage: '',
    backgroundHero: '',
    tags: [],
    description: '',
    type: '',
    isNew: false,
    totalViews: 0,
    rawDate: '',
  };
  const getRelativeIndex = (index: number) => {
    if (items.length === 0) return 0;
    let delta = (index - currentIndex + items.length) % items.length;
    if (delta > items.length / 2) delta -= items.length;
    return delta;
  };

  const carouselSlides = loading
    ? [-1, 0, 1].map((relativeIndex, index) => ({
        item: { ...skeletonItem, id: `loading-${index}` },
        relativeIndex,
        itemIndex: -1,
      }))
    : items.map((item, index) => ({ item, relativeIndex: getRelativeIndex(index), itemIndex: index }));

  if (!loading && items.length === 0) return null;

  return (
    <div className="home-hero relative h-[930px] w-full overflow-hidden bg-[#121212] text-white sm:h-[970px] lg:h-[710px]" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      
      {/* BACKGROUND */}
      <div className="home-hero-backdrop home-theme-backdrop-base absolute inset-0 z-0 bg-[#121212]">
        <AnimatePresence initial={false} mode="popLayout">
          {!loading && activeItem && (
            <motion.div key={activeItem.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }} className="absolute inset-0">
              <img src={activeItem.backgroundHero} alt="" className="home-hero-backdrop-image home-theme-backdrop-image h-full w-full object-cover" />
              <div aria-hidden="true" className="home-hero-theme-scrim absolute inset-0" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="home-hero-layout desktop-content-shell relative z-10 mx-auto flex h-full w-full flex-col items-center justify-start gap-0 pt-20 lg:flex-row lg:justify-between lg:gap-8 lg:pt-0">

        {/* INFO IZQUIERDA (SKELETON O REAL) */}
        <div className="home-hero-info relative z-30 order-2 -mt-5 flex w-full flex-col items-center justify-start space-y-5 pt-0 lg:order-1 lg:mt-0 lg:w-[45%] lg:items-start lg:justify-center lg:pt-[72px]">
          {loading ? (
             // SKELETON TEXTO
             <div className="space-y-6 w-full flex flex-col items-center lg:items-start animate-pulse">
                <div className="h-6 w-24 bg-white/10 rounded skew-x-[-12deg]"></div>
                <div className="h-12 w-3/4 bg-white/10 rounded"></div>
                <div className="h-24 w-full bg-white/10 rounded"></div>
                <div className="flex gap-2"><div className="h-6 w-16 bg-white/10 rounded"></div><div className="h-6 w-16 bg-white/10 rounded"></div></div>
                <div className="flex gap-4"><div className="h-12 w-32 bg-white/10 rounded skew-x-[-20deg]"></div></div>
             </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div key={activeItem?.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.5 }} className="space-y-3 w-full flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="home-hero-primary-tag bg-[#FF4D88] w-fit text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-widest transform -skew-x-12">
                      {activeItem?.type}
                    </div>
                    {activeItem?.isNew && (
                      <div className="flex items-center gap-1 bg-white text-black px-2 py-1 text-[10px] font-black uppercase tracking-widest transform -skew-x-12">
                        <Sparkles size={10} fill="currentColor" /> NUEVO
                      </div>
                    )}
                    {(activeItem?.totalViews ?? 0) > 0 && (
                      <div className="home-hero-chip-muted home-theme-panel flex items-center gap-1 bg-white/10 border border-white/20 text-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transform -skew-x-12">
                        <Eye size={10} /> {formatViews(activeItem!.totalViews)}
                      </div>
                    )}
                  </div>
                  <h1 className="home-hero-heading home-theme-title text-3xl sm:text-4xl lg:text-[30px] font-[1000] italic uppercase tracking-tighter leading-[0.9] text-white text-center lg:text-left drop-shadow-lg line-clamp-2">
                    {activeItem?.title}
                  </h1>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-stretch max-w-2xl w-full">
                <div className="w-1 bg-[#FF4D88] shrink-0 z-10 hidden lg:block" />
                <div className="home-hero-description-panel relative flex-grow bg-white/[0.03] backdrop-blur-md border border-white/5 lg:border-l-0 py-4 px-6 min-h-[110px] flex items-center rounded-lg lg:rounded-none">
                  <AnimatePresence mode="wait">
                    <motion.p key={activeItem?.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="home-hero-description text-white text-[14px] lg:text-[16px] font-medium leading-relaxed text-justify line-clamp-5">
                      {activeItem?.description}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeItem?.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-6 w-full flex flex-col items-center lg:items-start">
                  <div className="w-full px-4 lg:px-0">
                    <FittingHeroTagRow tags={activeItem?.tags || []} />
                  </div>
                  <div className="!mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
                    <button onClick={() => activeItem && navigate(`/manga/${activeItem.id}`)} className="flex h-[45px] -skew-x-[20deg] items-center border-2 border-[#FF4D88] bg-[#FF4D88] px-4 transition-all hover:border-[#e63f78] hover:bg-[#e63f78] active:scale-95">
                      <div className="flex skew-x-[20deg] items-center gap-2 text-xs font-black uppercase tracking-widest text-white">
                        <Play size={16} fill="currentColor" /> Leer Ahora
                      </div>
                    </button>
                    <button onClick={handleBookmark} className={`home-theme-button-outline h-[45px] -skew-x-[20deg] px-4 flex items-center border-2 transition-all active:scale-95 ${isBookmarked ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/20 text-white/80 hover:bg-white/5 hover:text-white'}`}>
                      <div className="skew-x-[20deg] flex items-center gap-2 font-black uppercase tracking-widest text-xs">
                        <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} /> {isBookmarked ? "Guardado" : "Guardar"}
                      </div>
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>

        {/* CARDS DERECHA (3D SLIDER CON SKELETON) */}
        <div className="home-hero-cards relative z-40 order-1 flex h-[400px] w-full items-center justify-center sm:h-[450px] lg:order-2 lg:h-[500px] lg:w-[50%]" style={{ perspective: '1200px' }}>
          <div className="relative mt-4 flex h-full w-full scale-[0.79] items-center justify-center sm:scale-[0.92] lg:mt-24 lg:translate-x-10 lg:scale-[0.94]" style={{ transformStyle: 'preserve-3d' }}>
            {carouselSlides.map(({ item, relativeIndex, itemIndex }) => {
              const isCenter = relativeIndex === 0;
              const distance = Math.abs(relativeIndex);
              const isAdjacent = distance === 1;
              const isQueued = distance === 2;
              const xOffset = isAdjacent ? relativeIndex * 76 : isQueued ? Math.sign(relativeIndex) * 4 : 0;
              const depth = isCenter ? 70 : isAdjacent ? -80 : -250 - Math.min(distance, 4) * 18;
              const scale = isCenter ? 1.11 : isAdjacent ? 0.98 : isQueued ? 0.86 : 0.8;
              const opacity = distance <= 1 ? 1 : isQueued ? 0.14 : 0;
              const rotateY = isAdjacent ? relativeIndex * -28 : isQueued ? relativeIndex * -8 : 0;
              const zIndex = isCenter ? 30 : isAdjacent ? 20 : isQueued ? 10 : 0;

              return (
                <motion.div
                  key={item.id}
                  data-position={relativeIndex}
                  className={`hero-carousel-slide group absolute left-1/2 top-1/2 h-[285px] w-[192px] sm:h-[310px] sm:w-[207px] lg:h-[365px] lg:w-[260px] ${isAdjacent && !loading ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{
                    transformStyle: 'preserve-3d',
                    zIndex,
                    pointerEvents: isAdjacent && !loading ? 'auto' : 'none',
                  }}
                  initial={false}
                  animate={{
                    x: `calc(-50% + ${xOffset}%)`,
                    y: 'calc(-50% - 5%)',
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
                    opacity: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
                  }}
                  aria-hidden={distance > 1 || loading}
                  onClickCapture={() => {
                    if (!isAdjacent || loading) return;
                    setIsPaused(true);
                    setCurrentIndex(itemIndex);
                  }}
                >
                  <button
                    type="button"
                    disabled={!isAdjacent || loading}
                    aria-label={isAdjacent && !loading ? `Mostrar ${item.title}` : undefined}
                    className={`home-hero-carousel-card home-theme-surface shine-effect relative block h-full w-full touch-manipulation overflow-hidden rounded-xl border-2 p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-default ${loading ? 'animate-pulse border-white/10 bg-white/5' : 'border-white/40'}`}
                  >
                    {loading ? (
                        // SKELETON CARD
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                        </div>
                    ) : (
                        // REAL CARD
                        <>
                            <img src={item.coverImage} alt={item.title} className="home-showcase-cover-image h-full w-full object-cover" />
                            <div className="absolute bottom-4 left-4">
                                <span className="px-2 py-1 bg-[#FF4D88] text-[10px] font-black rounded uppercase shadow-md">{item.type}</span>
                            </div>
                        </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {!loading && items.length > 1 && (
            <>
              <button
                type="button"
                className="absolute inset-y-0 left-0 z-[80] hidden w-[34%] cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:block"
                onClick={() => {
                  setIsPaused(true);
                  prevSlide();
                }}
                aria-label="Mostrar portada anterior"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 z-[80] hidden w-[28%] cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:block"
                onClick={() => {
                  setIsPaused(true);
                  nextSlide();
                }}
                aria-label="Mostrar portada siguiente"
              />
            </>
          )}
        </div>
      </div>
      
      {/* PUNTOS DE NAVEGACION */}
      {!loading && (
        <div className="absolute bottom-11 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-5 lg:bottom-8">
            {items.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`h-1.5 -skew-x-12 transition-all duration-500 ${i === currentIndex ? "w-10 bg-[#FF4D88]" : "w-4 bg-neutral-700 hover:bg-neutral-500"}`} />
            ))}
        </div>
      )}
    </div>
  );
}
