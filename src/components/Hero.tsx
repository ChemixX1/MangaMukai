import { useState, useEffect, useCallback } from "react";
import { Play, Loader2, Bookmark, Eye, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getPopularWomenByViews } from '../services/mangaService';
import { useHomeData } from '../context/HomeDataContext';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    if (popularHistorical.length > 0) {
      setItems(formatHeroItems(popularHistorical));
      setLoading(false);
      return;
    }

    const fetchMangas = async () => {
      try {
        setLoading(true);
        const mangasWP = await getPopularWomenByViews('historical');
        if (mangasWP && mangasWP.length > 0) setItems(formatHeroItems(mangasWP));
      } catch (error) {
        console.error("Error Hero:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMangas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

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

  const getRelativeIndex = (index: number) => {
    const length = items.length || 5; // Fallback length para skeleton
    let delta = (index - currentIndex + length) % length;
    if (delta > length / 2) delta -= length;
    return delta;
  };

  // --- RENDERIZADO ---

  // Si está cargando, usamos "Datos Falsos" para mantener el diseño (SKELETON)
  const displayItems = loading 
    ? Array(5).fill({ id: 0, title: "", coverImage: "", backgroundHero: "", tags: [], description: "", type: "" }) 
    : items;

  if (!loading && items.length === 0) return null;

  return (
    <div className="relative w-full h-[870px] sm:h-[900px] lg:h-[610px] overflow-hidden bg-[#121212] text-white" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0 bg-[#121212]">
        <AnimatePresence initial={false} mode="popLayout">
          {!loading && activeItem && (
            <motion.div key={activeItem.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }} className="absolute inset-0">
              <img src={activeItem.backgroundHero} alt="bg" className="w-full h-full object-cover grayscale-[0.95] brightness-[0.45] contrast-[1.2] blur-sm" />
              <div className="absolute inset-0 bg-neutral-800/10 mix-blend-color" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/30 to-transparent hidden lg:block" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(18,18,18,0.8)_100%)]" />
              <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="container mx-auto h-full flex flex-col justify-start lg:flex-row lg:justify-between items-center relative z-10 px-6 lg:pl-20 pt-20 lg:pt-0 gap-0 lg:gap-8">

        {/* INFO IZQUIERDA (SKELETON O REAL) */}
        <div className="w-full lg:w-[45%] flex flex-col justify-start lg:justify-center items-center lg:items-start space-y-5 pt-0 lg:pt-[72px] -mt-5 lg:mt-0 order-2 lg:order-1 relative z-30">
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
                    <div className="bg-[#FF4D88] w-fit text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-widest transform -skew-x-12">
                      {activeItem?.type}
                    </div>
                    {activeItem?.isNew && (
                      <div className="flex items-center gap-1 bg-white text-black px-2 py-1 text-[10px] font-black uppercase tracking-widest transform -skew-x-12">
                        <Sparkles size={10} fill="currentColor" /> NUEVO
                      </div>
                    )}
                    {(activeItem?.totalViews ?? 0) > 0 && (
                      <div className="flex items-center gap-1 bg-white/10 border border-white/20 text-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transform -skew-x-12">
                        <Eye size={10} /> {formatViews(activeItem!.totalViews)}
                      </div>
                    )}
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-[30px] font-[1000] italic uppercase tracking-tighter leading-[0.9] text-white text-center lg:text-left drop-shadow-lg line-clamp-2">
                    {activeItem?.title}
                  </h1>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-stretch max-w-2xl w-full">
                <div className="w-1 bg-[#FF4D88] shrink-0 z-10 hidden lg:block" />
                <div className="relative flex-grow bg-white/[0.03] backdrop-blur-md border border-white/5 lg:border-l-0 py-4 px-6 min-h-[110px] flex items-center rounded-lg lg:rounded-none">
                  <AnimatePresence mode="wait">
                    <motion.p key={activeItem?.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="text-white text-[14px] lg:text-[16px] font-medium leading-relaxed text-justify line-clamp-5">
                      {activeItem?.description}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeItem?.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-6 w-full flex flex-col items-center lg:items-start">
                  <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start w-full px-4 lg:px-0">
                    {activeItem?.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] font-bold uppercase tracking-wide text-white bg-black/60 border border-neutral-600 px-2 py-1 rounded-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                    <button onClick={() => activeItem && navigate(`/manga/${activeItem.id}`)} className="h-[45px] bg-white -skew-x-[20deg] px-4 flex items-center hover:bg-neutral-200 border-2 border-white transition-all active:scale-95">
                      <div className="skew-x-[20deg] flex items-center gap-2 font-black uppercase tracking-widest text-xs text-black">
                        <Play size={16} fill="currentColor" /> Leer Ahora
                      </div>
                    </button>
                    <button onClick={handleBookmark} className={`h-[45px] -skew-x-[20deg] px-4 flex items-center border-2 transition-all active:scale-95 ${isBookmarked ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/20 text-white/80 hover:bg-white/5 hover:text-white'}`}>
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
        <div className="w-full lg:w-[50%] h-[400px] sm:h-[450px] lg:h-[500px] relative flex items-center justify-center order-1 lg:order-2" style={{ perspective: '1200px' }}>
          <div className="relative w-full h-full flex items-center justify-center mt-4 lg:mt-32 lg:translate-x-10 scale-[0.77] lg:scale-90" style={{ transformStyle: 'preserve-3d' }}>
            {displayItems.map((item, index) => {
              const relativeIndex = getRelativeIndex(index);
              const isCenter = relativeIndex === 0;
              const isVisible = Math.abs(relativeIndex) <= 1;
              const angle = relativeIndex * 35;
              const xOffset = Math.sin(angle * Math.PI / 180) * 120;
              const yOffset = isCenter ? -11.5 : Math.abs(Math.cos(angle * Math.PI / 180)) * -15;
              const zIndex = isVisible ? 50 - Math.abs(relativeIndex) : -10;
              const opacity = isVisible ? 1 : 0;

              return (
                <motion.div key={loading ? index : item.id} className="absolute top-[50%] left-1/2 w-[185px] h-[275px] sm:w-[200px] sm:h-[300px] lg:w-[250px] lg:h-[350px] cursor-pointer" style={{ transformStyle: 'preserve-3d' }} 
                  animate={{ x: `calc(-50% + ${xOffset}%)`, y: `calc(-50% + ${yOffset}%)`, scale: isCenter ? 1.11 : 1.02, opacity, zIndex, rotateY: relativeIndex * -35 }} 
                  transition={{ duration: 0.6 }} onClick={() => !loading && setCurrentIndex(index)}>
                  <div className={`relative w-full h-full rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-2 ${loading ? 'border-white/10 bg-white/5 animate-pulse' : 'border-white/40'}`}>
                    {loading ? (
                        // SKELETON CARD
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                        </div>
                    ) : (
                        // REAL CARD
                        <>
                            <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute bottom-4 left-4">
                                <span className="px-2 py-1 bg-[#FF4D88] text-[10px] font-black rounded uppercase shadow-md">{item.type}</span>
                            </div>
                        </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* PUNTOS DE NAVEGACION */}
      {!loading && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {items.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`h-1.5 transition-all duration-500 transform -skew-x-12 ${i === currentIndex ? "w-10 bg-[#FF4D88] border border-white" : "w-4 bg-neutral-700 hover:bg-neutral-500"}`} />
            ))}
        </div>
      )}
    </div>
  );
}