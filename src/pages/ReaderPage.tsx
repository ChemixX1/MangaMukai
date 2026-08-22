import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStoredUser, getStoredToken, buyChapter, refreshUser, getUnlockedChapters } from "../services/authService";
import {
  ArrowLeft, Loader2, ChevronLeft, ChevronRight,
  Home, Coins, Instagram, Github, Send,
  Play, Pause, SkipBack, SkipForward,
  ListMusic, X, Heart, Shuffle, MoreHorizontal,
  Lock, Youtube, MessageCircle, Music
} from "lucide-react";
import { trackChapterView } from "../services/mangaService";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import { MANGAMUKAI_API, WORDPRESS_POSTS_API } from "../config/api";
import { finishGlobalLoading, startGlobalLoading, updateGlobalLoading } from "../utils/globalLoading";
import { preloadImages } from "../utils/preloadImages";

// MODALES
import { CoinMarketModal, SubscriptionModal } from "../components/modals";

// --- INTERFACES ---
interface ChapterImage {
  id: string;
  image_url: string;
  page_number: number;
}

interface NavigationData {
  prevId: string | null;
  nextId: string | null;
  mangaId: string | null;
  title: string;
  chapterNum: number;
  nextChapterNum: number | null;
  nextIsPaid: boolean;
  nextPrice: number;
  isNextUnlocked: boolean; 
}

export interface OST {
  id: number;
  title: string;
  url: string;
  duration: string;
  is_locked: boolean;
  track_number: number;
  cover_url?: string;
  genre?: string;
}

// =====================================================================
// COMPONENTE SPOTIFY PLAYER
// =====================================================================

interface SpotifyPlayerProps {
  currentTrack: OST | null;
  isPlaying: boolean;
  toggleAudio: () => void;
  handleNext: () => void;
  handlePrev: () => void;
  showPlaylist: boolean;
  setShowPlaylist: (show: boolean) => void;
  playlist: OST[];
  playTrack: (track: OST) => void;
  coverFallback: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void; 
  audioError?: boolean;
  isUserPro: boolean;          
  onOpenSubscription: () => void; 
}

