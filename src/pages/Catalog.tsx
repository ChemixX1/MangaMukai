import { useState, useEffect } from "react";
import { Search, X, BookOpen, Star, Tag, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Footer } from "../components/layout";
import { MangaMetaBar } from "../components/common";
import { getUltimosCapitulos } from "../services/mangaService";
import type { MangaCapitulo } from "../types/manga";

const catalogStyles = `
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #000; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #FF4D88; }
`;

export const Catalog = () => {
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = catalogStyles;
    document.head.appendChild(styleSheet);
    return () => { document.head.removeChild(styleSheet); };
  }, []);

  const [allItems, setAllItems] = useState<MangaCapitulo[]>([]);
  const [items, setItems] = useState<MangaCapitulo[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Manejar navegación desde Home y SearchModal
  useEffect(() => {
    if (location.state?.searchTerm) setSearchTerm(location.state.searchTerm);
    if (location.state?.filterCategory) setSelectedTag(location.state.filterCategory);
    window.history.replaceState({}, document.title);
  }, [location]);

  // Cargar mangas desde WordPress
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await getUltimosCapitulos();
      setAllItems(data);

      // Extraer tags únicos de los géneros disponibles
      const tagsSet = new Set<string>();
      data.forEach((m) => {
        (m.genres as unknown as string[]).forEach((g) => { if (g) tagsSet.add(g); });
        if (m.tipo) tagsSet.add(m.tipo);
        if (m.genero) tagsSet.add(m.genero);
      });
      setAvailableTags(Array.from(tagsSet).sort());
      setLoading(false);
    };
    fetch();
  }, []);

  // Filtrar en cliente
  useEffect(() => {
    let filtered = allItems;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((m) => m.titulo.toLowerCase().includes(q));
    }

    if (selectedTag) {
      filtered = filtered.filter((m) => {
        const generos = m.genres as unknown as string[];
        return generos.includes(selectedTag) || m.tipo === selectedTag;
      });
    }

    setItems(filtered);
  }, [allItems, searchTerm, selectedTag]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTag(null);
  };

  // Hombre y Mujer siempre primeros en el listado de filtros
  const sortedTags = [
    ...['Hombre', 'Mujer'].filter(g => availableTags.includes(g)),
    ...availableTags.filter(t => t !== 'Hombre' && t !== 'Mujer'),
  ];
  const displayedTags = showAllTags ? sortedTags : sortedTags.slice(0, 15);
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen bg-black font-sans flex flex-col relative overflow-hidden text-gray-100">

      <div className="relative z-10 flex flex-col flex-grow">

        <div id="catalog-anchor" className="pt-28 pb-6 px-6 lg:px-12 text-center relative z-20 translate-x-0 md:translate-x-32 scroll-mt-24">
          <h1 className="text-4xl md:text-6xl font-[900] italic uppercase tracking-tighter text-white drop-shadow-lg mb-2">
            CATÁLOGO <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">MUKAI</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono">{items.length} TÍTULOS DISPONIBLES</p>
        </div>

        <div className="flex-grow w-full max-w-[1600px] mx-auto px-6 lg:px-12 pb-12 flex flex-col lg:flex-row gap-8">

          {/* SIDEBAR */}
          <aside className="w-full lg:w-[280px] flex-shrink-0 space-y-6">

            {/* RELOJ */}
            <div className="hidden lg:block bg-gradient-to-br from-[#0f1115] to-[#050505] border border-white/10 rounded-xl p-4 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 blur-3xl -z-0"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-blue-900/20 p-2.5 rounded-lg border border-blue-500/20">
                  <Clock className="text-blue-400 animate-pulse" size={20} />
                </div>
                <span className="text-2xl font-mono font-bold text-white tracking-widest leading-none">
                  {formattedTime}
                </span>
              </div>
            </div>

            {/* Buscador */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-1 shadow-lg">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Buscar manga..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-sm focus:outline-none text-white placeholder:text-zinc-600 font-medium"
                />
              </div>
            </div>

            {/* Filtro por Tipo/Género */}
            {availableTags.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Tag size={14} />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Filtros</h4>
                </div>
                <div className="flex flex-wrap gap-2 w-full content-start">
                  {displayedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`flex-grow text-center px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all ${
                        selectedTag === tag
                          ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                          : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {sortedTags.length > 15 && (
                    <button
                      onClick={() => setShowAllTags(!showAllTags)}
                      className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-white py-2 transition-colors mt-1"
                    >
                      {showAllTags
                        ? <><span>Ver menos</span><ChevronUp size={12} /></>
                        : <><span>Ver más ({sortedTags.length - 15})</span><ChevronDown size={12} /></>}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Reset */}
            {(searchTerm || selectedTag) && (
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-white hover:bg-red-500/20 py-3 rounded-lg border border-red-500/20 transition-all"
              >
                <X size={12} /> Limpiar Filtros
              </button>
            )}
          </aside>

          {/* GRID */}
          <main className="flex-grow">
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-zinc-500 font-mono animate-pulse">CARGANDO DATOS...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-zinc-600 gap-4 border border-white/5 rounded-2xl bg-black/20">
                <BookOpen size={48} className="opacity-20" />
                <p className="font-mono text-xs uppercase tracking-widest">No se encontraron resultados</p>
                <button onClick={clearFilters} className="text-blue-500 hover:text-blue-400 text-xs underline">Limpiar búsqueda</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {items.map((manga) => {
                  const chapter = manga.capitulosRecientes[0];
                  return (
                  <Link to={`/manga/${manga.id}`} key={manga.id} className="group relative flex flex-col overflow-hidden rounded-lg bg-[#0f1115] ring-1 ring-white/10">
                    <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-[#111] shadow-2xl transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-blue-900/20">
                      <img
                        src={manga.portada}
                        alt={manga.titulo}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(manga.genres as unknown as string[]).slice(0, 2).map((g) => (
                            <span key={g} className="text-[8px] text-white px-1.5 py-0.5 rounded font-bold uppercase bg-blue-600">{g}</span>
                          ))}
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-white border border-white/10">
                        <Star size={10} className="text-yellow-400 fill-yellow-400" />
                        <span>{manga.tipo}</span>
                      </div>
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {manga.genero === 'Mujer' && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-pink-600/80 text-white leading-tight">♀</span>
                        )}
                        {manga.genero === 'Hombre' && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-700/80 text-white leading-tight">♂</span>
                        )}
                      </div>
                    </div>
                    <div className="flex h-[3rem] items-center justify-center px-3">
                      <h3 className="line-clamp-2 text-center text-xs font-[800] uppercase leading-tight tracking-tight text-gray-200 transition-colors group-hover:text-blue-400 md:text-sm">
                        {manga.titulo}
                      </h3>
                    </div>
                    <MangaMetaBar
                      chapter={chapter?.numero ?? manga.capitulosRecientes.length}
                      isFree={chapter?.esGratis ?? manga.esGratis}
                      date={chapter?.fecha ?? manga.fecha}
                      accentClassName={manga.genero === 'Mujer' ? 'text-[#FF4D88]' : 'text-[#00C2FF]'}
                    />
                  </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        <Footer />
      </div>
    </div>
  );
};
