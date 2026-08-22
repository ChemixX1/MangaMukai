import { useState, useEffect } from "react";

import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Trash2, BookOpen, Ghost, ArrowRight } from "lucide-react";
import { Footer } from "../components/layout";
import { useTheme } from "../hooks/useTheme";
import { getInteractions, toggleBookmark } from "../services/interactionsService";
import { getMangaById } from "../services/mangaService";
import { getStoredUser } from "../services/authService";
import type { MMUser } from "../services/authService";
import { finishGlobalLoading, startGlobalLoading } from "../utils/globalLoading";

// Interfaces
interface SavedItem {
  id: string; // manga_id
  mangas: {
    id: string;
    title: string;
    cover_url: string;
    rating: number;
    status: string;
    chapter_count: number;
    target_audience: string;
  };
}

export const SavedMangas = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MMUser | null>(null);

  // 1. Cargar Usuario y Favoritos
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      startGlobalLoading(12);
      setLoading(true);
      try {
        const currentUser = getStoredUser();
        if (!active) return;
        setUser(currentUser);

        if (currentUser) {
          const interactions = await getInteractions();
          const mangas = await Promise.all((interactions?.bookmarks || []).map((id) => getMangaById(id)));
          if (!active) return;
          const items: SavedItem[] = mangas.filter(Boolean).map((manga) => ({
            id: String(manga!.id),
            mangas: {
              id: String(manga!.id),
              title: manga!.titulo,
              cover_url: manga!.portada,
              rating: 5,
              status: manga!.tipo,
              chapter_count: manga!.capitulosRecientes.length,
              target_audience: (manga!.genres || []).some((genre) => String(genre).includes('Manhwa')) ? 'Hombre' : 'Mujer',
            },
          }));
          setSavedItems(items);
        }
      } catch (error) {
        console.error('No se pudieron cargar los mangas guardados:', error);
        if (active) setSavedItems([]);
      } finally {
        if (active) setLoading(false);
        finishGlobalLoading();
      }
    };

    void fetchData();
    return () => {
      active = false;
      finishGlobalLoading();
    };
  }, []);

  // 2. Función para eliminar de guardados
  const handleRemove = async (bookmarkId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Optimistic Update
    setSavedItems(prev => prev.filter(item => item.id !== bookmarkId));
    await toggleBookmark(bookmarkId);
  };

  if (loading) return <main className={`min-h-screen ${isLight ? 'bg-white' : 'bg-black'}`} />;

  return (
    <div className={`flex min-h-screen flex-col font-sans selection:bg-[#FF4D88] selection:text-white ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}>
      
      {/* Fondo Decorativo */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className={`absolute left-1/2 top-0 h-[400px] w-full max-w-4xl -translate-x-1/2 rounded-full bg-[#FF4D88] blur-[120px] ${isLight ? 'opacity-[0.06]' : 'opacity-10'}`} />
         <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] ${isLight ? 'opacity-[0.05]' : 'opacity-20'}`} />
      </div>

      <div className="desktop-content-shell relative z-10 flex-grow max-w-[1400px] mx-auto w-full px-6 pt-32 pb-20">
        
        {/* HEADER */}
        <div className={`mb-12 flex flex-col items-end justify-between gap-4 border-b pb-6 md:flex-row ${isLight ? 'border-black/10' : 'border-white/10'}`}>
            <div>
                <h1 className={`mb-2 flex items-center gap-3 text-4xl font-[1000] italic uppercase tracking-tighter md:text-5xl ${isLight ? 'text-black' : 'text-white'}`}>
                    <Bookmark className="fill-[#FF4D88] text-[#FF4D88]" size={36} />
                    Tu Colección
                </h1>
                <p className={`font-mono text-sm ${isLight ? 'text-black/50' : 'text-white/45'}`}>
                    {savedItems.length} {savedItems.length === 1 ? 'MANGA GUARDADO' : 'MANGAS GUARDADOS'}
                </p>
            </div>
            
            {!user && (
                <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg text-red-400 text-xs font-bold uppercase tracking-wide">
                    Inicia sesión para ver tus guardados
                </div>
            )}
        </div>

        {/* CONTENIDO */}
        {!user ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Ghost size={64} className={`mb-4 ${isLight ? 'text-black/20' : 'text-white/20'}`} />
                <h2 className={`mb-2 text-xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>Sesión no iniciada</h2>
                <Link to="/login" className="text-[#FF4D88] hover:underline font-mono text-sm">Ir al Login</Link>
            </div>
        ) : savedItems.length === 0 ? (
            <div className={`flex flex-col items-center justify-center rounded-3xl border py-24 text-center ${isLight ? 'border-black/10 bg-zinc-50' : 'border-white/5 bg-white/[0.02]'}`}>
                <BookOpen size={64} className={`mb-6 ${isLight ? 'text-black/20' : 'text-white/20'}`} />
                <h2 className={`mb-2 text-2xl font-black uppercase italic tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>Tu biblioteca está vacía</h2>
                <p className={`mb-8 max-w-md text-sm ${isLight ? 'text-black/50' : 'text-white/45'}`}>
                    Aún no has guardado ningún manga. Explora la biblioteca y dale al botón de guardar para leerlos más tarde.
                </p>
                <Link to="/biblioteca" className={`flex items-center gap-2 rounded-xl px-8 py-3 font-black uppercase tracking-widest transition-colors ${isLight ? 'bg-black text-white hover:bg-[#FF4D88]' : 'bg-white text-black hover:bg-zinc-200'}`}>
                    Explorar Biblioteca <ArrowRight size={16} />
                </Link>
            </div>
        ) : (
            <motion.div 
                layout 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
            >
                <AnimatePresence mode="popLayout">
                    {savedItems.map((item) => {
                        const manga = item.mangas;
                        const isMujer = manga.target_audience === 'mujer';
                        const badgeColor = isMujer ? 'bg-pink-600' : 'bg-cyan-600';

                        return (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                                className="group relative"
                            >
                                <Link to={`/manga/${manga.id}`} className={`relative block aspect-[2/3] overflow-hidden rounded-xl border bg-[#111] shadow-xl transition-all duration-300 ${isLight ? 'border-black/10 hover:border-black/25' : 'border-white/5 hover:border-white/20'}`}>
                                    {/* Imagen con Fallback */}
                                    <img 
                                        src={manga.cover_url} 
                                        alt={manga.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x600/1a1a1a/666?text=Sin+Imagen';
                                        }}
                                    />
                                    
                                    {/* Overlay degradado */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>

                                    {/* Badge Género */}
                                    <div className="absolute top-2 left-2">
                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded text-white shadow-lg ${badgeColor}`}>
                                            {manga.target_audience || 'MANGA'}
                                        </span>
                                    </div>

                                    {/* Info Hover */}
                                    <div className="absolute bottom-0 left-0 w-full p-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                        <h3 className="text-xs font-black text-white uppercase italic tracking-tight line-clamp-2 leading-tight mb-1 group-hover:text-[#FF4D88] transition-colors">
                                            {manga.title}
                                        </h3>
                                        <p className="text-[10px] text-zinc-400 font-mono">
                                            {manga.chapter_count} Caps
                                        </p>
                                    </div>
                                </Link>

                                {/* Botón Eliminar */}
                                <button 
                                    onClick={(e) => handleRemove(item.id, e)}
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 backdrop-blur-md rounded-lg text-white/70 hover:text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 z-20 cursor-pointer"
                                    title="Quitar de guardados"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};
