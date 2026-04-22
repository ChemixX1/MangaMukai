import { useState, useEffect } from "react";

import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Trash2, BookOpen, Ghost, ArrowRight, Loader2 } from "lucide-react";
import { Footer } from "../components/Footer";
import { getInteractions, toggleBookmark } from "../utils/interactions";
import { getMangaById } from "../services/mangaService";
import { getStoredUser } from "../utils/auth";
import type { MMUser } from "../utils/auth";

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
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MMUser | null>(null);

  // 1. Cargar Usuario y Favoritos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const currentUser = getStoredUser();
      
      if (currentUser) {
        setUser(currentUser as any);
        
        const interactions = await getInteractions();
        if (interactions && interactions.bookmarks) {
            const items: SavedItem[] = [];
            for (const id of interactions.bookmarks) {
                const manga = await getMangaById(id);
                if (manga) {
                    items.push({
                        id: String(manga.id),
                        mangas: {
                            id: String(manga.id),
                            title: manga.titulo,
                            cover_url: manga.portada,
                            rating: 5,
                            status: manga.tipo,
                            chapter_count: manga.capitulosRecientes.length,
                            target_audience: (manga.genres || []).some(g => String(g).includes('Manhwa')) ? 'Hombre' : 'Mujer'
                        }
                    });
                }
            }
            setSavedItems(items);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // 2. Función para eliminar de guardados
  const handleRemove = async (bookmarkId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Optimistic Update
    setSavedItems(prev => prev.filter(item => item.id !== bookmarkId));
    await toggleBookmark(bookmarkId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#FF4D88] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040a] text-zinc-100 font-sans selection:bg-[#FF4D88] selection:text-white flex flex-col">
      
      {/* Fondo Decorativo */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-[#FF4D88]/10 blur-[120px] rounded-full"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      <div className="relative z-10 flex-grow max-w-[1400px] mx-auto w-full px-6 pt-32 pb-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/10 pb-6 gap-4">
            <div>
                <h1 className="text-4xl md:text-5xl font-[1000] italic uppercase tracking-tighter text-white mb-2 flex items-center gap-3">
                    <Bookmark className="fill-[#FF4D88] text-[#FF4D88]" size={36} />
                    Tu Colección
                </h1>
                <p className="text-zinc-400 font-mono text-sm">
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
                <Ghost size={64} className="text-zinc-700 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Sesión no iniciada</h2>
                <Link to="/login" className="text-[#FF4D88] hover:underline font-mono text-sm">Ir al Login</Link>
            </div>
        ) : savedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-white/5 rounded-3xl bg-white/[0.02]">
                <BookOpen size={64} className="text-zinc-700 mb-6" />
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Tu biblioteca está vacía</h2>
                <p className="text-zinc-500 max-w-md mb-8 text-sm">
                    Aún no has guardado ningún manga. Explora el catálogo y dale al botón de guardar para leerlos más tarde.
                </p>
                <Link to="/catalogo" className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2">
                    Explorar Catálogo <ArrowRight size={16} />
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
                                <Link to={`/manga/${manga.id}`} className="block relative aspect-[2/3] rounded-xl overflow-hidden bg-[#111] shadow-xl border border-white/5 hover:border-white/20 transition-all duration-300">
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