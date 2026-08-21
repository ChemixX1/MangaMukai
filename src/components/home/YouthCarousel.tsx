import { useState, useEffect } from "react";
import { Crown, TrendingUp, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { getPopularMenByViews, getUltimosCapitulos } from '../../services/mangaService';
import { useHomeData } from '../../context/HomeDataContext';
import { MangaMetaBar } from '../common';
import { preloadImages } from '../../utils/preloadImages';

// --- FUNCIONES DE ESTILO ---

const timeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    if (!dateString || Number.isNaN(past.getTime())) return "—";
    const diffTime = Math.abs(now.getTime() - past.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays <= 2) return "New"; 
    return `${diffDays}d`;
};

const getTypeColor = (type: string) => {
    const t = type ? type.toLowerCase() : "";
    if (t.includes('manhwa')) return "bg-purple-600";
    if (t.includes('manhua')) return "bg-green-600";
    if (t.includes('novel')) return "bg-blue-600";
    return "bg-[#00C2FF]"; // Azul por defecto para hombres
};

interface CarouselManga {
  id: string | number;
  title: string;
  coverImage: string;
  chapterNum: string | number;
  isFree: boolean;
  date: string;
  type: string;
}

const mergePopularItems = (...groups: CarouselManga[][]): CarouselManga[] => {
  const seen = new Set<string>();
  const merged: CarouselManga[] = [];
  for (const group of groups) {
    for (const manga of group) {
      const key = String(manga.id);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(manga);
      if (merged.length === 12) return merged;
    }
  }
  return merged;
};

