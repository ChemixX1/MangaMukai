import { useState, useEffect } from "react";
import { Grid, Zap, Flame, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { getLatestMenMangas } from '../services/mangaService';
import { useHomeData } from '../context/HomeDataContext';

// Función auxiliar para calcular "hace X días"
const timeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays <= 2) return "New"; 
    return `${diffDays}d`;
};

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

  useEffect(() => {
    if (!isReady) return;

    if (latestMen.length > 0) {
      setItems(latestMen.map(manga => ({
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
      })));
      setLoading(false);
      return;
    }

    const fetchMangas = async () => {
      setLoading(true);
      try {
        const mangasHostinger = await getLatestMenMangas();
        if (mangasHostinger.length > 0) {
          setItems(mangasHostinger.map(manga => ({
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
          })));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMangas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  useEffect(() => {
    if (!loading && items.length > 0) setTimeout(() => setIsVisible(true), 100);
  }, [loading, items]);

  if (loading) return null;

  return (
    <section className="relative w-full pb-10 z-20">
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
            background: linear-gradient(to right, transparent, rgba(0, 194, 255, 0.1), transparent); /* Azulito */
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

      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-12 pt-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
             <h2 className="text-xl md:text-2xl lg:text-4xl font-[900] text-white uppercase italic tracking-tighter flex items-center gap-2 md:gap-3">
                 <span className="text-[#00C2FF] drop-shadow-[0_0_10px_rgba(0,194,255,0.5)]">
                    <Zap className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
                 </span>
                 ÚLTIMAS <span className="text-[#00C2FF]">ACTUALIZACIONES</span>
             </h2>
             <Link to="/catalog" className="hidden md:flex items-center gap-2 px-6 py-2 rounded bg-[#1a1a1a] text-white font-bold uppercase text-sm hover:text-[#00C2FF] transition-colors border border-transparent hover:border-[#00C2FF]">
                 <Grid size={18} /> VER TODO
             </Link>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-8 md:gap-x-4 md:gap-y-10">
            {items.map((manga, index) => (
              <div 
                key={`${manga.id}-${index}`}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`w-full group relative flex flex-col ${isVisible ? 'animate-card' : 'opacity-0'}`}
              >
                  {/* PORTADA */}
                  <div className="relative aspect-[3/4.4] rounded-lg overflow-hidden mb-3 md:mb-4 bg-[#0f1115] shadow-lg group-hover:shadow-2xl group-hover:shadow-[#00C2FF]/20 transition-all duration-300 group-hover:-translate-y-2 shine-effect border border-white/5">
                    <Link to={`/manga/${manga.id}`} className="block w-full h-full">
                        <img 
                        src={manga.coverImage} 
                        alt={manga.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        />
                        
                        {/* ETIQUETA TIPO + RATING */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <div className={`${getTypeColor(manga.type)} text-white text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 rounded-sm shadow-sm uppercase tracking-wider`}>
                                {manga.type}
                            </div>
                            <div className="bg-yellow-500 text-black text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-sm shadow-sm flex items-center gap-0.5">
                                <Star size={10} fill="currentColor" strokeWidth={0} />
                                <span>{manga.rating}</span>
                            </div>
                        </div>
                    </Link>
                  </div>

                  {/* INFO */}
                  <div className="flex flex-col flex-grow items-center text-center"> 
                    <h3 className="text-[13px] md:text-[15px] font-[800] text-white leading-tight line-clamp-2 mb-2 md:mb-3 uppercase tracking-tight group-hover:text-[#00C2FF] transition-colors font-sans">
                      {manga.title}
                    </h3>

                    {/* LISTA DE CAPÍTULOS */}
                    <div className="mt-auto w-full space-y-1">
                        {manga.chapters.slice(0, 2).map((cap) => (
                            <Link 
                                key={cap.id} 
                                to={`/chapter/${cap.id}`} 
                                className="grid grid-cols-[auto_1fr_auto] gap-2 md:gap-3 items-center w-full bg-[#161616] hover:bg-[#222] px-2 md:px-3 py-1.5 md:py-2 rounded-md border border-white/5 hover:border-[#00C2FF]/30 transition-all group/cap"
                            >
                                {/* NÚMERO */}
                                <div className="flex items-center min-w-0">
                                    <span className="text-gray-200 text-[10px] md:text-[12px] font-bold group-hover/cap:text-[#00C2FF] transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                                        Ch. {cap.numero}
                                    </span>
                                </div>
                                
                                {/* ESTADO (CENTRADO) */}
                                <div className="flex items-center justify-center shrink-0">
                                    {cap.isFree ? (
                                        <div className="flex items-center gap-1">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg md:w-5 md:h-5">
                                                <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42z" fill="#10B981"/>
                                                <circle cx="6.5" cy="6.5" r="1.5" fill="#065F46"/>
                                            </svg>
                                            <span className="text-green-400 text-[9px] md:text-[10px] font-bold uppercase hidden sm:inline">Gratis</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            {/* Moneditas */}
                                            <svg width="20" height="18" viewBox="0 0 32 28" fill="none" className="drop-shadow-lg md:w-[26px] md:h-[24px]">
                                                <g><ellipse cx="9" cy="14" rx="6" ry="2.5" fill="#D97706"/><ellipse cx="9" cy="14" rx="6" ry="2.5" fill="#F59E0B"/><path d="M3 14v3c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-3" fill="#D97706"/><ellipse cx="9" cy="17" rx="6" ry="2.5" fill="#FDB022"/><ellipse cx="9" cy="17" rx="4.5" ry="1.8" fill="#FCD34D"/><ellipse cx="9" cy="17" rx="3" ry="1.2" fill="#FEF3C7"/><circle cx="9" cy="17" r="2.2" fill="none" stroke="#F59E0B" strokeWidth="0.4"/><ellipse cx="9" cy="11" rx="6" ry="2.5" fill="#D97706"/><ellipse cx="9" cy="11" rx="6" ry="2.5" fill="#F59E0B"/><path d="M3 11v3c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-3" fill="#D97706"/><ellipse cx="9" cy="14" rx="6" ry="2.5" fill="#FDB022"/><ellipse cx="9" cy="14" rx="4.5" ry="1.8" fill="#FCD34D"/><ellipse cx="9" cy="14" rx="3" ry="1.2" fill="#FEF3C7"/><circle cx="9" cy="14" r="2.2" fill="none" stroke="#F59E0B" strokeWidth="0.4"/></g>
                                                <g><ellipse cx="16" cy="16" rx="6.5" ry="2.8" fill="#D97706"/><ellipse cx="16" cy="16" rx="6.5" ry="2.8" fill="#F59E0B"/><path d="M9.5 16v3.5c0 1.55 2.91 2.8 6.5 2.8s6.5-1.25 6.5-2.8V16" fill="#D97706"/><ellipse cx="16" cy="19.5" rx="6.5" ry="2.8" fill="#FDB022"/><ellipse cx="16" cy="19.5" rx="5" ry="2" fill="#FCD34D"/><ellipse cx="16" cy="19.5" rx="3.5" ry="1.4" fill="#FEF3C7"/><circle cx="16" cy="19.5" r="2.5" fill="none" stroke="#F59E0B" strokeWidth="0.4"/><ellipse cx="16" cy="12.5" rx="6.5" ry="2.8" fill="#D97706"/><ellipse cx="16" cy="12.5" rx="6.5" ry="2.8" fill="#F59E0B"/><path d="M9.5 12.5v3.5c0 1.55 2.91 2.8 6.5 2.8s6.5-1.25 6.5-2.8v-3.5" fill="#D97706"/><ellipse cx="16" cy="16" rx="6.5" ry="2.8" fill="#FDB022"/><ellipse cx="16" cy="16" rx="5" ry="2" fill="#FCD34D"/><ellipse cx="16" cy="16" rx="3.5" ry="1.4" fill="#FEF3C7"/><circle cx="16" cy="16" r="2.5" fill="none" stroke="#F59E0B" strokeWidth="0.4"/><ellipse cx="16" cy="9" rx="6.5" ry="2.8" fill="#D97706"/><ellipse cx="16" cy="9" rx="6.5" ry="2.8" fill="#F59E0B"/><path d="M9.5 9v3.5c0 1.55 2.91 2.8 6.5 2.8s6.5-1.25 6.5-2.8V9" fill="#D97706"/><ellipse cx="16" cy="12.5" rx="6.5" ry="2.8" fill="#FDB022"/><ellipse cx="16" cy="12.5" rx="5" ry="2" fill="#FCD34D"/><ellipse cx="16" cy="12.5" rx="3.5" ry="1.4" fill="#FEF3C7"/><circle cx="16" cy="12.5" r="2.5" fill="none" stroke="#F59E0B" strokeWidth="0.4"/></g>
                                                <g><ellipse cx="25" cy="16" rx="7" ry="3" fill="#D97706"/><ellipse cx="25" cy="16" rx="7" ry="3" fill="#F59E0B"/><path d="M18 16v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4" fill="#D97706"/><ellipse cx="25" cy="20" rx="7" ry="3" fill="#FDB022"/><ellipse cx="25" cy="20" rx="5.5" ry="2.2" fill="#FCD34D"/><ellipse cx="25" cy="20" rx="4" ry="1.6" fill="#FEF3C7"/><circle cx="25" cy="20" r="3" fill="none" stroke="#F59E0B" strokeWidth="0.5"/><circle cx="25" cy="20" r="2" fill="none" stroke="#FBBF24" strokeWidth="0.3"/></g>
                                            </svg>
                                            <span className="text-yellow-400 text-[9px] md:text-[10px] font-bold uppercase hidden sm:inline">Pago</span>
                                        </div>
                                    )}
                                </div>

                                {/* FECHA (MÁS VISIBLE) */}
                                <div className="flex items-center justify-end shrink-0">
                                    <span className={`text-[9px] md:text-[10px] font-bold whitespace-nowrap ${cap.dateLabel === 'New' ? 'text-[#00C2FF] animate-pulse flex items-center gap-0.5' : 'text-gray-400'}`}>
                                        {cap.dateLabel === 'New' && <Flame size={10} fill="currentColor" />}
                                        {cap.dateLabel === 'New' ? cap.dateLabel : `${cap.dateLabel === '1d' ? '1 Day' : cap.dateLabel.replace('d', ' Days')}`}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                  </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};