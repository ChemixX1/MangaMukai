import { useState, useEffect, useCallback } from "react";
import { BookOpen, Bookmark, Clock, Ticket, Coins, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import FilterStripTactical from "./FilterStripTactical";
import { getLatestMenMangas } from '../services/mangaService';
import { useHomeData } from '../context/HomeDataContext';

interface Manga {
  id: number | string;
  title: string;
  coverImage: string;
  backgroundHero: string;
  tags: string[];
  description: string;
  rating: number;
  chapterNum: string | number;
  isFree: boolean;
  date: string;
}

const formatMenItems = (mangasWP: ReturnType<typeof Array.prototype.map>): Manga[] =>
  (mangasWP as { id: number | string; titulo: string; portada: string; tipo: string; genres?: number[]; descripcion?: string; capitulosRecientes: Array<{ numero: string; esGratis: boolean; fecha: string }> }[]).map(manga => {
    const latestChapter = manga.capitulosRecientes?.[0];
    const genresList = (manga.genres && manga.genres.length > 0) ? (manga.genres as unknown as string[]) : [];
    const tags = [manga.tipo, ...genresList].filter(Boolean).slice(0, 4);
    let dateStr = "N/A";
    if (latestChapter?.fecha) dateStr = new Date(latestChapter.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return {
      id: manga.id, title: manga.titulo, coverImage: manga.portada, backgroundHero: manga.portada,
      tags, description: manga.descripcion || "Sin descripción disponible.", rating: 10,
      chapterNum: latestChapter ? latestChapter.numero : '?',
      isFree: latestChapter ? latestChapter.esGratis : true, date: dateStr,
    };
  });

export const LatestUpdates = () => {
  const { latestMen, isReady } = useHomeData();
  const [items, setItems] = useState<Manga[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const activeItem = items && items.length > 0 ? items[currentIndex] : null;

  const handleBookmark = () => {
    setIsBookmarked((prev) => !prev);
  };

  useEffect(() => {
    if (!isReady) return;

    if (latestMen.length > 0) {
      setItems(formatMenItems(latestMen));
      setLoading(false);
      return;
    }

    const fetchMangas = async () => {
      try {
        setLoading(true);
        const mangasWP = await getLatestMenMangas();
        if (mangasWP.length > 0) setItems(formatMenItems(mangasWP));
      } catch (error) {
        console.error("Error cargando Mangas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMangas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

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
      className="relative w-full min-h-[600px] lg:h-[800px] overflow-hidden bg-[#0a0a0a] text-white font-sans flex flex-col"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      
      {/* 1. HEADER */}
      <div className="absolute top-0 left-0 w-full h-24 z-40">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#38BDF8]/15 via-[#38BDF8]/5 to-transparent pointer-events-none"></div>

          <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-12 h-full flex items-center">
              <div className="flex items-center gap-2 md:gap-3 border-l-4 border-[#38BDF8] pl-3 md:pl-4 overflow-hidden">
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-[900] text-white uppercase italic tracking-tighter flex items-center gap-2 md:gap-3 whitespace-nowrap overflow-hidden text-ellipsis line-clamp-1">
                      <span className="text-[#38BDF8] drop-shadow-[0_0_10px_rgba(56,189,248,0.5)] shrink-0">
                          <Clock className="w-5 h-5 md:w-7 md:h-7" strokeWidth={3} />
                      </span>
                      MANGAS JUVENILES
                  </h2>
              </div>
          </div>
      </div>

      {/* 2. BACKGROUND */}
      <div className="absolute top-24 bottom-0 left-0 right-0 z-0">
         <AnimatePresence initial={false} mode="popLayout">
          {activeItem && (
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.6 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 1 }} 
              className="absolute inset-0"
            >
              <img src={activeItem.backgroundHero} alt="background" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/40" />
               <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#0a0a0a]/80 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div className="container mx-auto flex-grow flex flex-col lg:flex-row items-center relative z-10 px-4 md:px-6 pt-24 lg:pt-20 gap-4 md:gap-8">
        
        {/* INFO COLUMN */}
        <div className="w-full lg:w-[40%] flex flex-col justify-center items-start z-20">
          <AnimatePresence mode="wait">
            {activeItem && (
                <motion.div
                  key={activeItem.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="space-y-4 md:space-y-6 w-full"
                >
                  <div className="flex flex-col gap-2 md:gap-4">
                      <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight drop-shadow-xl shadow-black line-clamp-2 text-ellipsis overflow-hidden h-auto">
                          {activeItem.title}
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-2">
                          {activeItem.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-gray-300 bg-white/10 backdrop-blur-md px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-white/10">{tag}</span>
                          ))}
                          <span className="text-yellow-500 text-xs md:text-sm font-bold ml-1 md:ml-2">★ {activeItem.rating}</span>
                      </div>
                  </div>

                  <div className="relative p-3 md:p-4 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 shadow-lg max-w-xl">
                    <p className="text-gray-200 text-xs md:text-sm lg:text-base leading-relaxed line-clamp-3 md:line-clamp-4">
                        {activeItem.description}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 md:gap-4 pt-2 md:pt-4">
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
                              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
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
        <div className="w-full lg:w-[50%] h-[320px] md:h-[450px] relative flex items-center justify-center lg:justify-start [perspective:1000px] lg:pl-32 mt-4 md:mt-0">
            <div className="relative w-full h-full flex items-center justify-center lg:justify-start transform-style-3d">
              {items.map((item, index) => {
                const relativeIndex = getRelativeIndex(index);
                const isCenter = relativeIndex === 0; 
                const isVisible = relativeIndex >= 0 && relativeIndex <= 2;
                
                if (!isVisible) return null; 

                const xPercent = relativeIndex * 108; 
                
                return (
                  <motion.div
                    key={item.id}
                    className="absolute lg:left-0 w-[140px] h-[240px] md:w-[200px] md:h-[340px] lg:w-[240px] lg:h-[420px] cursor-pointer"
                    initial={false}
                    animate={{
                      x: `${xPercent}%`, 
                      y: "0%",
                      scale: 1, 
                      opacity: 1, 
                    }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    onClick={() => setCurrentIndex(index)}
                    style={{ zIndex: 10 - relativeIndex }}
                  >
                    <div className={`
                        flex flex-col h-full rounded-xl overflow-hidden transition-all duration-500 shadow-xl
                        ${isCenter 
                            ? 'ring-2 ring-blue-500 shadow-blue-900/40' 
                            : 'ring-1 ring-white/10 hover:ring-white/30'}
                    `}>
                        
                        {/* 1. IMAGEN */}
                        <div className="relative w-full h-[85%] md:h-[90%] overflow-hidden">
                            <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-3 right-3">
                                <p className="text-white text-xs md:text-sm font-[900] truncate uppercase tracking-tight drop-shadow-md">
                                    {item.title}
                                </p>
                            </div>
                        </div>

                        {/* 2. FOOTER SLIM */}
                        <div className={`
                            flex items-center justify-between px-2 md:px-3 h-[15%] md:h-[10%] bg-[#1a1a1a] border-t border-white/5
                            text-[9px] md:text-[11px] font-[900] uppercase tracking-wide
                            transition-opacity duration-300 ${isCenter ? 'opacity-100' : 'opacity-80'}
                        `}>
                            <div className="flex items-center gap-1 text-blue-400">
                                <BookOpen size={10} className="md:w-[13px] md:h-[13px]" strokeWidth={3} />
                                <span>CH {item.chapterNum}</span>
                            </div>
                            <div className="w-px h-2 md:h-3 bg-white/20"></div>
                            <div className={`flex items-center gap-1 ${item.isFree ? 'text-white' : 'text-yellow-400'}`}>
                                {item.isFree ? <Ticket size={10} className="md:w-[13px] md:h-[13px]" /> : <Coins size={10} className="md:w-[13px] md:h-[13px]" />}
                                <span>{item.isFree ? "Gratis" : "Pago"}</span>
                            </div>
                            <div className="w-px h-2 md:h-3 bg-white/20"></div>
                            <div className="flex items-center gap-1 text-gray-300">
                                <CalendarDays size={10} className="md:w-[13px] md:h-[13px]" />
                                <span>{item.date}</span>
                            </div>
                        </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
        </div>
      </div>
      
      {/* 4. INDICADORES */}
      <div className="absolute bottom-16 md:bottom-10 lg:bottom-30 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`transition-all duration-300 h-1.5 rounded-full ${
              i === currentIndex ? "w-8 md:w-10 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]" : "w-2 md:w-2.5 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <div className="relative z-30 w-full mt-auto">
         <FilterStripTactical />
      </div>

    </section>
  );
};