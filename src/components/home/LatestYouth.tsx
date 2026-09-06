import { useState, useEffect } from "react";
import { Grid, Zap, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useHomeData } from '../../context/HomeDataContext';
import { MangaMetaBar, PaginationControls } from '../common';
import { useChapterAccess } from '../../hooks/useChapterAccess';
import { filterYouthMen } from '../../utils/youthFilter';

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

/**
 * Los listados marcan las series que aún no tienen capítulos con una fila vacía
 * (`numero: "-"`, id 0). Esa fila no puede abrir el lector: lleva a la ficha.
 */
const isPublishedChapter = (chapter: { id: number; numero: string }) =>
  Number(chapter.numero) > 0 && Number(chapter.id) > 0;

// Función para colores según tipo (Mantenemos la misma lógica)
const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('manhwa')) return "bg-purple-600";
    if (t.includes('manhua')) return "bg-green-600";
    if (t.includes('novel')) return "bg-blue-600";
    return "bg-[#00C2FF]"; // Azul por defecto para hombres
};

interface LatestMangaItem {
  id: string | number;
  seriesId: string | number | null;
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

export const YouthLatest = () => {
  const { latestMen, isReady } = useHomeData();
  const [items, setItems] = useState<LatestMangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { openChapter, chapterAccessModal } = useChapterAccess();

  useEffect(() => {
    if (!isReady) return;
    setItems(filterYouthMen(latestMen).map(manga => ({
      id: manga.id,
      seriesId: manga.eroSeri || manga.id,
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
    })));
    setLoading(false);
  }, [isReady, latestMen]);

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
    <section className="home-youth-latest relative w-full pb-10 z-20">
       <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-card { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
        
        /* Efecto Shine Azul */
        .shine-effect::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 50%;
            height: 100%;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.24), transparent);
            transform: skewX(-25deg);
            transition: 0.5s;
            pointer-events: none;
        }
        .group:hover .shine-effect::after {
            left: 150%;
            transition: 0.7s;
        }
      `}</style>

      {/* Fondo degradado azul sutil */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#00C2FF]/10 via-[#00C2FF]/5 to-transparent pointer-events-none"></div>

      <div id="latest-youth-grid" className="desktop-content-shell w-full max-w-[1600px] scroll-mt-24 mx-auto px-4 md:px-6 lg:px-12 pt-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
             <h2 className="home-theme-title text-xl md:text-2xl lg:text-4xl font-[900] text-white uppercase italic tracking-tighter flex items-center gap-2 md:gap-3">
                 <span className="text-[#00C2FF] drop-shadow-[0_0_10px_rgba(0,194,255,0.5)]">
                    <Zap className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
                 </span>
                 ÚLTIMAS <span className="text-[#00C2FF]">ACTUALIZACIONES</span>
             </h2>
             <Link to="/biblioteca?audience=hombre" className="home-theme-surface home-theme-title hidden md:flex items-center gap-2 px-6 py-2 rounded bg-[#1a1a1a] text-white font-bold uppercase text-sm hover:text-[#00C2FF] transition-colors border border-transparent hover:border-[#00C2FF]">
                 <Grid size={18} /> VER TODO
             </Link>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-8 md:gap-x-4 md:gap-y-10">
            {pageItems.map((manga, index) => (
              <div 
                key={`${currentPage}-${manga.id}-${index}`}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`manga-update-card home-theme-surface w-full self-start group relative flex flex-col overflow-hidden rounded-xl bg-[#0f1115] ring-1 ring-white/10 shadow-lg transition-all duration-300 hover:-translate-y-2 ${isVisible ? 'animate-card' : 'opacity-0'}`}
              >
                  {/* PORTADA */}
                  <div className="relative aspect-[3/4.4] overflow-hidden bg-[#0f1115] shine-effect">
                    <Link to={`/manga/${manga.id}`} className="block w-full h-full">
                        <img 
                        src={manga.coverImage} 
                        alt={`Portada del manga ${manga.title}`}
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
                    <h3 className="manga-update-title home-theme-title flex h-12 md:h-[52px] w-full flex-none items-center justify-center px-3 py-1.5 text-[13px] md:text-[15px] font-[800] text-white leading-[1.15] uppercase tracking-tight group-hover:text-[#00C2FF] transition-colors font-sans">
                      <span className="line-clamp-2">{manga.title}</span>
                    </h3>

                    {/* LISTA DE CAPÍTULOS — cada fila abre su capítulo en el
                        lector; sin capítulo publicado lleva a la ficha. */}
                    <div className="manga-update-rows w-full">
                        {Array.from({ length: 2 }, (_, slotIndex) => {
                          const cap = manga.chapters[slotIndex];

                          if (!cap) return (
                              <Link
                                key={`empty-update-${slotIndex}`}
                                to={`/manga/${manga.id}`}
                                aria-label={`Ver ${manga.title}`}
                                className="home-card-slot-link home-card-slot-row home-theme-surface-alt block min-h-9 border-t border-white/5 bg-[#1a1a1a]"
                              />
                          );

                          if (!isPublishedChapter(cap)) return (
                              <Link
                                key={`upcoming-update-${slotIndex}`}
                                to={`/manga/${manga.id}`}
                                className="home-card-slot-link block"
                              >
                                  <MangaMetaBar
                                    chapter={cap.numero}
                                    isFree={cap.isFree}
                                    date={cap.dateLabel}
                                    accentClassName="text-[#00C2FF]"
                                    accentAll
                                  />
                              </Link>
                          );

                          return (
                              <Link
                                  key={cap.id}
                                  to={`/read/${cap.id}`}
                                  onClick={(event) => {
                                    if (cap.isFree) return;
                                    event.preventDefault();
                                    void openChapter({ chapterId: cap.id, seriesId: manga.seriesId, isFree: cap.isFree, chapterNumber: cap.numero });
                                  }}
                                  className="home-card-slot-link block"
                              >
                                  <MangaMetaBar
                                    chapter={cap.numero}
                                    isFree={cap.isFree}
                                    date={cap.dateLabel}
                                    accentClassName="text-[#00C2FF]"
                                    accentAll
                                  />
                              </Link>
                          );
                        })}
                    </div>
                  </div>
              </div>
            ))}
        </div>
        {chapterAccessModal}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          accent="blue"
          scrollTargetId="latest-youth-grid"
        />
      </div>
    </section>
  );
};
