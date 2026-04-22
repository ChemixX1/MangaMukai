import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Crown, TrendingUp, BookOpen, Flame, Ticket, Coins, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getPopularWomenByViews } from '../services/mangaService';
import { useHomeData } from '../context/HomeDataContext';

// --- FUNCIONES DE ESTILO ---

const timeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays <= 2) return "New"; 
    return `${diffDays}d`;
};

const getTypeColor = (type: string) => {
    const t = type ? type.toLowerCase() : "";
    if (t.includes('manhwa')) return "bg-purple-600";
    if (t.includes('manhua')) return "bg-green-600";
    if (t.includes('novel')) return "bg-blue-600";
    return "bg-[#FF4D88]"; // Rosa por defecto
};

interface CarouselManga {
  id: string | number;
  title: string;
  coverImage: string;
  chapterNum: string | number;
  isFree: boolean;
  date: string;
  type: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatPopularItems = (mangasWP: any[]): CarouselManga[] =>
  mangasWP
    .slice(0, 12)
    .map(manga => {
      // capitulosRecientes[0] = capítulo más popular (desde /popular-women)
      // o primer capítulo (desde catalog fallback)
      const popularChapter = manga.capitulosRecientes?.[0];
      const rawDate = popularChapter?.fecha || manga.fecha;
      return {
        id: manga.id,
        title: manga.titulo,
        coverImage: manga.portada,
        chapterNum: popularChapter ? popularChapter.numero : 0,
        isFree: popularChapter ? popularChapter.esGratis : true,
        date: timeAgo(rawDate),
        type: manga.tipo || "Manga",
      };
    });

export const PopularCarousel = () => {
  const { popularHistorical, isReady } = useHomeData();
  const [items, setItems] = useState<CarouselManga[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerScreen, setItemsPerScreen] = useState(6);
  const [activeFilter, setActiveFilter] = useState("Histórico");
  const [isDesktop, setIsDesktop] = useState(true);

  const filters = ["Semanal", "Mensual", "Histórico"];

  useEffect(() => {
    if (!isReady) return;

    // Carga inicial con datos del contexto (sin skeleton)
    if (activeFilter === "Histórico" && popularHistorical.length > 0) {
      setItems(formatPopularItems(popularHistorical));
      setCurrentIndex(0);
      setLoading(false);
      return;
    }

    const fetchPopularMangas = async () => {
      try {
        if (items.length > 0) {
          setFilterLoading(true);
        } else {
          setLoading(true);
        }
        const period = activeFilter === 'Semanal' ? 'weekly' : activeFilter === 'Mensual' ? 'monthly' : 'historical';
        const mangasWP = await getPopularWomenByViews(period);
        if (mangasWP.length > 0) { setItems(formatPopularItems(mangasWP)); setCurrentIndex(0); }
        else setItems([]);
      } catch (err) {
        console.error("Error cargando populares:", err);
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    };
    fetchPopularMangas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, isReady]);

  // Responsive
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const desktop = width >= 1024;
      setIsDesktop(desktop);
      if (width < 640) setItemsPerScreen(2); 
      else if (width < 1024) setItemsPerScreen(4);
      else setItemsPerScreen(6); 
    };
    handleResize(); 
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Controles Slider
  const nextSlide = () => {
    if (items.length === 0) return;
    const maxIndex = items.length - Math.floor(itemsPerScreen);
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    if (items.length === 0) return;
    const maxIndex = items.length - Math.floor(itemsPerScreen);
    setCurrentIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
  };

  // Carga inicial (cubierta por GlobalLoader) → invisible
  if (loading && items.length === 0) return null;

  // Número de skeleton cards a mostrar al cambiar filtro
  const skeletonCount = Math.round(itemsPerScreen) || 6;

  return (
    <section className="relative w-full pb-0 group/section mt-0">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Efecto Shine */
        .shine-effect::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 50%;
            height: 100%;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
            transform: skewX(-25deg);
            transition: 0.5s;
            pointer-events: none;
            z-index: 40;
        }
        .group:hover .shine-effect::after {
            left: 150%;
            transition: 0.7s;
        }
      `}</style>

      <div className="w-full max-w-[1600px] mx-auto relative z-20 px-6 lg:px-12">
        
        {/* CABECERA */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-6">
          <div className="flex items-center gap-3 border-l-4 border-[#FF4D88] pl-4">
              <h2 className="text-2xl md:text-4xl font-[900] text-white uppercase italic tracking-tighter flex items-center gap-3">
                  <span className="text-[#FF4D88] drop-shadow-[0_0_10px_rgba(255,77,136,0.6)]">
                    <TrendingUp size={32} strokeWidth={3} />
                  </span>
                  MANGAS <span className="text-[#FF4D88]">POPULARES</span>
              </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex bg-[#0f1115] p-1 rounded-lg border border-white/10 w-full sm:w-auto">
                {filters.map((filter) => (
                <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`flex-1 sm:flex-none px-5 py-2 text-[11px] font-black uppercase tracking-wider rounded-md transition-all duration-300
                    ${activeFilter === filter ? "bg-[#FF4D88] text-white" : "text-gray-500 hover:text-white hover:bg-white/5"}
                    `}
                >
                    {filter}
                </button>
                ))}
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/10 mx-2"></div>

            <div className="hidden lg:flex gap-2 w-full sm:w-auto justify-end relative z-30">
                <button onClick={prevSlide} className="w-10 h-10 rounded-lg bg-[#0f1115] border border-white/10 text-gray-400 flex items-center justify-center hover:bg-[#FF4D88] hover:text-white hover:border-[#FF4D88] transition-all duration-200 shadow-md active:scale-95 cursor-pointer"><ChevronLeft size={20} strokeWidth={2.5} /></button>
                <button onClick={nextSlide} className="w-10 h-10 rounded-lg bg-[#0f1115] border border-white/10 text-gray-400 flex items-center justify-center hover:bg-[#FF4D88] hover:text-white hover:border-[#FF4D88] transition-all duration-200 shadow-md active:scale-95 cursor-pointer"><ChevronRight size={20} strokeWidth={2.5} /></button>
            </div>
          </div>
        </div>

        {/* SLIDER */}
        <div className="relative min-h-[300px]">
            {/* Skeleton al cambiar filtro — mantiene el alto */}
            {filterLoading && (
              <div className="overflow-x-hidden py-4 -mx-2">
                <div className="flex gap-4 lg:gap-0">
                  {Array.from({ length: skeletonCount }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 snap-start w-[160px] sm:w-[190px] lg:px-2 animate-pulse"
                      style={isDesktop ? { width: `${100 / itemsPerScreen}%` } : {}}
                    >
                      <div className="flex flex-col rounded-xl overflow-hidden bg-[#0f1115] ring-1 ring-white/5">
                        <div className="aspect-[3/4.2] w-full bg-white/5" />
                        <div className="px-3 py-2 h-[2.6rem] md:h-[3rem] flex items-center justify-center">
                          <div className="h-3 w-3/4 rounded bg-white/10" />
                        </div>
                        <div className="flex items-center justify-between px-2 md:px-3 py-2.5 bg-[#1a1a1a] border-t border-white/5 gap-2">
                          <div className="h-2 w-1/4 rounded bg-white/10" />
                          <div className="h-2 w-1/4 rounded bg-white/10" />
                          <div className="h-2 w-1/4 rounded bg-white/10" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!filterLoading && (
            <div className="overflow-x-auto lg:overflow-hidden py-4 -mx-2 snap-x snap-mandatory scroll-smooth no-scrollbar">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeFilter}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: isDesktop ? `-${currentIndex * (100 / itemsPerScreen)}%` : 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="flex gap-4 lg:gap-0"
                    >
                        {items.length > 0 ? (
                            items.map((manga, index) => {
                            const rank = index + 1;
                            
                            // Configuración de colores
                            let rankConfig = {
                                text: "text-white", 
                                accent: "text-[#FF4D88]", 
                                glow: "group-hover/card:shadow-[#FF4D88]/30 group-hover/card:ring-[#FF4D88]/50",
                                titleHover: "group-hover/card:text-[#FF4D88]"
                            };

                            if (rank === 1) { 
                                rankConfig = { text: "text-yellow-500", accent: "text-yellow-500", glow: "group-hover/card:shadow-yellow-500/30 group-hover/card:ring-yellow-500/50", titleHover: "group-hover/card:text-yellow-500" };
                            } else if (rank === 2) { 
                                rankConfig = { text: "text-gray-300", accent: "text-gray-300", glow: "group-hover/card:shadow-gray-300/30 group-hover/card:ring-gray-300/50", titleHover: "group-hover/card:text-gray-300" };
                            } else if (rank === 3) { 
                                rankConfig = { text: "text-orange-500", accent: "text-orange-500", glow: "group-hover/card:shadow-orange-500/30 group-hover/card:ring-orange-500/50", titleHover: "group-hover/card:text-orange-500" };
                            }

                            return (
                            <div 
                                key={`${manga.id}-${index}`} 
                                className="flex-shrink-0 snap-start w-[160px] sm:w-[190px] lg:w-auto lg:px-2"
                                style={isDesktop ? { width: `${100 / itemsPerScreen}%` } : {}}
                            >
                                <Link 
                                    to={`/manga/${manga.id}`} 
                                    className={`
                                        group/card h-full transition-all duration-300
                                        flex flex-col relative rounded-xl overflow-hidden
                                        bg-[#0f1115] ring-1 ring-white/10 shadow-lg
                                        group-hover/card:-translate-y-1
                                        ${rankConfig.glow}
                                    `}
                                >
                                    {/* IMAGEN + SHINE */}
                                    <div className="relative aspect-[3/4.2] w-full overflow-hidden transition-all duration-300 shine-effect">
                                            <img src={manga.coverImage} alt={manga.title} className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105" loading="lazy" />
                                            
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent z-10" />
                                            
                                            {/* RANKING (Abajo Izquierda - Sólido y más arriba) */}
                                            <div className="absolute -bottom-2 -left-2 z-20 select-none pointer-events-none">
                                                <span className={`text-[90px] md:text-[110px] font-[900] leading-none tracking-tighter ${rankConfig.text} drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)] italic`}>{rank}</span>
                                            </div>

                                            {/* ETIQUETA TIPO (Abajo Derecha - Movida aquí) */}
                                            <div className="absolute bottom-2 right-2 z-30">
                                                <span className={`${getTypeColor(manga.type)} text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-wider`}>
                                                    {manga.type}
                                                </span>
                                            </div>

                                            {/* CORONA */}
                                            {rank === 1 && (
                                                <div className="absolute top-2 right-2 bg-yellow-500 text-black p-1.5 rounded-md shadow-lg z-30 animate-bounce">
                                                    <Crown size={12} fill="currentColor" />
                                                </div>
                                            )}
                                    </div>

                                    {/* TÍTULO — altura fija para que el footer siempre quede abajo */}
                                    <div className="relative z-20 px-3 flex items-center justify-center h-[2.6rem] md:h-[3rem]">
                                        <h3 className={`text-[13px] md:text-[14px] font-[800] text-white leading-tight line-clamp-2 text-center transition-colors uppercase tracking-tight ${rankConfig.titleHover}`}>
                                            {manga.title}
                                        </h3>
                                    </div>

                                    {/* FOOTER SLIM */}
                                    <div className="flex items-center justify-between px-2 md:px-3 pt-4 pb-2 bg-[#1a1a1a] border-t border-white/5 text-[9px] md:text-[10px] font-[900] uppercase tracking-wide">
                                        <div className={`flex items-center gap-1 ${rankConfig.accent}`}>
                                            <BookOpen size={10} className="md:w-[12px] md:h-[12px]" strokeWidth={3} />
                                            <span>CH {manga.chapterNum}</span>
                                        </div>
                                        <div className="w-px h-2 md:h-3 bg-white/20" />
                                        <div className={`flex items-center gap-1 ${manga.isFree ? 'text-white' : 'text-yellow-400'}`}>
                                            {manga.isFree
                                                ? <Ticket size={10} className="md:w-[12px] md:h-[12px]" />
                                                : <Coins size={10} className="md:w-[12px] md:h-[12px]" />}
                                            <span>{manga.isFree ? "Gratis" : "Pago"}</span>
                                        </div>
                                        <div className="w-px h-2 md:h-3 bg-white/20" />
                                        <div className={`flex items-center gap-1 ${manga.date === 'New' ? 'text-[#FF4D88]' : 'text-gray-300'}`}>
                                            {manga.date === 'New'
                                                ? <Flame size={10} className="md:w-[12px] md:h-[12px]" fill="currentColor" />
                                                : <CalendarDays size={10} className="md:w-[12px] md:h-[12px]" />}
                                            <span>{manga.date === 'New' ? 'New' : manga.date}</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            );
                            })
                        ) : (
                            <div className="w-full h-[300px] flex flex-col items-center justify-center text-white/40 col-span-full mx-auto">
                                <BookOpen size={40} className="mb-2 opacity-50" />
                                <p className="text-sm font-bold uppercase tracking-wider">No hay resultados esta semana</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
            )}
        </div>
      </div>
    </section>
  );
};