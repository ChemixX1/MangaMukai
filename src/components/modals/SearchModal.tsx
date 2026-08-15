import { useState, useEffect, useRef } from "react";
import { X, Search, CalendarDays, Flame, ChevronRight, Zap, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNewReleases, searchMangas } from '../../services/mangaService';
import type { MangaCapitulo } from '../../types/manga';
import { useTheme } from '../../hooks/useTheme';

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
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Cargar novedades recientes al abrir
  useEffect(() => {
    getNewReleases()
      .then((mangas) => {
        const latestFour = [...mangas]
          .sort((a, b) => Date.parse(b.rawFecha || '') - Date.parse(a.rawFecha || ''))
          .slice(0, 4);
        setRecentMangas(latestFour);
      })
      .catch(() => setRecentMangas([]));
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

  const hasSearchQuery = query.trim().length > 1;
  const displayList = hasSearchQuery ? results : recentMangas.slice(0, 4);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className={`absolute inset-0 backdrop-blur-md ${isLight ? 'bg-white/45' : 'bg-black/65'}`} onClick={onClose}></div>

      <div role="dialog" aria-modal="true" aria-label="Buscador de mangas" data-testid="search-modal-panel" className={`search-modal-panel relative flex h-[min(460px,calc(100dvh-2rem))] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${isLight ? 'border-zinc-200 bg-white text-zinc-950' : 'border-white/10 bg-black text-white'}`}>

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
              className={`h-12 w-full bg-transparent pl-10 pr-10 text-xl font-[900] italic uppercase tracking-tight focus:outline-none sm:text-2xl ${isLight ? 'text-zinc-950 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-700'}`}
            />
            <button type="button" onClick={onClose} aria-label="Cerrar buscador" className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-full border p-1.5 transition-all ${isLight ? 'border-zinc-200 bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-black' : 'border-white/5 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <X size={16} />
            </button>
          </div>
          <div className={`absolute bottom-4 left-6 right-6 h-px bg-gradient-to-r from-transparent to-transparent ${isLight ? 'via-zinc-300' : 'via-white/10'}`}></div>
        </form>

        {/* RESULTADOS */}
        <div data-testid="search-modal-results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pt-0 [scrollbar-gutter:stable]">
          {loading ? (
            <div className="flex h-full min-h-40 flex-col items-center justify-center text-zinc-500">
              <div className="relative">
                <div className={`h-10 w-10 rounded-full border-4 ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}></div>
                <div className="absolute top-0 left-0 w-10 h-10 border-4 border-[#FF4D88] border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 opacity-80">
                {!hasSearchQuery && <Flame size={14} className="text-orange-500" />}
                <span className={`text-xs font-[800] uppercase tracking-widest ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {hasSearchQuery ? "Resultados encontrados" : "Novedades recientes"}
                </span>
              </div>

              {displayList.length > 0 ? (
                <div className="grid auto-rows-min grid-cols-1 gap-3 md:grid-cols-2">
                  {displayList.map((manga) => (
                    <button
                      key={manga.id}
                      onClick={() => goToManga(manga.id)}
                      className={`group relative flex min-h-[96px] items-center gap-3 overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-300 ${isLight ? 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white' : 'border-white/5 bg-zinc-900/40 hover:border-white/10 hover:bg-white/5'}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r from-[#FF4D88]/0 transition-all duration-500 ${isLight ? 'to-[#FF4D88]/[0.03] group-hover:to-[#FF4D88]/[0.07]' : 'to-[#FF4D88]/5 group-hover:to-[#FF4D88]/10'}`}></div>

                      <div className="relative flex-shrink-0 w-[50px] h-[75px] rounded overflow-hidden shadow-lg group-hover:scale-105 transition-all duration-500">
                        <img src={manga.portada || "https://placehold.co/100x150"} alt={manga.titulo} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col gap-1 z-10">
                        <h4 className={`w-full truncate text-sm font-[800] uppercase italic tracking-tight transition-colors group-hover:text-[#FF4D88] ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                          {manga.titulo}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${isLight ? 'bg-pink-50 text-pink-700' : 'bg-pink-500/20 text-pink-400'}`}>
                            {manga.tipo}
                          </span>
                          <div className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold ${isLight ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-yellow-500/10 bg-yellow-500/10 text-yellow-400'}`}>
                            <Zap size={10} fill="currentColor" />
                            {manga.esGratis ? 'Gratis' : 'Pago'}
                          </div>
                        </div>
                        <div className={`search-release-date mt-1 flex w-fit items-center gap-1.5 rounded-md border border-[#FF4D88]/30 bg-[#FF4D88]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                          <CalendarDays size={13} className="shrink-0 text-[#FF4D88]" strokeWidth={2.4} />
                          <span className="truncate">Subido {manga.fecha}</span>
                        </div>
                      </div>

                      <ChevronRight size={16} className={`transition-all duration-300 group-hover:translate-x-1 ${isLight ? 'text-zinc-300 group-hover:text-zinc-800' : 'text-zinc-800 group-hover:text-white'}`} />
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
        <div className={`flex-shrink-0 border-t p-4 ${isLight ? 'border-zinc-200 bg-zinc-50' : 'border-white/5 bg-[#050505]'}`}>
          <button
            type="button"
            onClick={handleAdvancedSearch}
            className={`group flex w-full items-center justify-center gap-2 rounded-lg border py-3 transition-all duration-300 ${isLight ? 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white' : 'border-white/10 bg-[#111] text-white hover:border-white hover:bg-white hover:text-black'}`}
          >
            <span className="text-xs font-[900] uppercase tracking-[0.15em]">
              {hasSearchQuery ? "Ver todos los resultados" : "Ver Catálogo Completo"}
            </span>
            <LayoutGrid size={16} className="transition-transform group-hover:scale-110" />
          </button>
        </div>

      </div>
    </div>
  );
};
