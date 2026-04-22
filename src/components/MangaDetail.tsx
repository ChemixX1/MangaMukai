import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";

import { getStoredUser, getStoredToken, getUnlockedChapters, refreshUser } from "../utils/auth";
import { getInteractions, toggleBookmark, toggleLike, recordHistory } from "../utils/interactions";
import { getMangaById, searchMangas, getChaptersByCategory, getChaptersBySeries, type SeriesChapter } from "../services/mangaService";
import { 
  BookOpen, Bookmark, Share2, 
  ChevronDown, 
  Twitter, Instagram, Facebook, Youtube,
  Heart, Hash, Check, Copy, X, Link as LinkIcon,
  Calendar, Building2, Monitor, User, MessageCircle, Globe,
  Activity, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { SpotifyPlayer, type OST } from "../components/SpotifyPlayer";
import { CommentsSection } from "../components/CommentsSection";
import NewsSection from "../components/News"; 
import { Footer } from "../components/Footer";
import { ChapterList } from "../components/ChapterList";
import { SubscriptionModal } from "../components/SubscriptionModal";

// --- SINGLETON DE AUDIO ---
const globalAudio = new Audio();
let globalTrackData: OST | null = null; 

// --- COMPONENTE AUXILIAR PARA ANIMAR NÚMEROS ---
const NumberTicker = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const start = 0; 
    const end = value;
    if (start === end) return;

    const duration = 1500; 
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);
      
      const current = Math.floor(easeOut * (end - start) + start);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value]);

  return <>{count.toLocaleString()}</>;
};

// --- ESTILOS AUXILIARES ---
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
  body { font-family: 'Inter', sans-serif; background-color: #02040a; }
  .font-mono { font-family: 'JetBrains Mono', monospace; }
  .hide-scroll::-webkit-scrollbar { display: none; }
  .glow-card { transition: all 0.3s ease; }
  .glow-card:hover { border-color: rgba(255,255,255,0.2); }
  .vertical-tag {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
  }
  @keyframes move-stars-vertical { 
    from { transform: translateY(0px); } 
    to { transform: translateY(-1000px); } 
  }
  .star-layer {
    background: transparent;
    position: absolute;
    top: 0; left: 0; right: 0;
    z-index: 0;
    pointer-events: none;
  }
`;

const generateStars = (count: number) => {
  return Array.from({ length: count })
    .map(() => `${Math.random() * 2500}px ${Math.random() * 8000}px #FFF`) 
    .join(',');
};

const starsSmall = generateStars(1000); 
const starsMedium = generateStars(300);
const starsBig = generateStars(100);

// --- INTERFACES ---
interface MangaDetailData { 
    id: number | string; 
    title: string; 
    cover_url: string; 
    description: string | null; 
    rating: number | null; 
    created_at: string; 
    tags: string | string[] | null; 
    views?: number; 
    status?: string; 
    target_audience?: string;
    // --- NUEVOS CAMPOS AGREGADOS ---
    release_date?: string;
    studio?: string;
    platform?: string;
    publisher?: string;
}

interface Chapter { 
    id: number | string; 
    chapter_number: number; 
    title: string; 
    created_at: string; 
    is_paid: boolean; 
    price_coins: number; 
    free_at: string | null; 
}
interface RecommendedManga { id: string | number; title: string; cover_url: string; rating: number; }