const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const SpotifyPlayer = ({ 
  currentTrack, isPlaying, toggleAudio, handleNext, handlePrev, 
  showPlaylist, setShowPlaylist, playlist, playTrack, coverFallback,
  currentTime, duration, onSeek, audioError,
  isUserPro, onOpenSubscription 
}: SpotifyPlayerProps) => {
    
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isUserPro) return; 
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left; 
    const width = rect.width; 
    const newTime = (clickX / width) * duration; 
    onSeek(newTime); 
  };

  const displayImage = currentTrack?.cover_url || coverFallback;

  return (
    <div className={`w-full h-[160px] lg:h-[280px] relative group flex flex-col rounded-[24px] overflow-hidden border ${audioError ? 'border-red-500/50' : 'border-white/20'} bg-black shadow-2xl`}>
        
        {/* OVERLAY DE BLOQUEO */}
        {!isUserPro && (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[6px] transition-all duration-500">
                <div className="flex flex-col items-center text-center p-6 animate-in fade-in zoom-in duration-500">
                    <div className="relative mb-3">
                        <div className="absolute inset-0 bg-[#FF4D88] blur-xl opacity-20 rounded-full"></div>
                        <div className="bg-zinc-900 border border-white/10 p-3 rounded-full relative z-10 text-zinc-400">
                            <Lock size={20} />
                        </div>
                    </div>
                    <h3 className="text-white font-black uppercase italic tracking-tighter text-lg mb-1">
                        Mukai <span className="text-[#FF4D88]">Music</span>
                    </h3>
                    <p className="hidden md:block text-[10px] text-zinc-400 font-medium max-w-[200px] mb-4 leading-relaxed">
                        Desbloquea los Soundtracks y escucha música mientras lees.
                    </p>
                    <button 
                        onClick={onOpenSubscription}
                        className="group relative px-6 py-2 bg-white hover:bg-[#FF4D88] text-black hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,77,136,0.4)] flex items-center gap-2"
                    >
                        Desbloquear
                    </button>
                </div>
             </div>
        )}

        {/* Background Img */}
        <div className="absolute inset-0 z-0 overflow-hidden rounded-[24px]">
             {displayImage ? (
                 <img 
                   src={displayImage} 
                   className="w-full h-full object-cover opacity-20 scale-110" 
                   alt="bg-cover" 
                 />
             ) : (
                 <div className="w-full h-full bg-zinc-900/50"></div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-4 z-20">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Now Playing</span>
            <button disabled={!isUserPro} className="text-white/40 hover:text-white transition-colors">
                <MoreHorizontal size={14} />
            </button>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 flex flex-col justify-end px-5 pb-5 z-20">
            {/* Info Track */}
            <div className="flex items-center gap-4 mb-2 lg:mb-4">
                <motion.div 
                    className="relative w-10 h-10 lg:w-14 lg:h-14 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 bg-zinc-900 flex items-center justify-center"
                    whileHover={isUserPro ? { scale: 1.05 } : {}}
                >
                    {displayImage ? (
                        <img 
                            src={displayImage} 
                            alt="Cover" 
                            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-100' : 'scale-110 grayscale'}`}
                        />
                    ) : (
                        <Music size={20} className="text-zinc-600" />
                    )}
                </motion.div>

                <div className="flex-1 overflow-hidden min-w-0">
                    <h3 className="text-white font-bold text-xs lg:text-sm truncate leading-tight cursor-default">
                        {currentTrack ? currentTrack.title : "Sin Pista"}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-white/60 text-[9px] lg:text-[10px] font-medium uppercase truncate">
                            {currentTrack?.genre || "OST"}
                        </p>
                    </div>
                </div>
                
                <button disabled={!isUserPro} className={`transition-transform active:scale-90 ${isPlaying ? 'text-[#1DB954]' : 'text-white hover:text-[#1DB954]'}`}>
                    <Heart size={16} fill={isPlaying ? "#1DB954" : "transparent"} />
                </button>
            </div>

            {/* BARRA DE PROGRESO */}
            <div className="w-full mb-2 lg:mb-4">
                <div className="flex justify-end mb-1">
                    <span className="text-[8px] lg:text-[9px] font-mono font-bold text-white/90 tracking-wider">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>

                <div 
                    ref={progressBarRef}
                    onClick={handleProgressBarClick}
                    className={`group/bar w-full h-1 bg-white/0 rounded-full overflow-hidden relative py-2 -my-2 flex items-center ${isUserPro ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-white/30 rounded-full pointer-events-none"></div>
                    <motion.div 
                        className="h-1 bg-white rounded-full relative pointer-events-none"
                        style={{ width: `${progressPercent}%` }}
                        transition={{ ease: "linear", duration: 0.1 }}
                    >
                        {isUserPro && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Controles */}
            <div className="flex justify-between items-center">
                <button disabled={!isUserPro} className="text-white/60 hover:text-white transition-colors"><Shuffle size={14} /></button>
                
                <div className="flex items-center gap-4 lg:gap-5">
                    <button onClick={handlePrev} disabled={!isUserPro} className="text-white hover:text-white/70 hover:-translate-x-0.5 transition-all disabled:opacity-50">
                        <SkipBack size={18} fill="currentColor" />
                    </button>
                    
                    <button 
                        onClick={toggleAudio} 
                        disabled={!isUserPro}
                        className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                    </button>
                    
                    <button onClick={handleNext} disabled={!isUserPro} className="text-white hover:text-white/70 hover:translate-x-0.5 transition-all disabled:opacity-50">
                        <SkipForward size={18} fill="currentColor" />
                    </button>
                </div>

                <button 
                    onClick={() => isUserPro && setShowPlaylist(!showPlaylist)} 
                    disabled={!isUserPro}
                    className={`transition-colors relative ${showPlaylist ? 'text-[#1DB954]' : 'text-white/60 hover:text-white'}`}
                >
                    <ListMusic size={16} />
                </button>
            </div>
        </div>

        {/* Playlist Overlay */}
        <AnimatePresence>
            {showPlaylist && isUserPro && (
                <motion.div 
                    initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute inset-0 bg-[#000000]/95 z-30 flex flex-col"
                >
                    <div className="flex justify-between items-center p-4 border-b border-white/10">
                        <span className="text-[10px] font-black uppercase text-white/80 tracking-widest flex items-center gap-2">
                            Playlist ({playlist.length})
                        </span>
                        <button onClick={() => setShowPlaylist(false)} className="text-white hover:rotate-90 transition-all">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto hide-scroll p-2 space-y-1">
                        {playlist.map((track) => (
                            <div 
                                key={track.id} 
                                onClick={() => playTrack(track)}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${currentTrack?.id === track.id ? 'bg-white/10 border border-white/5' : 'hover:bg-white/5 border border-transparent'}`}
                            >
                                <div className="relative w-8 h-8 rounded bg-white/5 overflow-hidden flex-shrink-0">
                                    {track.cover_url ? (
                                        <img src={track.cover_url} className="w-full h-full object-cover opacity-80" alt="mini" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                            <Music size={12} className="text-white/50"/>
                                        </div>
                                    )}
                                    {currentTrack?.id === track.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <div className="w-1 h-3 bg-[#1DB954] animate-pulse rounded-full mx-[1px]"></div>
                                            <div className="w-1 h-4 bg-[#1DB954] animate-pulse rounded-full mx-[1px] animation-delay-75"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-[10px] font-bold truncate ${currentTrack?.id === track.id ? 'text-[#1DB954]' : 'text-white'}`}>
                                        {track.title}
                                    </h4>
                                </div>
                                <span className="text-[9px] font-mono text-white/30">{track.duration}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};


// =====================================================================
// READER PAGE (Lógica y Layout Final)
// =====================================================================

export const ReaderPage = () => {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  
  const [images, setImages] = useState<ChapterImage[]>([]);
  const [navData, setNavData] = useState<NavigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Estados de Usuario
  const [isUserPro] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  // Modales
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCoinModal, setShowCoinModal] = useState(false);

  // Estados Playlist
  const [playlist, setPlaylist] = useState<OST[]>([]);
  const [currentTrack, setCurrentTrack] = useState<OST | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. FETCH USUARIO Y MONEDAS (WordPress)
  const fetchUserProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    const user = await refreshUser();
    if (user) {
      setUserId(String(user.id));
      setUsername(user.username || 'Usuario');
      setUserCoins(user.coins || 0);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUserId(String(stored.id));
      setUsername(stored.username || 'Usuario');
      setUserCoins(stored.coins || 0);
    }
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleCoinModalClose = () => {
    setShowCoinModal(false);
    fetchUserProfile();
  };

  // 2. AUDIO
  const toggleAudio = useCallback(() => setIsPlaying((prev) => !prev), []);
  const handleNext = useCallback(() => {
      if (!currentTrack || playlist.length === 0) return;
      const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
      const nextIndex = (currentIndex + 1) % playlist.length;
      setCurrentTrack(playlist[nextIndex]);
  }, [currentTrack, playlist]);
  const handlePrev = useCallback(() => {
      if (!currentTrack || playlist.length === 0) return;
      const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
      const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      setCurrentTrack(playlist[prevIndex]);
  }, [currentTrack, playlist]);
  const playTrack = useCallback((track: OST) => { setCurrentTrack(track); setIsPlaying(true); }, []);
  const onSeek = useCallback((time: number) => { if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); } }, []);
  const onOpenSubscription = () => { setShowSubscriptionModal(true); };

  useEffect(() => {
    if (!currentTrack) return;
    if(!audioRef.current) audioRef.current = new Audio(currentTrack.url);
    const audio = audioRef.current;
    if (audio.src !== currentTrack.url) { audio.src = currentTrack.url; audio.load(); if(isPlaying) audio.play().catch(e => console.error(e)); }
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => handleNext(); 
    audio.addEventListener('timeupdate', updateTime); audio.addEventListener('loadedmetadata', updateDuration); audio.addEventListener('ended', handleEnded);
    return () => { audio.removeEventListener('timeupdate', updateTime); audio.removeEventListener('loadedmetadata', updateDuration); audio.removeEventListener('ended', handleEnded); };
  }, [currentTrack, handleNext, isPlaying]); 
  useEffect(() => { if (audioRef.current) { if (isPlaying) { audioRef.current.play().catch(e => console.error(e)); } else { audioRef.current.pause(); } } }, [isPlaying]);


  // 3. FETCH CAPÍTULO (desde WordPress API)
  useEffect(() => {
    startGlobalLoading(10);
    window.scrollTo(0, 0);
    setImages([]);
    setNavData(null);
    setLoading(true);
    setError(null);

    const WP_API = WORDPRESS_POSTS_API;
    const MM_API = MANGAMUKAI_API;

    const fetchChapterData = async () => {
      if (!chapterId) {
        setLoading(false);
        finishGlobalLoading();
        return;
      }

      try {
        const token = getStoredToken();

        // 3.1 Metadata del capítulo (sin content — myCRED lo filtra en la WP REST API)
        const res = await fetch(
          `${WP_API}/${chapterId}?_fields=id,title,categories,ero_seri,ero_chapter,mm_chapter_info`
        );
        if (!res.ok) throw new Error("Capítulo no encontrado");
        const wpChapter = await res.json();
        updateGlobalLoading(32);

        const chapterNum  = Number(wpChapter.ero_chapter) || 0;
        const mangaPostId = wpChapter.ero_seri ? String(wpChapter.ero_seri) : '';
        const categoryId  = wpChapter.categories?.[0];

        // 3.2 Contenido vía endpoint propio (bypassa el filtro de myCRED)
        const contentRes = await fetch(
          `${MM_API}/chapters/content?id=${chapterId}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        const contentData = await contentRes.json();

        if (contentData.success && Array.isArray(contentData.images) && contentData.images.length > 0) {
          const extractedImages: ChapterImage[] = contentData.images.map((url: string, idx: number) => ({
            id: String(idx),
            image_url: url,
            page_number: idx + 1,
          }));
          setImages(extractedImages);
          updateGlobalLoading(68);
          await preloadImages(extractedImages.map((image) => image.image_url));
        } else if (contentData.locked) {
          setError(contentData.message || 'Este capítulo requiere ser desbloqueado.');
        } else if (contentData.success && (!contentData.images || contentData.images.length === 0)) {
          setError('Este capítulo no tiene imágenes disponibles.');
        }

        // 3.3 Hermanos para navegación prev/next
        let prevId: string | null = null;
        let nextId: string | null = null;
        let nextChapterNum: number | null = null;
        let nextIsPaid = false;
        let nextPrice = 0;

        // Estrategia 1: endpoint propio por ero_seri (todos los capítulos, bien ordenados)
        if (mangaPostId) {
          const sibRes = await fetch(`${MM_API}/series/${mangaPostId}/chapters`);
          if (sibRes.ok) {
            const sibData = await sibRes.json();
            if (sibData.success && Array.isArray(sibData.chapters) && sibData.chapters.length > 0) {
               
              const siblings: any[] = sibData.chapters; // ya vienen ordenados por chapter_number ASC
              const idx = siblings.findIndex((c: any) => String(c.id) === String(chapterId));
              if (idx > 0)        prevId = String(siblings[idx - 1].id);
              if (idx !== -1 && idx < siblings.length - 1) {
                const next = siblings[idx + 1];
                nextId         = String(next.id);
                nextChapterNum = Number(next.chapter_number) || null;
                nextIsPaid     = !!next.is_paid;
                if (nextIsPaid) nextPrice = Number(next.price_coins) || 0;
              }
            }
          }
        }

        // Estrategia 2: fallback por categoría si el endpoint de series no devolvió datos
        if (!prevId && !nextId && categoryId) {
          const sibRes = await fetch(
            `${WP_API}?categories=${categoryId}&per_page=100&_fields=id,ero_chapter,myCRED_sell_content,mm_chapter_info`
          );
          if (sibRes.ok) {
             
            const siblings: any[] = await sibRes.json();
            siblings.sort((a: any, b: any) => Number(a.ero_chapter) - Number(b.ero_chapter));
            const idx = siblings.findIndex((c: any) => String(c.id) === String(chapterId));
            if (idx > 0) prevId = String(siblings[idx - 1].id);
            if (idx !== -1 && idx < siblings.length - 1) {
              const next = siblings[idx + 1];
              nextId         = String(next.id);
              nextChapterNum = Number(next.ero_chapter) || null;
              const mmInfo   = next.mm_chapter_info;
              const mc       = next.myCRED_sell_content;
              if (mmInfo) {
                nextIsPaid = !!mmInfo.is_paid;
                if (nextIsPaid) nextPrice = mmInfo.price || 0;
              } else {
                nextIsPaid = !!(mc && mc.status !== 'disabled' && Number(mc.price) > 0);
                if (nextIsPaid) nextPrice = Number(mc.price) || 0;
              }
            }
          }
        }

        // Verificar si el usuario ya compró el siguiente capítulo
        let isNextUnlocked = !nextIsPaid;
        if (nextIsPaid && nextId && token) {
          const unlocked = await getUnlockedChapters();
          isNextUnlocked = unlocked.has(nextId);
        }

        setNavData({
          prevId,
          nextId,
          mangaId: mangaPostId || String(categoryId || ''),
          title: wpChapter.title?.rendered || `Capítulo ${chapterNum}`,
          chapterNum,
          nextChapterNum,
          nextIsPaid,
          nextPrice,
          isNextUnlocked,
        });

        // Registrar visita (no bloquea el render)
        if (chapterId && mangaPostId) {
          trackChapterView(chapterId, mangaPostId);
        }

        setPlaylist([]);
        setCurrentTrack(null);
        updateGlobalLoading(92);

      } catch (err: unknown) {
        console.error("Error cargando lector:", err);
        setError("No se pudo cargar el capítulo.");
      } finally {
        setLoading(false);
        finishGlobalLoading();
      }
    };
    void fetchChapterData();
    return () => finishGlobalLoading();
  }, [chapterId]);


  // 4. NAVEGACIÓN con compra si el capítulo siguiente es de pago
  const handleNextClick = async () => {
    if (!navData?.nextId) return;

    // Capítulo libre o ya desbloqueado → navegar directo
    if (!navData.nextIsPaid || navData.isNextUnlocked) {
      navigate(`/read/${navData.nextId}`);
      return;
    }

    // Sin sesión → no puede comprar
    if (!userId) {
      alert('Debes iniciar sesión para desbloquear este capítulo.');
      return;
    }

    // Sin monedas suficientes → abrir tienda
    if (userCoins < navData.nextPrice) {
      setShowCoinModal(true);
      return;
    }

    // Comprar capítulo
    setUnlocking(true);
    try {
      const result = await buyChapter(navData.nextId);
      if (result.success) {
        setUserCoins(result.coins);
        setNavData(prev => prev ? { ...prev, isNextUnlocked: true } : prev);
        navigate(`/read/${navData.nextId}`);
      } else if (result.message.includes('saldo') || result.message.includes('insuficiente')) {
        setShowCoinModal(true);
      } else {
        alert('Error: ' + (result.message || 'No se pudo desbloquear'));
      }
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black" />;
  if (error) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-6 px-4">
      <Lock className="w-16 h-16 text-yellow-400" />
      <div className="text-center">
        <h2 className="text-xl font-black text-white mb-2">Capítulo Bloqueado</h2>
        <p className="text-zinc-400 text-sm max-w-xs">{error}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition-colors">Volver</button>
      </div>
    </div>
  );

  const showLockState = navData?.nextIsPaid && !navData?.isNextUnlocked;

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col items-center">

      {/* NAVBAR FLOTANTE - BAJADO MÁS ABAJO (top-24) */}
      <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="fixed top-24 left-0 w-full px-4 z-50 pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
            {/* BOTÓN BACK: Vuelve al historial (Lista de Capítulos) */}
            <button onClick={() => navigate(-1)} className="pointer-events-auto w-12 h-12 flex items-center justify-center rounded-full bg-black/80 backdrop-blur-xl text-white hover:bg-[#FF4D88] hover:scale-105 transition-all border border-zinc-800 shadow-2xl group">
                <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="hidden md:flex pointer-events-auto bg-black/80 backdrop-blur-xl px-6 py-2.5 rounded-full border border-zinc-800 text-white/90 text-sm font-bold shadow-2xl items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF4D88] animate-pulse"></span>
                Capítulo {navData?.chapterNum}
            </div>
        </div>
      </motion.div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 pt-52 px-4 pb-20 relative">

        {/* IZQUIERDA: REPRODUCTOR - ESTATICO (NO STICKY) */}
        <aside className="order-1 lg:order-1 w-full max-w-[400px] lg:w-64 h-fit z-40 shrink-0">
             <SpotifyPlayer 
                currentTrack={currentTrack} isPlaying={isPlaying} toggleAudio={toggleAudio} handleNext={handleNext} handlePrev={handlePrev} showPlaylist={showPlaylist} setShowPlaylist={setShowPlaylist} playlist={playlist} playTrack={playTrack}
                coverFallback="" currentTime={currentTime} duration={duration} onSeek={onSeek} isUserPro={isUserPro} onOpenSubscription={onOpenSubscription}
             />
        </aside>

        {/* CENTRAL: LECTOR */}
        <main className="order-2 lg:order-2 flex-1 w-full max-w-[800px] mx-auto bg-black border-x border-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] min-h-[50vh] flex flex-col items-center relative z-10">
          {images.length > 0 ? (
              images.map((img) => (
              <img 
                  key={img.id} src={img.image_url} alt={`Página ${img.page_number}`}
                  className="w-full h-auto block select-none mb-1"
                  loading="lazy" style={{ display: 'block' }} 
              />
              ))
          ) : (
              <div className="h-96 flex flex-col items-center justify-center text-zinc-500 gap-4"><p>Sin páginas.</p></div>
          )}

          {/* Footer Navegación */}
          <div className="w-full bg-zinc-950 p-8 md:p-12 flex flex-col gap-8 border-t border-zinc-900 mt-48"> 
             <div className="text-center space-y-2">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em]">Fin del capítulo {navData?.chapterNum}</p>
              <h3 className="text-white font-black text-xl md:text-2xl tracking-tight">{navData?.title || "Sin título"}</h3>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                <button onClick={() => navData?.prevId && navigate(`/read/${navData.prevId}`)} disabled={!navData?.prevId} className={`w-full md:flex-1 h-14 flex items-center justify-center gap-2 rounded-xl font-bold transition-all border ${navData?.prevId ? 'bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-800' : 'bg-transparent text-zinc-800 cursor-not-allowed border-transparent'}`}> <ChevronLeft size={20} /> Anterior </button>
                <button onClick={() => navigate(`/manga/${navData?.mangaId}`)} className="w-14 h-14 shrink-0 flex items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors"> <Home size={22} /> </button>
                
                {/* BOTÓN SIGUIENTE INTELIGENTE */}
                <button 
                    onClick={handleNextClick} 
                    disabled={!navData?.nextId || unlocking} 
                    className={`
                        w-full md:flex-1 h-14 flex items-center justify-center gap-3 rounded-xl font-black transition-all shadow-lg relative overflow-hidden group
                        ${!navData?.nextId ? 'bg-zinc-900/30 text-zinc-600 cursor-not-allowed border border-zinc-800' 
                          : showLockState ? 'bg-yellow-400 text-black hover:bg-yellow-300 border border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.3)]' 
                          : 'bg-[#FF4D88] text-white hover:bg-pink-600 border border-transparent' }
                    `}
                >
                    {unlocking ? (
                         <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={18}/> Procesando...</div>
                    ) : !navData?.nextId ? (
                        <span className="text-sm font-medium opacity-50">¡Estás al día!</span>
                    ) : showLockState ? (
                        /* BLOQUEADO (Pagar) */
                        <>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[9px] uppercase font-bold opacity-70">Capítulo {navData.nextChapterNum}</span>
                                <span className="text-sm font-black italic">
                                    {userCoins >= navData.nextPrice ? "DESBLOQUEAR" : "RECARGAR"}
                                </span>
                            </div>
                            <div className="w-[1px] h-6 bg-black/20 mx-1"></div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm ${userCoins >= navData.nextPrice ? 'bg-black/10' : 'bg-red-500/10 text-red-900'}`}>
                                <Lock size={14} className="text-black" />
                                <span className="text-sm font-black flex items-center gap-1">
                                    {navData.nextPrice} <Coins size={12} strokeWidth={3} />
                                </span>
                            </div>
                        </>
                    ) : (
                        /* DESBLOQUEADO (Siguiente) */
                        <> <div className="flex flex-col items-start leading-none text-left"> <span className="text-[9px] uppercase font-bold opacity-70">Capítulo {navData.nextChapterNum}</span> <span className="text-sm font-black italic">SIGUIENTE</span> </div> <ChevronRight size={20} /> </>
                    )}
                </button>
            </div>
          </div>
        </main>

        {/* DERECHA: REDES - ESTATICO (NO STICKY) */}
        <aside className="order-3 lg:order-3 w-full max-w-[400px] lg:w-64 h-fit z-40 shrink-0 flex flex-col gap-4">
           <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 shadow-xl text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-[#FF4D88]/10 to-transparent opacity-50 pointer-events-none"></div>
               <h4 className="text-white font-bold text-xs uppercase tracking-widest relative z-10">Comunidad</h4>
               <p className="text-zinc-400 text-[10px] leading-relaxed relative z-10">Únete a nuestro servidor de Discord y síguenos en redes.</p>
               
               <div className="flex items-center justify-center gap-3 relative z-10 mt-2">
                   {/* Discord (Usando color #5865F2) */}
                   <a 
                     href="https://discord.gg/ZXt4SUxH"
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#5865F2] hover:border-[#5865F2] transition-all group"
                   >
                       <Github size={18} className="group-hover:scale-110 transition-transform"/>
                   </a>

                   {/* Instagram */}
                   <a 
                     href="https://www.instagram.com/mangamukai/"
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-gradient-to-tr hover:from-yellow-500 hover:via-red-500 hover:to-purple-500 hover:border-transparent transition-all group"
                   >
                       <Instagram size={18} className="group-hover:scale-110 transition-transform" />
                   </a>

                   {/* Telegram */}
                   <a 
                     href="https://t.me/+J6TE0l401vRhZTYx"
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#0088cc] hover:border-[#0088cc] transition-all group"
                   >
                       <Send size={18} className="group-hover:scale-110 transition-transform -ml-0.5 mt-0.5" />
                   </a>
               </div>

               <div className="flex items-center justify-center gap-3 relative z-10">
                   {/* WhatsApp */}
                   <a 
                     href="https://wa.me/51926615198"
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#25D366] hover:border-[#25D366] transition-all group"
                   >
                       <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                   </a>

                   {/* YouTube */}
                   <a 
                     href="https://www.youtube.com/@MangaMukai-b3"
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#FF0000] hover:border-[#FF0000] transition-all group"
                   >
                       <Youtube size={18} className="group-hover:scale-110 transition-transform" />
                   </a>
               </div>
           </div>
        </aside>

      </div>
      
      {/* MODALES */}
      <CoinMarketModal isOpen={showCoinModal} onClose={handleCoinModalClose} username={username} userId={userId} />
      <SubscriptionModal isOpen={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} />

    </div>
  );
};
