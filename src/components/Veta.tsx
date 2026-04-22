import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
// Importamos iconos para el Header (Clock, Grid) y para las Cards (Play, Zap, Hexagon, etc.)
import { Clock, Grid, ArrowUpRight, Zap, Play, Hexagon } from "lucide-react";

interface MangaItem {
  id: number | string;
  title: string;
  coverImage: string;
  backgroundHero: string;
  rating: number;
  chapters?: number;
  description?: string;
  tags?: string[];
  color?: string;
}

const ACCENT_COLORS = ["#22d3ee", "#3b82f6", "#8b5cf6", "#06b6d4", "#6366f1"]; // Tonos Azules/Cian/Violeta para combinar

export const LatestMen = () => {
  const [items, setItems] = useState<MangaItem[]>([]);
  const [activeId, setActiveId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMangas = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("mangas")
          .select("id, title, cover_url, background_hero, rating, description")
          .order('id', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formatted: MangaItem[] = data.map((m: any, idx: number) => ({
            id: m.id,
            title: m.title,
            coverImage: m.cover_url || "https://placehold.co/400x600/png?text=Manga",
            backgroundHero: m.background_hero || m.cover_url,
            rating: m.rating || 4.9,
            chapters: Math.floor(Math.random() * 200),
            description: m.description || "Un poder oculto despierta. El destino del mundo pende de un hilo mientras las sombras avanzan...",
            tags: ["Acción", "Sobrenatural"],
            color: ACCENT_COLORS[idx % ACCENT_COLORS.length]
          }));
          setItems(formatted);
          if (formatted.length > 0) setActiveId(formatted[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMangas();
  }, []);

  if (loading) return <div className="h-[500px] w-full flex items-center justify-center text-cyan-500/50 uppercase tracking-widest">Cargando Datos...</div>;
  if (items.length === 0) return null;

  return (
    <section className="relative w-full py-10 overflow-hidden bg-black/50 z-20">
        
        {/* === 1. BACKGROUND GLOW (AZUL GALAXIA) === */}
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-blue-900/30 via-violet-900/10 to-transparent pointer-events-none"></div>

        {/* === 2. HEADER GALÁCTICO === */}
        <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-12 mb-8 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                
                {/* Título Estilo Galaxia */}
                <div className="flex items-center gap-3 border-l-4 border-cyan-500 pl-4">
                    <h2 className="text-1xl md:text-3xl lg:text-4xl font-[900] text-white uppercase italic tracking-tighter flex flex-wrap items-center gap-3">
                        <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
                            <Clock size={32} strokeWidth={3} />
                        </span>
                        Últimas Actualizaciones mangas juveniles para hombre
                    </h2>
                </div>

                {/* Botón Ver Todo */}
                <div className="flex items-center gap-4">
                    <Link 
                        to="/latest-men" 
                        className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded bg-[#0a0a0a] text-white font-bold uppercase tracking-wide text-sm border border-white/5 hover:border-cyan-500 hover:text-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-200"
                    >
                        <Grid size={18} />
                        <span>Ver Todo</span>
                    </Link>
                </div>
            </div>
        </div>

        {/* === 3. EL CAROUSEL CINEMÁTICO (ACCORDION) === */}
        <div className="w-full h-[600px] flex px-2 lg:px-0">
            {items.map((item) => {
                const isActive = activeId === item.id;
                
                return (
                    <motion.div
                        key={item.id}
                        layout
                        onClick={() => setActiveId(item.id)}
                        onMouseEnter={() => setActiveId(item.id)}
                        className={`
                            relative h-full
                            cursor-pointer
                            overflow-hidden
                            transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                            ${isActive ? 'flex-[12]' : 'flex-[1] grayscale brightness-50 hover:brightness-75'}
                            border-r border-cyan-900/30 last:border-r-0
                        `}
                    >
                        {/* A. IMAGEN DE FONDO */}
                        <motion.div 
                            className="absolute inset-0 w-full h-full"
                            animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                            transition={{ duration: 10, ease: "linear" }}
                        >
                            <img 
                                src={item.backgroundHero} 
                                alt={item.title} 
                                className="w-full h-full object-cover object-center"
                            />
                            {/* Overlay azulado sutil */}
                            <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 transition-opacity duration-500 ${isActive ? 'opacity-80' : 'opacity-90'}`} />
                        </motion.div>

                        {/* B. ESTADO INACTIVO (Texto Vertical) */}
                        {!isActive && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                                <h3 className="text-xl font-black text-white/50 writing-vertical-rl rotate-180 uppercase tracking-widest whitespace-nowrap drop-shadow-md">
                                    {item.title.substring(0, 15)}...
                                </h3>
                                <div className="mt-4 text-cyan-500/50">
                                    <Hexagon size={18} fill="currentColor" className="opacity-50"/>
                                </div>
                            </div>
                        )}

                        {/* C. ESTADO ACTIVO (Contenido Expandido) */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                    className="absolute inset-0 z-30 p-6 md:p-12 flex flex-col justify-end items-start"
                                >
                                    {/* Número Gigante de Fondo */}
                                    <div className="absolute top-6 right-6 text-cyan-500/10 font-black text-7xl leading-none select-none pointer-events-none">
                                        0{items.indexOf(item) + 1}
                                    </div>
                                    
                                    {/* Tags */}
                                    <motion.div 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex flex-wrap gap-2 mb-3"
                                    >
                                        {item.tags?.map(tag => (
                                            <span key={tag} style={{ borderColor: item.color, color: item.color }} className="px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-black/30">
                                                {tag}
                                            </span>
                                        ))}
                                    </motion.div>

                                    {/* Título */}
                                    <motion.h2 
                                        initial={{ y: 30, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-3xl md:text-5xl font-black text-white uppercase italic leading-[0.95] mb-4 drop-shadow-2xl max-w-3xl mix-blend-screen"
                                    >
                                        {item.title}
                                    </motion.h2>

                                    {/* Descripción y Stats */}
                                    <motion.div 
                                        initial={{ y: 40, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="flex flex-col md:flex-row items-start md:items-end gap-6 w-full max-w-4xl"
                                    >
                                        <p className="text-neutral-300 text-sm md:text-base md:w-1/2 line-clamp-3 font-medium border-l-4 pl-4" style={{ borderColor: item.color }}>
                                            {item.description}
                                        </p>
                                        
                                        <div className="flex gap-6 text-white font-mono text-xs">
                                            <div className="flex flex-col">
                                                <span className="text-neutral-500 uppercase">Rating</span>
                                                <span className="text-lg font-bold flex items-center gap-1">
                                                    {item.rating} <Zap size={14} fill={item.color} color={item.color}/>
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-neutral-500 uppercase">Capítulos</span>
                                                <span className="text-lg font-bold">{item.chapters}</span>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Botón de Acción */}
                                    <motion.div 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.6 }}
                                        className="mt-8"
                                    >
                                        <Link to={`/manga/${item.id}`}>
                                            <button 
                                                className="group relative px-8 py-3 bg-white text-black font-black uppercase text-base tracking-widest overflow-hidden transition-all hover:pr-12"
                                            >
                                                <span className="relative z-10 flex items-center gap-2">
                                                    Leer Ahora <Play size={16} fill="black" />
                                                </span>
                                                <div 
                                                    className="absolute inset-0 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0"
                                                    style={{ backgroundColor: item.color || '#22d3ee' }}
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                                                    <ArrowUpRight size={20} color="white" />
                                                </div>
                                            </button>
                                        </Link>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Línea lateral de selección */}
                        {isActive && (
                            <div 
                                className="absolute top-0 bottom-0 left-0 w-1 z-40 shadow-[0_0_20px_currentColor]"
                                style={{ backgroundColor: item.color, color: item.color }}
                            />
                        )}
                    </motion.div>
                );
            })}
        </div>
    </section>
  );
};