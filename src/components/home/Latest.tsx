import { useState, useEffect } from "react";
import { Grid, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useHomeData } from '../../context/HomeDataContext';
import { MangaMetaBar, PaginationControls } from '../common';

const ITEMS_PER_PAGE = 18;

// Función auxiliar para calcular "hace X días"
const timeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    if (!dateString || Number.isNaN(past.getTime())) return "—";
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays <= 2) return "New"; 
    return `${diffDays}d`;
};

// Función para colores según tipo
const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('manhwa')) return "bg-purple-600";
    if (t.includes('manhua')) return "bg-green-600";
    if (t.includes('novel')) return "bg-blue-600";
    return "bg-[#FF4D88]"; // Manga por defecto (Rosa)
};

interface LatestMangaItem {
  id: string | number;
  title: string;
  coverImage: string;
  type: string;
  rating?: number;
  chapters: Array<{
      id: number;
      numero: string;
      isFree: boolean;
      dateLabel: string;
  }>;
}

export const Latest = () => {
  const { latestWomen, isReady } = useHomeData();
  const [items, setItems] = useState<LatestMangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isReady) return;

    const mapToItems = (mangas: typeof latestWomen) =>
      mangas.map(manga => ({
        id: manga.id,
        title: manga.titulo,
        coverImage: manga.portada,
        type: manga.tipo,
        rating: 10,
        chapters: manga.capitulosRecientes.map(c => ({
          id: c.id,
          numero: c.numero,
          isFree: c.esGratis,
          dateLabel: timeAgo(c.fecha),
        })),
      }));

    setItems(mapToItems(latestWomen));
    setLoading(false);
  }, [isReady, latestWomen]);

  useEffect(() => {
    if (loading || items.length === 0) {
      setIsVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setIsVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, [loading, items]);

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const pageItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  if (loading) return null;

  return (
    <section className="home-latest relative w-full pb-10 z-20">
       <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-card { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
        
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
        }
        .group:hover .shine-effect::after {
            left: 150%;
            transition: 0.7s;
        }
      `}</style>

      {/* 🌸 FONDO DEGRADADO ROSA (Igual al azul pero en rosa) */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#FF4D88]/10 via-[#FF4D88]/5 to-transparent pointer-events-none"></div>

      <div id="latest-women-grid" className="desktop-content-shell w-full max-w-[1600px] scroll-mt-24 mx-auto px-4 md:px-6 lg:px-12 pt-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
             <h2 className="home-theme-title text-xl md:text-2xl lg:text-4xl font-[900] text-white uppercase italic tracking-tighter flex items-center gap-2 md:gap-3">
                 <span className="text-[#FF4D88] drop-shadow-[0_0_10px_rgba(255,77,136,0.5)]">
                    <Clock className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
                 </span>
                 ÚLTIMAS <span className="text-[#FF4D88]">ACTUALIZACIONES</span>
             </h2>
             <Link to="/biblioteca?audience=mujer" className="home-theme-surface home-theme-title hidden md:flex items-center gap-2 px-6 py-2 rounded bg-[#1a1a1a] text-white font-bold uppercase text-sm hover:text-[#FF4D88] transition-colors border border-transparent hover:border-[#FF4D88]">
                 <Grid size={18} /> VER TODO
             </Link>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-8 md:gap-x-4 md:gap-y-10">
            {pageItems.map((manga, index) => (
              <div 
                key={`${currentPage}-${manga.id}-${index}`}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`manga-update-card home-theme-surface w-full self-start group relative flex flex-col overflow-hidden rounded-xl bg-[#0f1115] ring-1 ring-white/10 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#FF4D88]/20 ${isVisible ? 'animate-card' : 'opacity-0'}`}
              >
                  {/* PORTADA */}
                  <div className="relative aspect-[3/4.4] overflow-hidden bg-[#0f1115] shine-effect">
                    <Link to={`/manga/${manga.id}`} className="block w-full h-full">
                        <img 
                        src={manga.coverImage} 
                        alt={manga.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        />
                        {/* ETIQUETA TIPO (IZQUIERDA) + RATING (DERECHA) */}
                        <div className={`absolute bottom-2 left-2 ${getTypeColor(manga.type)} rounded-sm px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm md:px-2 md:text-[9px]`}>
                            {manga.type}
                        </div>
                        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-sm bg-yellow-500 px-1.5 py-0.5 text-[8px] font-black text-black shadow-sm md:text-[9px]">
                            <Star size={10} fill="currentColor" strokeWidth={0} />
                            <span>{manga.rating}</span>
                        </div>
                    </Link>
                  </div>

                  {/* INFO */}
                  <div className="flex flex-col items-center text-center"> 
                    <h3 className="manga-update-title home-theme-title flex h-14 w-full flex-none items-center justify-center px-3 py-2 text-[13px] md:text-[15px] font-[800] text-white leading-tight uppercase tracking-tight group-hover:text-[#FF4D88] transition-colors font-sans">
                      <span className="line-clamp-2">{manga.title}</span>
                    </h3>

                    {/* LISTA DE CAPÍTULOS */}
                    <div className="manga-update-rows w-full">
                        {Array.from({ length: 2 }, (_, slotIndex) => {
                          const cap = manga.chapters[slotIndex];
                          return cap ? (
                              <Link
                                  key={cap.id}
                                  to={`/read/${cap.id}`}
                                  className="group/cap block transition-colors"
                              >
                                  <MangaMetaBar
                                    chapter={cap.numero}
                                    isFree={cap.isFree}
                                    date={cap.dateLabel}
                                    className="group-hover/cap:bg-[#222]"
                                  />
                              </Link>
                          ) : (
                              <div
                                key={`empty-update-${slotIndex}`}
                                aria-hidden="true"
                                className="home-card-slot-row home-theme-surface-alt min-h-9 border-t border-white/5 bg-[#1a1a1a]"
                              />
                          );
                        })}
                    </div>
                  </div>
              </div>
            ))}
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          accent="pink"
          scrollTargetId="latest-women-grid"
        />
      </div>
    </section>
  );
};