export const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();

  const [manga, setManga] = useState<MangaDetailData | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [purchasedChapters, setPurchasedChapters] = useState<Set<string>>(new Set());
  const [userCoins, setUserCoins] = useState(0);
  const [userInfo, setUserInfo] = useState({ id: "", username: "Usuario" });

  const isUserPro = false;
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const [recommended, setRecommended] = useState<RecommendedManga[]>([]);
  const [playlist, setPlaylist] = useState<OST[]>([]);
  
  const [likesCount, setLikesCount] = useState(0);

  const [sharesCount, setSharesCount] = useState(0); 
  const [onlineReaders, setOnlineReaders] = useState(0); 
  
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estados del reproductor
  const [isPlaying, setIsPlaying] = useState(!globalAudio.paused);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<OST | null>(globalTrackData);
  const [currentTime, setCurrentTime] = useState(globalAudio.currentTime);
  const [duration, setDuration] = useState(globalAudio.duration || 0);

  // --- 1. FUNCIÓN PARA INCREMENTAR VISTAS AUTOMÁTICAMENTE ---
  const incrementViews = async (mangaId: string, currentViews: number) => {
    const sessionKey = `viewed_${mangaId}`;
    if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, 'true'); 
        setManga(prev => prev ? { ...prev, views: currentViews + 1 } : null);
    }
    // Registrar historial para conteo global de online readers
    await recordHistory(mangaId);
  };

  // 2. SINCRONIZACIÓN AUDIO AL MONTAR
  useEffect(() => {
    const updateTime = () => setCurrentTime(globalAudio.currentTime);
    const updateDuration = () => setDuration(globalAudio.duration);
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    globalAudio.addEventListener('timeupdate', updateTime);
    globalAudio.addEventListener('loadedmetadata', updateDuration);
    globalAudio.addEventListener('ended', onEnded);
    globalAudio.addEventListener('play', onPlay);
    globalAudio.addEventListener('pause', onPause);

    setIsPlaying(!globalAudio.paused);
    setCurrentTime(globalAudio.currentTime);
    setDuration(globalAudio.duration);
    setCurrentTrack(globalTrackData);

    const timer = setInterval(() => setTime(new Date()), 1000);
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    return () => { 
        globalAudio.removeEventListener('timeupdate', updateTime);
        globalAudio.removeEventListener('loadedmetadata', updateDuration);
        globalAudio.removeEventListener('ended', onEnded);
        globalAudio.removeEventListener('play', onPlay);
        globalAudio.removeEventListener('pause', onPause);
        
        clearInterval(timer); 
        document.head.removeChild(styleSheet); 
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);

      // Obtener usuario desde localStorage (WordPress auth)
      const storedUser = getStoredUser();
      const token = getStoredToken();
      if (storedUser) {
        setUserCoins(storedUser.coins ?? 0);
        setUserInfo({ id: String(storedUser.id), username: storedUser.username || "Usuario" });
        // Refrescar coins en background si hay token
        if (token) {
          refreshUser().then(u => { if (u) setUserCoins(u.coins ?? 0); });
        }
      }

      const wpManga = await getMangaById(id);

      let mData: MangaDetailData | null = null;
      let cData: Chapter[] = [];
      let rData: RecommendedManga[] = [];

      if (wpManga) {
          mData = {
              id: wpManga.id,
              title: wpManga.titulo,
              cover_url: wpManga.portada,
              description: wpManga.descripcion || null,
              rating: 10,
              created_at: wpManga.fecha,
              tags: wpManga.genres && wpManga.genres.length > 0 ? wpManga.genres.map(String) : [wpManga.tipo],
              views: 1250,
              status: 'Publicado',
              release_date: wpManga.fecha,
              target_audience: wpManga.genero?.toLowerCase() || (wpManga.tipo.toLowerCase().includes('manhwa') ? 'mujer' : 'hombre'),
          };

          // Capítulos — estrategia 1: endpoint propio por ero_seri (más fiable)
          if (wpManga.eroSeri) {
            const seriesChapters: SeriesChapter[] = await getChaptersBySeries(wpManga.eroSeri);
            if (seriesChapters.length > 0) {
              cData = seriesChapters;
            }
          }

          // Estrategia 2: fallback por categoría WP si no hay eroSeri o vino vacío
          if (cData.length === 0 && wpManga.categorias && wpManga.categorias.length > 0) {
            const categoryId = wpManga.categorias[0];
            const wpChapters = await getChaptersByCategory(categoryId);
            cData = wpChapters.map((c: any) => ({
              id: c.id,
              chapter_number: Number(c.numero) || 0,
              title: c.titulo || ('Capítulo ' + c.numero),
              created_at: c.fecha,
              is_paid: !c.esGratis,
              price_coins: c.esGratis ? 0 : Number(c.precio ?? 50),
              free_at: null,
            }));
          }

          const rawRData = await searchMangas('');
          rData = rawRData.slice(0, 6).map(r => ({
              id: r.id,
              title: r.titulo,
              cover_url: r.portada,
              rating: 9.5
          }));
      }

      // Default mock OST if none
      const ostData: OST[] = [
          { id: 1, title: 'MangaMukai Theme', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_731ce3ed2b.mp3', duration: '2:00', cover_url: mData?.cover_url || '', track_number: 1, is_locked: false }
      ];

      const lCount = 0;

      // Capítulos comprados — desde WordPress/myCRED
      const userPurchases = await getUnlockedChapters();
      
      // Obtener interacciones
      const interactions = await getInteractions(id);
      if (interactions) {
          setOnlineReaders(interactions.online_readers);
          setIsLiked(interactions.likes.includes(id));
          setIsBookmarked(interactions.bookmarks.includes(id));
          if (typeof interactions.manga_likes === 'number') {
              setLikesCount(interactions.manga_likes);
          }
      }

      setManga(mData);
      setChapters(cData || []);
      setRecommended(rData || []);
      setPlaylist(ostData || []);
      setLikesCount(lCount || 0);
      setPurchasedChapters(userPurchases);

      if (mData) {
          incrementViews(String(mData.id), mData.views || 0);
      }

      if (ostData && ostData.length > 0) {
          if (globalAudio.paused && !globalTrackData) {
             setCurrentTrack(ostData[0]); 
          }
      }

    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- LÓGICA DE REPRODUCCIÓN ---
  
  const playTrack = (track: OST) => {
    if (track.is_locked && !isUserPro) return;

    if (globalTrackData?.id === track.id) {
        toggleAudio();
        return;
    }

    globalAudio.src = track.url;
    globalAudio.play().catch(e => console.error("Error play:", e));
    
    globalTrackData = track;
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const toggleAudio = () => {
      if (globalAudio.paused) {
          if (!globalAudio.src && currentTrack) {
              playTrack(currentTrack);
          } else {
              globalAudio.play();
          }
      } else {
          globalAudio.pause();
      }
      setIsPlaying(!globalAudio.paused);
  };

  const handleSeek = (newTime: number) => { 
      if(globalAudio.src) {
        globalAudio.currentTime = newTime; 
        setCurrentTime(newTime); 
      }
  };

  const handleNext = () => { 
      if (!currentTrack || playlist.length === 0) return; 
      
      const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
      
      if (currentIndex === -1) {
          playTrack(playlist[0]);
      } else {
          const nextIndex = (currentIndex + 1) % playlist.length;
          playTrack(playlist[nextIndex]); 
      }
  };

  const handlePrev = () => { 
      if (!currentTrack || playlist.length === 0) return; 
      
      const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
      
      if (currentIndex === -1) {
          playTrack(playlist[0]);
      } else {
          const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
          playTrack(playlist[prevIndex]); 
      }
  };

  // -----------------------------------------------------------

  const handleBookmark = async () => {
      const res = await toggleBookmark(id as string);
      if (res === 'added') setIsBookmarked(true);
      else if (res === 'removed') setIsBookmarked(false);
  };

  const handleLike = async () => {
      const res = await toggleLike(id as string);
      if (res) {
          setIsLiked(res.action === 'added');
          setLikesCount(res.total);
      }
  };

  const handleShare = async () => {
      setSharesCount(prev => prev + 1);
      
      const shareData = { 
          title: manga?.title || "MangaMukai", 
          text: `¡Estoy leyendo ${manga?.title} en MangaMukai!`, 
          url: window.location.href 
      };

      if (navigator.share) { 
          try { await navigator.share(shareData); } 
          catch { console.log("User cancel share"); } 
      } else { 
          setShowShareModal(true); 
      }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleScrollToChapters = () => {
      const element = document.getElementById("chapters-section");
      if (element) {
          element.scrollIntoView({ behavior: "smooth" });
      }
  };

  const getDynamicWidth = (val: number) => {
    if (val <= 0) return "0%";
    let max = 100;
    while (val > max) { max *= 10; }
    const percentage = (val / max) * 100;
    return `${Math.max(percentage, 5)}%`; 
  };

  if (loading) return <div className="min-h-screen bg-[#02040a] flex items-center justify-center text-white font-mono text-xs">CARGANDO SISTEMA...</div>;
  if (!manga) return null;

  const safeTags = Array.isArray(manga.tags) ? manga.tags : typeof manga.tags === 'string' ? manga.tags.replace(/['"[\]]/g, '').split(',').map(t => t.trim()) : [];
  
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const dateString = time.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  const isMujer = manga.target_audience === 'mujer';
  const themeColorText = isMujer ? 'text-pink-500' : 'text-cyan-400';
  const gradientBtn = isMujer 
    ? 'from-pink-600 via-pink-500 to-rose-500 shadow-pink-500/20' 
    : 'from-cyan-600 via-blue-600 to-blue-700 shadow-cyan-500/20';
  const hoverBtnClass = isMujer
    ? 'hover:text-pink-500 hover:border-pink-500/50'
    : 'hover:text-cyan-400 hover:border-cyan-400/50';

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-300 overflow-x-hidden selection:bg-pink-500 selection:text-white font-sans relative">
      
      {/* FONDO */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#000000_0%,#02040a_10%,#1B2735_50%,#02040a_90%,#000000_100%)]"></div>
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="star-layer w-[1px] h-[1px]" style={{ boxShadow: starsSmall, animation: 'move-stars-vertical 100s linear infinite' }}></div>
         <div className="star-layer w-[2px] h-[2px] opacity-70" style={{ boxShadow: starsMedium, animation: 'move-stars-vertical 150s linear infinite' }}></div>
         <div className="star-layer w-[3px] h-[3px] opacity-50" style={{ boxShadow: starsBig, animation: 'move-stars-vertical 200s linear infinite' }}></div>
      </div>

      {/* --- CONTENIDO --- */}
      <div className="max-w-[1150px] mx-auto px-6 pt-24 pb-12 relative z-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center py-6 border-b border-white/10 mb-12 gap-6">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative flex items-center gap-4 bg-[#0A0A0A] border border-white/10 px-6 py-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_10px_#EC4899]"></div>
                    <div className="flex items-baseline gap-1 font-mono text-lg font-black text-white tracking-[0.1em]">
                        {hours}:{minutes}<span className="text-[10px] text-pink-500 font-medium">.{seconds}</span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/20"></div>
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{dateString}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
               {[
                 { icon: Twitter, color: "hover:text-sky-400", href: "https://twitter.com" }, 
                 { icon: Instagram, color: "hover:text-pink-500", href: "https://instagram.com" }, 
                 { icon: Facebook, color: "hover:text-blue-500", href: "https://facebook.com" },
                 { icon: Youtube, color: "hover:text-red-500", href: "https://youtube.com" },
                 { icon: MessageCircle, color: "hover:text-indigo-400", href: "https://discord.com" }, 
                 { icon: Globe, color: "hover:text-emerald-400", href: "https://mangamukai.com" }
               ].map((item, i) => (
                 <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className={`text-white/20 transition-all duration-300 hover:scale-110 ${item.color}`}>
                    <item.icon size={20} strokeWidth={2} />
                 </a>
               ))}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-24">
            
            {/* IZQUIERDA */}
            <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-5 sticky top-6 h-fit">
                
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-xl overflow-hidden shadow-2xl bg-[#111] aspect-[2/3]">
                    <img src={manga.cover_url} className="w-full h-full object-cover" alt="Cover" />
                    
                    <div className="absolute bottom-24 left-0 flex flex-col gap-2 z-10">
                        <span className="vertical-tag py-3 px-1 bg-pink-600 text-white text-[10px] font-black uppercase tracking-widest rounded-r-sm shadow-lg shadow-pink-600/30">Estreno</span>
                        <span className="vertical-tag py-3 px-1 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-r-sm shadow-lg shadow-purple-600/30">Color</span>
                    </div>

                    <button onClick={handleLike} className={`absolute bottom-4 right-4 w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center border transition-all z-20 ${isLiked ? 'bg-pink-600 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)] scale-110' : 'bg-white/10 border-white/20 hover:bg-pink-600 hover:border-pink-600 hover:scale-110'}`}>
                        <Heart className={`w-6 h-6 transition-colors ${isLiked ? 'fill-white text-white' : 'text-white'}`} />
                    </button>
                </motion.div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleScrollToChapters} 
                        className={`w-full py-3 rounded-lg font-bold uppercase text-xs tracking-widest text-white transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r ${gradientBtn} border border-white/10 shadow-lg`}
                    >
                        <BookOpen size={16} strokeWidth={2} /> Comenzar
                    </button>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={handleBookmark} 
                            className={`flex-1 py-3 border rounded-lg flex justify-center items-center shadow-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0
                                ${isBookmarked 
                                    ? (isMujer ? 'bg-pink-500 text-white border-pink-500' : 'bg-cyan-600 text-white border-cyan-600') 
                                    : `bg-white text-black border-transparent ${hoverBtnClass} hover:bg-transparent` 
                                }
                            `}
                        >
                            <Bookmark size={18} strokeWidth={2} fill={isBookmarked ? "currentColor" : "none"} />
                        </button>
                        
                        <button 
                            onClick={handleShare} 
                            className={`flex-1 py-3 border rounded-lg flex justify-center items-center shadow-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0
                                bg-white text-black border-transparent ${hoverBtnClass} hover:bg-transparent
                            `}
                        >
                            <Share2 size={18} strokeWidth={2} />
                        </button>
                    </div>
                </div>
                
                <SpotifyPlayer 
                    currentTrack={currentTrack} 
                    isPlaying={isPlaying} 
                    toggleAudio={toggleAudio} 
                    coverFallback={manga.cover_url} 
                    currentTime={currentTime} 
                    duration={duration} 
                    showPlaylist={showPlaylist} 
                    setShowPlaylist={setShowPlaylist} 
                    playlist={playlist} 
                    handleNext={handleNext} 
                    handlePrev={handlePrev} 
                    onSeek={handleSeek} 
                    playTrack={playTrack} 
                    isUserPro={isUserPro}
                    onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
                />
            </div>

            {/* --- DERECHA --- */}
            <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-6">
                
                <div className="flex flex-col gap-3 border-b border-white/10 pb-6">
                    <h1 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-white">{manga.title}</h1>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Hash size={14} className={themeColorText} />
                        {safeTags.map(tag => <span key={tag} className="px-3 py-1 bg-[#1a1a1a] border border-white/10 rounded text-[10px] uppercase font-bold tracking-wider text-white/70">{tag}</span>)}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-12 bg-[#0A0A0A] border border-white/5 rounded-xl p-6 relative shadow-2xl">
                        <div className="flex items-center gap-2 mb-4">
                             <div className={`w-1 h-3 rounded-full ${isMujer ? 'bg-pink-500' : 'bg-cyan-500'}`}></div>
                             <h3 className="text-white font-bold text-xs uppercase tracking-widest font-mono">Sinopsis</h3>
                        </div>
                        <div className={`relative transition-all duration-700 ease-in-out ${isDescExpanded ? 'h-auto' : 'h-[140px] overflow-hidden'}`}>
                            <p className="text-base text-gray-300 font-normal leading-relaxed text-justify">
                                {manga.description || "Sinopsis no disponible."}
                            </p>
                            {!isDescExpanded && <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none"></div>}
                        </div>
                        <button onClick={() => setIsDescExpanded(!isDescExpanded)} className="mt-4 w-full py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white border-t border-white/5 hover:border-white/20 flex items-center justify-center gap-2 transition-all">
                            {isDescExpanded ? "Menos" : "Más"} <ChevronDown size={12} className={`transition-transform duration-300 ${isDescExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-8">
                    
                    {/* METADATOS CONECTADOS */}
                    <div className="flex flex-wrap justify-center items-center gap-12 py-5 border-y border-white/5 text-center">
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 font-mono flex items-center gap-2">
                                <Calendar size={10} /> Fecha
                            </span>
                            <span className="text-sm font-bold text-white font-mono">
                                {manga.release_date ? new Date(manga.release_date).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                        <div className="hidden md:block w-px h-8 bg-white/10"></div> 
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 font-mono flex items-center gap-2">
                                <Building2 size={10} /> Estudio
                            </span>
                            <span className="text-sm font-bold text-white font-mono">
                                {manga.studio || 'N/A'}
                            </span>
                        </div>
                        <div className="hidden md:block w-px h-8 bg-white/10"></div>
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 font-mono flex items-center gap-2">
                                <Monitor size={10} /> Plataforma
                            </span>
                            <span className="text-sm font-bold text-white font-mono">
                                {manga.platform || 'N/A'}
                            </span>
                        </div>
                        <div className="hidden md:block w-px h-8 bg-white/10"></div>
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 font-mono flex items-center gap-2">
                                <User size={10} /> Publicado
                            </span>
                            <span className="text-sm font-bold text-white font-mono">
                                {manga.publisher || 'N/A'}
                            </span>
                        </div>
                    </div>

                    {/* MÉTRICAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* LECTORES */}
                        <div className="bg-[#0B0C10] border border-white/5 rounded-xl py-4 px-5 glow-card relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isMujer ? 'text-pink-500/80' : 'text-cyan-500/80'}`}>Lectores En Linea</span>
                                    <span className="text-3xl font-mono font-bold text-white">
                                        <NumberTicker value={onlineReaders} />
                                    </span>
                                </div>
                                <div className={`p-2 rounded-lg ${isMujer ? 'bg-pink-500/10 text-pink-500' : 'bg-cyan-500/10 text-cyan-500'}`}><Activity size={20} /></div>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        className={`h-full rounded-full ${isMujer ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'}`} 
                                        initial={{ width: "0%" }} 
                                        animate={{ width: getDynamicWidth(onlineReaders) }} 
                                        transition={{ duration: 1.5, ease: "easeOut" }} 
                                    />
                            </div>
                        </div>

                        {/* COLECCIÓN */}
                        <div onClick={handleBookmark} className="bg-[#0B0C10] border border-white/5 rounded-xl py-4 px-5 glow-card relative overflow-hidden group cursor-pointer hover:border-blue-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 transition-colors ${isBookmarked ? 'text-blue-400' : 'text-white/40 group-hover:text-blue-400'}`}>
                                        {isBookmarked ? "Guardado en Colección" : "Añadir a Colección"}
                                    </span>
                                    <span className="text-3xl font-mono font-bold text-white">
                                        {isBookmarked ? "✓" : "+"}
                                    </span>
                                </div>
                                <div className={`p-2 rounded-lg transition-colors ${isBookmarked ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40 group-hover:text-blue-400'}`}>
                                    <Bookmark size={20} fill={isBookmarked ? "currentColor" : "none"} />
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    className={`h-full rounded-full ${isBookmarked ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-blue-900/40 group-hover:bg-blue-600'}`} 
                                    initial={{ width: "0%" }} 
                                    animate={{ width: isBookmarked ? "100%" : "0%" }} 
                                    transition={{ duration: 1.5, ease: "easeOut" }} 
                                />
                            </div>
                        </div>

                        {/* LIKES */}
                        <div onClick={handleLike} className="bg-[#0B0C10] border border-white/5 rounded-xl py-4 px-5 glow-card relative overflow-hidden group cursor-pointer hover:border-rose-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 transition-colors ${isLiked ? 'text-rose-500' : 'text-white/40 group-hover:text-rose-500'}`}>
                                        {isLiked ? "Te Gusta" : "Likes"}
                                    </span>
                                    <span className="text-3xl font-mono font-bold text-white">
                                        <NumberTicker value={likesCount} />
                                    </span>
                                </div>
                                <div className={`p-2 rounded-lg transition-colors ${isLiked ? 'bg-rose-500/20 text-rose-500' : 'bg-white/5 text-white/40 group-hover:text-rose-500'}`}>
                                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    className={`h-full rounded-full ${isLiked ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-rose-900/40 group-hover:bg-rose-600'}`} 
                                    initial={{ width: "0%" }} 
                                    animate={{ width: getDynamicWidth(likesCount) }} 
                                    transition={{ duration: 1.5, ease: "easeOut" }} 
                                />
                            </div>
                        </div>

                        {/* SHARES */}
                        <div onClick={handleShare} className="bg-[#0B0C10] border border-white/5 rounded-xl py-4 px-5 glow-card relative overflow-hidden group cursor-pointer hover:border-purple-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-purple-400 mb-1 transition-colors">Veces Compartido</span>
                                    <span className="text-3xl font-mono font-bold text-white">
                                        <NumberTicker value={sharesCount} />
                                    </span>
                                </div>
                                <div className="p-2 rounded-lg bg-white/5 text-white/40 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-colors"><Share2 size={20} /></div>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-purple-600/50 group-hover:bg-purple-500 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.5)] rounded-full transition-colors" 
                                    initial={{ width: "0%" }} 
                                    animate={{ width: getDynamicWidth(sharesCount) }} 
                                    transition={{ duration: 1.5, ease: "easeOut" }} 
                                />
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
      </div>

      {/* --- MODAL DE SHARE --- */}
      <AnimatePresence>
        {showShareModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => setShowShareModal(false)}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
                >
                    <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={20} /></button>
                    <h3 className="text-xl font-bold text-white mb-1">Compartir</h3>
                    <p className="text-xs text-white/50 mb-6">Difunde este manga con tus amigos.</p>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {[
                            { icon: Twitter, color: "text-sky-400", bg: "bg-sky-400/10", label: "Twitter" },
                            { icon: Facebook, color: "text-blue-500", bg: "bg-blue-500/10", label: "Facebook" },
                            { icon: Instagram, color: "text-pink-500", bg: "bg-pink-500/10", label: "Stories" },
                            { icon: LinkIcon, color: "text-white", bg: "bg-white/10", label: "Copiar", action: copyToClipboard }
                        ].map((item, i) => (
                            <button key={i} onClick={item.action} className="flex flex-col items-center gap-2 group">
                                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center transition-transform group-hover:scale-110 border border-white/5`}>
                                    <item.icon size={20} className={item.color} />
                                </div>
                                <span className="text-[10px] text-white/40 uppercase font-bold">{item.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="bg-[#111] border border-white/10 rounded-lg p-3 flex items-center gap-3">
                        <LinkIcon size={14} className="text-white/30" />
                        <input type="text" readOnly value={window.location.href} className="bg-transparent border-none outline-none text-xs text-white/60 w-full font-mono" />
                        <button onClick={copyToClipboard} className="text-white hover:text-pink-500 transition-colors">
                            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- LISTA DE CAPÍTULOS --- */}
      <div id="chapters-section">
          <ChapterList 
            chapters={chapters} 
            purchasedChapterIds={purchasedChapters} 
            userCoins={userCoins}
            userInfo={userInfo} 
            onPurchaseSuccess={() => fetchData()} 
          />
      </div>

      {/* --- RECOMENDACIONES --- */}
      <div className="w-[94%] mx-auto mb-32 relative z-30">
        <h3 className="text-2xl font-black italic uppercase text-white mb-8 flex items-center gap-3 tracking-tighter border-l-4 border-pink-600 pl-4">
            <Flame size={24} className="text-pink-500 fill-pink-500" /> Lecturas Relacionadas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {recommended.slice(0, 6).map((m) => (
                <Link key={m.id} to={`/manga/${m.id}`} className="group block">
                    <div className="aspect-[2/3] rounded-lg overflow-hidden mb-3 relative bg-[#111]">
                        <img src={m.cover_url} className="w-full h-full object-cover transition-opacity duration-300 hover:opacity-80" alt={m.title} />
                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">★ {m.rating}</div>
                    </div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-pink-600 transition-colors truncate">{m.title}</h4>
                </Link>
            ))}
        </div>
      </div>
      
      <NewsSection />
      {id && <CommentsSection mangaId={id} />}
      <Footer />

      {/* MODAL DE SUSCRIPCIÓN */}
      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen} 
        onClose={() => setIsSubscriptionModalOpen(false)} 
      />

    </div>
  );
};