import { useState, useEffect, useRef } from "react";
import { X, Search, Clock, Flame, ChevronRight, Sparkles, Zap, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNewReleases, searchMangas } from '../services/mangaService';
import type { MangaCapitulo } from '../types/manga';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaCapitulo[]>([]);
  const [recentMangas, setRecentMangas] = useState<MangaCapitulo[]>([]);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Cargar novedades recientes al abrir
  useEffect(() => {
    getNewReleases().then(setRecentMangas);
  }, []);

  // Focus y scroll lock
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Búsqueda con debounce via WordPress
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        const data = await searchMangas(query);
        setResults(data);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const goToManga = (id: number | string) => {
    navigate(`/manga/${id}`);
    onClose();
  };

  const handleAdvancedSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    navigate("/catalog", { state: { searchTerm: query } });
    onClose();
  };

  if (!isOpen) return null;

  const displayList = query.trim().length > 1 ? results : recentMangas;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#02040a]/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-2xl max-h-[80vh] bg-[#0a0a0a] sm:bg-[#0F1115]/95 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">

        {/* INPUT */}
        <form onSubmit={handleAdvancedSearch} className="relative flex items-center p-6 flex-shrink-0 z-10">
          <div className="relative w-full group">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#FF4D88] transition-colors">
              <Search size={24} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="¿Qué quieres leer hoy?"
              className="w-full h-12 pl-10 pr-10 bg-transparent text-xl sm:text-2xl font-[900] text-white placeholder:text-zinc-700 focus:outline-none tracking-tight italic uppercase"
            />
            <button type="button" onClick={onClose} className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-900/50 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-white/5">
              <X size={16} />
            </button>
          </div>
          <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </form>

        {/* RESULTADOS */}
        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {loading ? (
            <div className="h-40 flex flex-col items-center justify-center gap-4 text-zinc-500">
              <div className="relative">
                <div className="w-10 h-10 border-4 border-zinc-800 rounded-full"></div>
                <div className="absolute top-0 left-0 w-10 h-10 border-4 border-[#FF4D88] border-t-transparent rounded-full animate-spin"></div>
              </div>
              <span className="text-[10px] font-mono animate-pulse uppercase">Buscando...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 opacity-80">
                {query ? <Sparkles size={14} className="text-blue-400" /> : <Flame size={14} className="text-orange-500" />}
                <span className="text-xs font-[800] uppercase tracking-widest text-zinc-400">
                  {query ? "Resultados encontrados" : "Novedades recientes"}
                </span>
              </div>

              {displayList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayList.map((manga) => (
                    <button
                      key={manga.id}
                      onClick={() => goToManga(manga.id)}
                      className="group relative flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/40 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#FF4D88]/0 to-[#FF4D88]/5 group-hover:to-[#FF4D88]/10 transition-all duration-500"></div>

                      <div className="relative flex-shrink-0 w-[50px] h-[75px] rounded overflow-hidden shadow-lg group-hover:scale-105 transition-all duration-500">
                        <img src={manga.portada || "https://placehold.co/100x150"} alt={manga.titulo} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col gap-1 z-10">
                        <h4 className="text-sm font-[800] text-white uppercase italic tracking-tight truncate w-full group-hover:text-[#FF4D88] transition-colors">
                          {manga.titulo}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded text-white bg-pink-500/20 text-pink-400">
                            {manga.tipo}
                          </span>
                          <div className="flex items-center gap-1 text-[9px] text-yellow-400 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/10">
                            <Zap size={10} fill="currentColor" />
                            {manga.esGratis ? 'Gratis' : 'Pago'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-zinc-600 font-mono">
                          <Clock size={9} />
                          <span className="truncate">{manga.fecha}</span>
                        </div>
                      </div>

                      <ChevronRight size={16} className="text-zinc-800 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-zinc-600 text-sm font-bold italic">Nada por aquí...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-[#050505] border-t border-white/5">
          <button
            type="button"
            onClick={handleAdvancedSearch}
            className="w-full py-3 rounded-lg bg-[#111] hover:bg-white text-white hover:text-black border border-white/10 hover:border-white transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg"
          >
            <span className="text-xs font-[900] uppercase tracking-[0.15em]">
              {query ? "Ver todos los resultados" : "Ver Catálogo Completo"}
            </span>
            <LayoutGrid size={16} className="transition-transform group-hover:scale-110" />
          </button>
        </div>

      </div>
    </div>
  );
};
