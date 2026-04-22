import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, SkipBack, SkipForward, 
  ListMusic, X, Heart, Shuffle, MoreHorizontal, 
  Lock
} from "lucide-react";
import React, { useRef } from "react"; 

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
  
  // --- NUEVAS PROPS PARA EL BLOQUEO ---
  isUserPro: boolean;          // Determina si mostramos el candado
  onOpenSubscription: () => void; // Función para abrir el modal de pago
}

const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const SpotifyPlayer = ({ 
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

  return (
    <div className={`w-full h-[280px] relative group flex flex-col rounded-[24px] overflow-hidden border ${audioError ? 'border-red-500/50' : 'border-white/20'} bg-black`}>
        
        {/* =========================================================================
            OVERLAY DE BLOQUEO (Solo visible si NO es PRO)
           ========================================================================= */}
        {!isUserPro && (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[6px] transition-all duration-500">
                <div className="flex flex-col items-center text-center p-6 animate-in fade-in zoom-in duration-500">
                    
                    {/* Icono de Candado con brillo */}
                    <div className="relative mb-3">
                        <div className="absolute inset-0 bg-[#FF4D88] blur-xl opacity-20 rounded-full"></div>
                        <div className="bg-zinc-900 border border-white/10 p-3 rounded-full relative z-10 text-zinc-400">
                            <Lock size={20} />
                        </div>
                    </div>

                    <h3 className="text-white font-black uppercase italic tracking-tighter text-lg mb-1">
                        Mukai <span className="text-[#FF4D88]">Music</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-medium max-w-[200px] mb-4 leading-relaxed">
                        Desbloquea los Soundtracks y escucha música mientras lees.
                    </p>

                    <button 
                        onClick={onOpenSubscription}
                        className="group relative px-6 py-2 bg-white hover:bg-[#FF4D88] text-black hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,77,136,0.4)] flex items-center gap-2"
                    >
                        Desbloquear
                    </button>
                    
                    <p className="text-[8px] text-zinc-500 mt-3 font-medium tracking-wide">
                        Suscríbete y disfruta de más beneficios por tan solo $4.99
                    </p>
                </div>
             </div>
        )}

        {/* Background Img */}
        <div className="absolute inset-0 z-0 overflow-hidden rounded-[24px]">
             <img 
               src={currentTrack?.cover_url || coverFallback} 
               className="w-full h-full object-cover opacity-20 scale-110" 
               alt="bg-cover" 
             />
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
            <div className="flex items-center gap-4 mb-4">
                <motion.div 
                    className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-white/10"
                    whileHover={isUserPro ? { scale: 1.05 } : {}}
                >
                    <img 
                        src={currentTrack?.cover_url || coverFallback} 
                        alt="Cover" 
                        className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-100' : 'scale-110 grayscale'}`}
                    />
                </motion.div>

                <div className="flex-1 overflow-hidden min-w-0">
                    <h3 className="text-white font-bold text-sm truncate leading-tight cursor-default">
                        {currentTrack ? currentTrack.title : "Selecciona Pista"}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-white/60 text-[10px] font-medium uppercase truncate">
                            {currentTrack?.genre || "OST"}
                        </p>
                    </div>
                </div>
                
                <button disabled={!isUserPro} className={`transition-transform active:scale-90 ${isPlaying ? 'text-[#1DB954]' : 'text-white hover:text-[#1DB954]'}`}>
                    <Heart size={16} fill={isPlaying ? "#1DB954" : "transparent"} />
                </button>
            </div>

            {/* BARRA DE PROGRESO */}
            <div className="w-full mb-4">
                <div className="flex justify-end mb-1">
                    <span className="text-[9px] font-mono font-bold text-white/90 tracking-wider">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>

                <div 
                    ref={progressBarRef}
                    onClick={handleProgressBarClick}
                    className={`group/bar w-full h-1 bg-white/0 rounded-full overflow-hidden relative py-2 -my-2 flex items-center ${isUserPro ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    {/* Fondo del riel */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-white/30 rounded-full pointer-events-none"></div>

                    {/* Barra de progreso blanca */}
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
                
                <div className="flex items-center gap-5">
                    <button onClick={handlePrev} disabled={!isUserPro} className="text-white hover:text-white/70 hover:-translate-x-0.5 transition-all disabled:opacity-50">
                        <SkipBack size={20} fill="currentColor" />
                    </button>
                    
                    <button 
                        onClick={toggleAudio} 
                        disabled={!isUserPro}
                        className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>
                    
                    <button onClick={handleNext} disabled={!isUserPro} className="text-white hover:text-white/70 hover:translate-x-0.5 transition-all disabled:opacity-50">
                        <SkipForward size={20} fill="currentColor" />
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
                                    <img src={track.cover_url || coverFallback} className="w-full h-full object-cover opacity-80" alt="mini" />
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