import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Crown, TrendingUp, BookOpen, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getLatestMenMangas } from '../services/mangaService';
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
    return "bg-[#00C2FF]"; // Azul por defecto para hombres
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

export const YouthCarousel = () => {
  const { latestMen, isReady } = useHomeData();
  const [items, setItems] = useState<CarouselManga[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerScreen, setItemsPerScreen] = useState(6);
  const [activeFilter, setActiveFilter] = useState("Semanal");
  const [isDesktop, setIsDesktop] = useState(true);

  const filters = ["Semanal", "Mensual", "Histórico"];

  const formatItems = (mangasWP: typeof latestMen): CarouselManga[] =>
    mangasWP.slice(0, 12).map(manga => {
      const latestChapter = manga.capitulosRecientes?.[0];
      const rawDate = latestChapter ? latestChapter.fecha : manga.fecha;
      return {
        id: manga.id,
        title: manga.titulo,
        coverImage: manga.portada,
        chapterNum: latestChapter ? latestChapter.numero : 0,
        isFree: latestChapter ? latestChapter.esGratis : true,
        date: timeAgo(rawDate),
        type: manga.tipo || "Manga",
      };
    });

  useEffect(() => {
    if (!isReady) return;

    if (latestMen.length > 0) {
      setItems(formatItems(latestMen));
      setCurrentIndex(0);
      setLoading(false);
      return;
    }

    const fetchMangas = async () => {
      try {
        setLoading(true);
        const mangasWP = await getLatestMenMangas();
        if (mangasWP.length > 0) { setItems(formatItems(mangasWP)); setCurrentIndex(0); }
        else setItems([]);
      } catch (err) {
        console.error("Error cargando populares hombres:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMangas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

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

  if (loading) return null;

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
          <div className="flex items-center gap-3 border-l-4 border-[#00C2FF] pl-4">
              <h2 className="text-2xl md:text-4xl font-[900] text-white uppercase italic tracking-tighter flex items-center gap-3">
                  <span className="text-[#00C2FF] drop-shadow-[0_0_10px_rgba(0,194,255,0.6)]">
                    <TrendingUp size={32} strokeWidth={3} />
                  </span>
                  MANGAS <span className="text-[#00C2FF]">POPULARES</span>
              </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex bg-[#0f1115] p-1 rounded-lg border border-white/10 w-full sm:w-auto">
                {filters.map((filter) => (
                <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`flex-1 sm:flex-none px-5 py-2 text-[11px] font-black uppercase tracking-wider rounded-md transition-all duration-300
                    ${activeFilter === filter ? "bg-[#00C2FF] text-white" : "text-gray-500 hover:text-white hover:bg-white/5"}
                    `}
                >
                    {filter}
                </button>
                ))}
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/10 mx-2"></div>

            <div className="hidden lg:flex gap-2 w-full sm:w-auto justify-end relative z-30">
                <button onClick={prevSlide} className="w-10 h-10 rounded-lg bg-[#0f1115] border border-white/10 text-gray-400 flex items-center justify-center hover:bg-[#00C2FF] hover:text-white hover:border-[#00C2FF] transition-all duration-200 shadow-md active:scale-95 cursor-pointer"><ChevronLeft size={20} strokeWidth={2.5} /></button>
                <button onClick={nextSlide} className="w-10 h-10 rounded-lg bg-[#0f1115] border border-white/10 text-gray-400 flex items-center justify-center hover:bg-[#00C2FF] hover:text-white hover:border-[#00C2FF] transition-all duration-200 shadow-md active:scale-95 cursor-pointer"><ChevronRight size={20} strokeWidth={2.5} /></button>
            </div>
          </div>
        </div>

        {/* SLIDER */}
        <div className="relative min-h-[300px]"> 
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
                            
                            // Configuración de colores (AZUL para hombres)
                            let rankConfig = {
                                text: "text-white", 
                                accent: "text-[#00C2FF]", 
                                glow: "group-hover/card:shadow-[#00C2FF]/30 group-hover/card:ring-[#00C2FF]/50",
                                titleHover: "group-hover/card:text-[#00C2FF]"
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
                                            
                                            {/* RANKING (Abajo Izquierda) */}
                                            <div className="absolute -bottom-2 -left-2 z-20 select-none pointer-events-none">
                                                <span className={`text-[90px] md:text-[110px] font-[900] leading-none tracking-tighter ${rankConfig.text} drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)] italic`}>{rank}</span>
                                            </div>

                                            {/* ETIQUETA TIPO (Abajo Derecha) */}
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

                                    {/* INFO */}
                                    <div className="flex flex-col justify-between flex-grow relative z-20 p-3"> 
                                            <h3 className={`text-[13px] md:text-[14px] font-[800] text-white leading-tight line-clamp-2 text-center transition-colors uppercase tracking-tight mb-2 ${rankConfig.titleHover}`}>
                                            {manga.title}
                                            </h3>

                                            {/* BARRA DE DATOS */}
                                            <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center w-full bg-[#161616] group-hover/card:bg-[#222] px-2 py-1.5 rounded-md border border-white/5 group-hover/card:border-white/10 transition-all">
                                                <div className="flex items-center min-w-0">
                                                    <span className={`text-[10px] md:text-[11px] font-bold whitespace-nowrap overflow-hidden text-ellipsis text-gray-200 ${rankConfig.titleHover}`}>
                                                        Ch. {manga.chapterNum}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center justify-center shrink-0">
                                                    {manga.isFree ? (
                                                        <div className="flex items-center gap-1">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
                                                                <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42z" fill="#10B981"/>
                                                                <circle cx="6.5" cy="6.5" r="1.5" fill="#065F46"/>
                                                            </svg>
                                                            <span className="text-green-400 font-bold uppercase text-[9px] hidden sm:inline">Gratis</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <svg width="16" height="14" viewBox="0 0 32 28" fill="none" className="drop-shadow-lg">
                                                                <g><ellipse cx="9" cy="14" rx="6" ry="2.5" fill="#D97706"/><ellipse cx="9" cy="14" rx="6" ry="2.5" fill="#F59E0B"/><path d="M3 14v3c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-3" fill="#D97706"/><ellipse cx="9" cy="17" rx="6" ry="2.5" fill="#FDB022"/><ellipse cx="9" cy="17" rx="4.5" ry="1.8" fill="#FCD34D"/><ellipse cx="9" cy="17" rx="3" ry="1.2" fill="#FEF3C7"/><circle cx="9" cy="17" r="2.2" fill="none" stroke="#F59E0B" strokeWidth="0.4"/><ellipse cx="9" cy="11" rx="6" ry="2.5" fill="#D97706"/><ellipse cx="9" cy="11" rx="6" ry="2.5" fill="#F59E0B"/><path d="M3 11v3c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-3" fill="#D97706"/><ellipse cx="9" cy="14" rx="6" ry="2.5" fill="#FDB022"/><ellipse cx="9" cy="14" rx="4.5" ry="1.8" fill="#FCD34D"/><ellipse cx="9" cy="14" rx="3" ry="1.2" fill="#FEF3C7"/><circle cx="9" cy="14" r="2.2" fill="none" stroke="#F59E0B" strokeWidth="0.4"/></g>
                                                                <g><ellipse cx="16" cy="16" rx="6.5" ry="2.8" fill="#D97706"/><ellipse cx="16" cy="16" rx="6.5" ry="2.8" fill="#F59E0B"/><path d="M9.5 16v3.5c0 1.55 2.91 2.8 6.5 2.8s6.5-1.25 6.5-2.8V16" fill="#D97706"/><ellipse cx="16" cy="19.5" rx="6.5" ry="2.8" fill="#FDB022"/><ellipse cx="16" cy="19.5" rx="5" ry="2" fill="#FCD34D"/><ellipse cx="16" cy="19.5" rx="3.5" ry="1.4" fill="#FEF3C7"/><circle cx="16" cy="19.5" r="2.5" fill="none" stroke="#F59E0B" strokeWidth="0.4"/><ellipse cx="16" cy="12.5" rx="6.5" ry="2.8" fill="#D97706"/><ellipse cx="16" cy="12.5" rx="6.5" ry="2.8" fill="#F59E0B"/><path d="M9.5 12.5v3.5c0 1.55 2.91 2.8 6.5 2.8s6.5-1.25 6.5-2.8v-3.5" fill="#D97706"/><ellipse cx="16" cy="16" rx="6.5" ry="2.8" fill="#FDB022"/><ellipse cx="16" cy="16" rx="5" ry="2" fill="#FCD34D"/><ellipse cx="16" cy="16" rx="3.5" ry="1.4" fill="#FEF3C7"/><circle cx="16" cy="16" r="2.5" fill="none" stroke="#F59E0B" strokeWidth="0.4"/><ellipse cx="16" cy="9" rx="6.5" ry="2.8" fill="#D97706"/><ellipse cx="16" cy="9" rx="6.5" ry="2.8" fill="#F59E0B"/><path d="M9.5 9v3.5c0 1.55 2.91 2.8 6.5 2.8s6.5-1.25 6.5-2.8V9" fill="#D97706"/><ellipse cx="16" cy="12.5" rx="6.5" ry="2.8" fill="#FDB022"/><ellipse cx="16" cy="12.5" rx="5" ry="2" fill="#FCD34D"/><ellipse cx="16" cy="12.5" rx="3.5" ry="1.4" fill="#FEF3C7"/><circle cx="16" cy="12.5" r="2.5" fill="none" stroke="#F59E0B" strokeWidth="0.4"/></g>
                                                                <g><ellipse cx="25" cy="16" rx="7" ry="3" fill="#D97706"/><ellipse cx="25" cy="16" rx="7" ry="3" fill="#F59E0B"/><path d="M18 16v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4" fill="#D97706"/><ellipse cx="25" cy="20" rx="7" ry="3" fill="#FDB022"/><ellipse cx="25" cy="20" rx="5.5" ry="2.2" fill="#FCD34D"/><ellipse cx="25" cy="20" rx="4" ry="1.6" fill="#FEF3C7"/><circle cx="25" cy="20" r="3" fill="none" stroke="#F59E0B" strokeWidth="0.5"/><circle cx="25" cy="20" r="2" fill="none" stroke="#FBBF24" strokeWidth="0.3"/></g>
                                                            </svg>
                                                            <span className="text-yellow-400 font-bold uppercase text-[9px] hidden sm:inline">Pago</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-end shrink-0">
                                                    <span className={`text-[9px] md:text-[10px] font-bold whitespace-nowrap ${manga.date === 'New' ? 'text-[#00C2FF] animate-pulse flex items-center gap-0.5' : 'text-gray-300'}`}>
                                                        {manga.date === 'New' && <Flame size={10} fill="currentColor" />}
                                                        {manga.date === 'New' ? manga.date : `${manga.date === '1d' ? '1 Day' : manga.date.replace('d', ' Days')}`}
                                                    </span>
                                                </div>
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
        </div>
      </div>
    </section>
  );
};