import { useState, useEffect } from "react";
import { Zap, Clock, Calendar, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useHomeData } from '../../context/HomeDataContext';

// Interfaz UI
interface MangaItem {
  id: number | string;
  title: string;
  coverImage: string;
  rating: number;
  synopsis: string;
  date: string;
  type: string;
}

export const NewReleases = () => {
  const { newReleases, isReady } = useHomeData();
  const [items, setItems] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    setItems(newReleases.map(manga => ({
      id: manga.id,
      title: manga.titulo,
      coverImage: manga.portada,
      rating: 10,
      synopsis: manga.descripcion || "Descripción no disponible.",
      date: manga.fecha,
      type: manga.tipo || "Manga",
    })));
    setLoading(false);
  }, [isReady, newReleases]);

  if (loading) return null;
  if (items.length === 0) return null;

  // El primero es el grande (Main), los siguientes 4 son los pequeños (Side)
  const [mainItem, ...sideItems] = items;

  return (
    <section className="home-new-releases relative w-full py-10 z-20">
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-12">
        
        {/* --- HEADER --- */}
        <div className="flex items-center gap-3 mb-8 border-l-4 border-violet-600 pl-4">
            <h2 className="home-theme-title text-3xl md:text-4xl font-[900] text-white uppercase italic tracking-tighter flex items-center gap-2">
                <span className="text-violet-500"><Zap size={32} strokeWidth={3} fill="currentColor" /></span>
                NUEVOS LANZAMIENTOS
            </h2>
        </div>

        {/* --- GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[600px]">
            
            {/* 1. MAIN CARD (El más nuevo: "Cinco hombres...") */}
            <Link 
                to={`/manga/${mainItem.id}`}
                className="home-feature-card group relative col-span-1 lg:col-span-2 h-[500px] lg:h-full block overflow-hidden bg-[#111]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 90% 100%, 0 100%)' }}
            >
                <img 
                    src={mainItem.coverImage} 
                    alt={mainItem.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter brightness-75 group-hover:brightness-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 transition-opacity duration-300" />

                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex flex-col items-start gap-4">
                    <div className="flex gap-2">
                        <span className="bg-violet-600 text-white text-xs font-black uppercase px-3 py-1 tracking-widest animate-pulse">
                            Estreno
                        </span>
                        <span className="bg-white text-black text-xs font-black uppercase px-3 py-1 tracking-widest">
                            {mainItem.type}
                        </span>
                    </div>
                    
                    <h3 className="home-theme-title text-3xl md:text-5xl lg:text-6xl font-[900] text-white uppercase italic leading-none line-clamp-2 drop-shadow-xl" style={{ textShadow: '4px 4px 0 #000' }}>
                        {mainItem.title}
                    </h3>

                    <div className="flex flex-wrap gap-4 text-sm font-bold text-gray-300 uppercase tracking-wide">
                        <div className="flex items-center gap-1.5">
                            <Flame size={16} className="text-orange-500" />
                            <span>Recién subido</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} className="text-blue-500" />
                            <span>{mainItem.date}</span>
                        </div>
                    </div>

                    {/* Descripción con line-clamp para que no rompa el diseño */}
                    <div className="max-w-xl hidden md:block">
                        <p className="home-theme-copy text-gray-300 font-medium text-base leading-snug line-clamp-3 drop-shadow-md">
                            {mainItem.synopsis}
                        </p>
                    </div>
                </div>

                <div className="absolute inset-0 border-2 border-transparent group-hover:border-violet-500 transition-colors duration-300 pointer-events-none" 
                     style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 90% 100%, 0 100%)' }}>
                </div>
            </Link>

            {/* 2. SIDE CARDS (Los siguientes) */}
            <div className="col-span-1 grid grid-cols-2 gap-4 h-full content-start">
                {sideItems.map((item, index) => (
                    <Link 
                        key={item.id} 
                        to={`/manga/${item.id}`}
                        className="home-side-card group relative block overflow-hidden bg-[#111] h-[240px] lg:h-[290px]"
                        style={{ clipPath: index % 2 === 0 ? 'polygon(15% 0, 100% 0, 100% 100%, 0 100%, 0 15%)' : 'polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%)' }}
                    >
                        <img 
                            src={item.coverImage} 
                            alt={item.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                        <div className="absolute top-0 right-0 bg-violet-600/90 text-white text-[10px] font-black px-2 py-1 z-10">
                            NEW
                        </div>

                        <div className="absolute bottom-0 left-0 w-full p-3 md:p-4">
                            <h4 className="home-theme-title text-white text-sm md:text-lg font-black uppercase italic leading-none mb-1 group-hover:text-violet-400 transition-colors line-clamp-2 drop-shadow-md">
                                {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                <Calendar size={12} />
                                <span>{item.date}</span>
                            </div>
                        </div>

                        <div className="absolute inset-0 border border-white/10 group-hover:border-violet-500 transition-colors duration-200 pointer-events-none"></div>
                    </Link>
                ))}
            </div>

        </div>
      </div>
    </section>
  );
};