export const YouthCarousel = () => {
  const { latestMen, popularMenWeekly, popularMenHistorical, isReady } = useHomeData();
  const [items, setItems] = useState<CarouselManga[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [isTouchPaused, setIsTouchPaused] = useState(false);

  const [activeFilter, setActiveFilter] = useState("Semanal");

  const filters = ["Semanal", "Mensual", "Histórico"];

  const formatItems = (mangasWP: typeof latestMen): CarouselManga[] =>
    mangasWP.slice(0, 12).map(manga => {
      const latestChapter = manga.capitulosRecientes?.[0];
      const rawDate = latestChapter?.fecha || manga.rawFecha || manga.fecha;
      return {
        id: manga.id,
        title: manga.titulo,
        coverImage: manga.portada,
        chapterNum: latestChapter ? latestChapter.numero : "—",
        isFree: latestChapter ? latestChapter.esGratis : true,
        date: timeAgo(rawDate),
        type: manga.tipo || "Manga",
      };
    });

  useEffect(() => {
    if (!isReady) return;
    void (async () => {
      const warmedPeriods = await Promise.all([
        getPopularMenByViews('monthly', false),
      ]);
      await preloadImages(warmedPeriods.flat().slice(0, 24).map(manga => manga.portada));
    })();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;

    const fetchMangas = async () => {
      try {
        if (items.length === 0) setLoading(true);
        else setFilterLoading(true);
        const period = activeFilter === 'Semanal' ? 'weekly' : activeFilter === 'Mensual' ? 'monthly' : 'historical';
        const contextualMangas = activeFilter === 'Semanal'
          ? popularMenWeekly
          : activeFilter === 'Histórico'
            ? popularMenHistorical
            : [];
        const mangasWP = contextualMangas.length > 0
          ? contextualMangas
          : await getPopularMenByViews(period, false);
        let nextItems = mergePopularItems(
          formatItems(mangasWP),
          formatItems(popularMenHistorical),
          formatItems(latestMen),
        );

        if (nextItems.length === 0) {
          const library = await getUltimosCapitulos();
          const menLibrary = library.filter(manga => manga.genero === 'Hombre');
          nextItems = formatItems(menLibrary.length > 0 ? menLibrary : library);
        }

        if (nextItems.length > 0) {
          await preloadImages(nextItems.map(manga => manga.coverImage));
        }
        if (cancelled) return;
        if (nextItems.length > 0) {
          setItems(nextItems);
        } else {
          setItems(previous => previous.length > 0 ? previous : []);
        }
      } catch (err) {
        console.error("Error cargando populares hombres:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFilterLoading(false);
        }
      }
    };
    void fetchMangas();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, isReady, popularMenWeekly.length, popularMenHistorical.length, latestMen.length]);

  const showSkeleton = loading && items.length === 0;
  const marqueeItems = items.length === 0
    ? []
    : Array.from({ length: Math.max(12, items.length) }, (_, index) => items[index % items.length]);

  return (
    <section className="home-youth-popular relative w-full pb-0 group/section mt-0" aria-busy={filterLoading || showSkeleton}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

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
            z-index: 40;
        }
        .group:hover .shine-effect::after {
            left: 150%;
            transition: 0.7s;
        }
      `}</style>

      <div className="desktop-content-shell home-popular-shell relative z-20 mx-auto w-full max-w-[1600px] px-4 sm:px-5 lg:px-8">
        
        {/* CABECERA */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-6">
          <div className="flex items-center gap-3 border-l-4 border-[#00C2FF] pl-4">
              <h2 className="home-theme-title text-2xl md:text-4xl font-[900] text-white uppercase italic tracking-tighter flex items-center gap-3">
                  <span className="text-[#00C2FF] drop-shadow-[0_0_10px_rgba(0,194,255,0.6)]">
                    <TrendingUp size={32} strokeWidth={3} />
                  </span>
                  MANGAS <span className="text-[#00C2FF]">POPULARES</span>
              </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="home-theme-surface flex bg-[#0f1115] p-1 rounded-lg border border-white/10 w-full sm:w-auto">
                {filters.map((filter) => (
                <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    data-active={activeFilter === filter}
                    className={`home-theme-tab-button flex-1 sm:flex-none px-5 py-2 text-[11px] font-black uppercase tracking-wider rounded-md transition-all duration-300
                    ${activeFilter === filter ? "bg-[#00C2FF] text-white" : "text-gray-500 hover:text-white hover:bg-white/5"}
                    `}
                >
                    {filter}
                </button>
                ))}
            </div>

          </div>
        </div>

        {/* SLIDER */}
        <div className="relative min-h-[300px]"> 
            {!showSkeleton && (
            <div
              className="-mx-2 touch-pan-y overflow-hidden py-4"
              aria-label="Mangas populares juveniles en movimiento continuo"
              onTouchStart={() => setIsTouchPaused(true)}
              onTouchEnd={() => setIsTouchPaused(false)}
              onTouchCancel={() => setIsTouchPaused(false)}
            >
                    <div className="home-popular-marquee-track" style={isTouchPaused ? { animationPlayState: 'paused' } : undefined}>
                        {items.length > 0 ? (
                          [0, 1].map((copyIndex) => (
                            <div
                              key={`youth-popular-sequence-${copyIndex}`}
                              className="home-popular-marquee-sequence"
                              aria-hidden={copyIndex === 1 ? true : undefined}
                            >
                            {marqueeItems.map((manga, index) => {
                            const rank = (index % items.length) + 1;
                            
                            // Configuración de colores (AZUL para hombres)
                            let rankConfig = {
                                text: "text-white", 
                                accent: "text-[#00C2FF]", 
                                glow: "group-hover/card:shadow-[#00C2FF]/30 group-hover/card:ring-[#00C2FF]/50",
                                titleHover: "group-hover/card:text-[#00C2FF]"
                            };

                            if (rank === 1) { 
                                rankConfig = { text: "text-yellow-500", accent: "text-yellow-500", glow: "group-hover/card:shadow-yellow-500/30 group-hover/card:ring-yellow-500/50", titleHover: "group-hover/card:text-yellow-500" };
                            } else if (rank === 2) { 
                                rankConfig = { text: "text-gray-300", accent: "text-gray-300", glow: "group-hover/card:shadow-gray-300/30 group-hover/card:ring-gray-300/50", titleHover: "group-hover/card:text-gray-300" };
                            } else if (rank === 3) { 
                                rankConfig = { text: "text-orange-500", accent: "text-orange-500", glow: "group-hover/card:shadow-orange-500/30 group-hover/card:ring-orange-500/50", titleHover: "group-hover/card:text-orange-500" };
                            }

                            return (
                            <div 
                                key={`${copyIndex}-${manga.id}-${index}`} 
                                className="home-popular-marquee-card"
                            >
                                <Link 
                                    to={`/manga/${manga.id}`} 
                                    tabIndex={copyIndex === 1 ? -1 : undefined}
                                    className={`
                                        home-theme-surface
                                        group/card h-full transition-all duration-300
                                        flex flex-col relative rounded-xl overflow-hidden
                                        bg-[#0f1115] ring-1 ring-white/10 shadow-lg
                                        group-hover/card:-translate-y-1
                                        ${rankConfig.glow}
                                    `}
                                >
                                    {/* IMAGEN + SHINE */}
                                    <div className="relative aspect-[3/4.2] w-full overflow-hidden transition-all duration-300 shine-effect">
                                            <img src={manga.coverImage} alt={manga.title} className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105" loading="lazy" />
                                            
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent z-10" />
                                            
                                            {/* RANKING (Abajo Izquierda) */}
                                            <div className="absolute -bottom-2 -left-2 z-20 select-none pointer-events-none">
                                                <span className={`text-[90px] md:text-[110px] font-[900] leading-none tracking-tighter ${rankConfig.text} drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)] italic`}>{rank}</span>
                                            </div>

                                            {/* ETIQUETA TIPO (Abajo Derecha) */}
                                            <div className="absolute bottom-2 right-2 z-30">
                                                <span className={`${getTypeColor(manga.type)} text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-wider`}>
                                                    {manga.type}
                                                </span>
                                            </div>

                                            {/* CORONA */}
                                            {rank === 1 && (
                                                <div className="absolute top-2 right-2 bg-yellow-500 text-black p-1.5 rounded-md shadow-lg z-30 animate-bounce">
                                                    <Crown size={12} fill="currentColor" />
                                                </div>
                                            )}
                                    </div>

                                    <div className="relative z-20 flex h-[2.6rem] items-center justify-center px-3 md:h-[3rem]">
                                            <h3 className={`home-theme-title text-[13px] md:text-[14px] font-[800] text-white leading-tight line-clamp-2 text-center transition-colors uppercase tracking-tight ${rankConfig.titleHover}`}>
                                            {manga.title}
                                            </h3>
                                    </div>
                                    <MangaMetaBar
                                      chapter={manga.chapterNum}
                                      isFree={manga.isFree}
                                      date={manga.date}
                                      accentClassName={rankConfig.accent}
                                      className="pt-4 pb-2"
                                    />
                                </Link>
                            </div>
                            );
                            })}
                            </div>
                          ))
                        ) : (
                            <div className="w-full h-[300px] flex flex-col items-center justify-center text-white/40 col-span-full mx-auto">
                                <BookOpen size={40} className="mb-2 opacity-50" />
                                <p className="text-sm font-bold uppercase tracking-wider">No hay resultados esta semana</p>
                            </div>
                        )}
                    </div>
            </div>
            )}
        </div>
      </div>
    </section>
  );
};
