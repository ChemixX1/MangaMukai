import { useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart,
  ListMusic,
  Loader2,
  Lock,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import {
  isPlayableTrack,
  playNext,
  playPrev,
  seekTo,
  selectTrack,
  toggleLike,
  togglePlay,
  useMusicPlayer,
} from '../../services/musicPlayer';
import { openSubscriptionModal } from '../../utils/subscriptionModal';

interface MangaMusicCardProps {
  cover: string;
  compactHeight?: boolean;
  isLight?: boolean;
  singleLineDescription?: boolean;
}

const formatTime = (time: number) => {
  if (!Number.isFinite(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const MangaMusicCard = ({ cover, compactHeight = false, isLight = false, singleLineDescription = false }: MangaMusicCardProps) => {
  // Estado compartido: la misma lista y el mismo audio en la ficha y en el lector.
  const { tracks, loading, currentId, isPlaying, currentTime, duration, error: audioError, likedIds } = useMusicPlayer();
  const [showPlaylist, setShowPlaylist] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const currentTrack = tracks.find((track) => track.id === currentId) ?? null;
  const canPlay = isPlayableTrack(currentTrack);
  const isLocked = !loading && !canPlay;
  const trackLiked = currentTrack ? likedIds.includes(currentTrack.id) : false;
  const displayImage = currentTrack?.cover_url || cover;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const handleProgressBarClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!canPlay || !progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    seekTo(((event.clientX - rect.left) / rect.width) * duration);
  };

  const playTrack = (id: number, locked: boolean) => {
    if (locked) {
      openSubscriptionModal();
      return;
    }
    selectTrack(id);
    setShowPlaylist(false);
  };

  return (
    <aside className={`manga-music-card group relative isolate flex w-full flex-col overflow-hidden rounded-[24px] border shadow-none ${isLocked ? 'is-locked' : ''} ${compactHeight ? 'h-[215px] lg:h-[235px]' : 'h-[220px] lg:h-[250px]'} ${isLight ? 'bg-white text-black' : 'bg-[#0a0a0d] text-white'} ${audioError ? 'border-red-500/50' : isLight ? 'border-black/15' : 'border-white/20'}`}>
      {isLocked && (
        <div className={`manga-music-lock-overlay absolute inset-0 z-50 flex flex-col items-center justify-center ${isLight ? 'bg-white' : 'bg-[#0a0a0d]'}`}>
          <div className="flex flex-col items-center p-6 text-center">
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full bg-[#FF4D88] opacity-20 blur-xl" />
              <div className={`relative z-10 rounded-full border p-3 ${isLight ? 'border-black/10 bg-zinc-100 text-zinc-600' : 'border-white/10 bg-zinc-900 text-zinc-400'}`}><Lock size={20} /></div>
            </div>
            <h3 className={`mb-1 text-lg font-black uppercase italic tracking-tighter ${isLight ? 'text-black' : 'text-white'}`}>Mukai <span className="text-[#FF4D88]">Music</span></h3>
            <p className={`mb-4 font-medium leading-relaxed ${singleLineDescription ? 'whitespace-nowrap text-[9px] sm:text-[11px]' : 'max-w-[230px] text-[10px]'} ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Desbloquea los Soundtracks y escucha música mientras lees.</p>
            <button type="button" onClick={openSubscriptionModal} className={`manga-detail-ui-label group relative flex items-center gap-2 rounded-full px-6 py-2 text-[10px] uppercase transition-all hover:bg-[#FF4D88] hover:text-white hover:shadow-[0_0_20px_rgba(255,77,136,0.4)] ${isLight ? 'bg-black text-white shadow-[0_0_15px_rgba(0,0,0,0.12)]' : 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}>Desbloquear</button>
          </div>
        </div>
      )}

      {loading && <div className={`absolute inset-0 z-50 flex items-center justify-center ${isLight ? 'bg-white' : 'bg-[#0a0a0d]'}`}><Loader2 size={22} className={`animate-spin ${isLight ? 'text-black/50' : 'text-white/50'}`} /></div>}

      {/* Fondo sólido: el degradado con transparencia dejaba ver el fondo de la
          página durante el cambio de tema. */}
      <div aria-hidden="true" className={`absolute -inset-px z-0 rounded-[24px] ${isLight ? 'bg-white' : 'bg-[#0a0a0d]'}`} />

      <div className="z-20 flex items-center justify-between px-5 pt-4">
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-black/45' : 'text-white/40'}`}>Now Playing</span>
        <button type="button" disabled={!canPlay} className={`transition-colors disabled:opacity-40 ${isLight ? 'text-black/45 hover:text-black' : 'text-white/40 hover:text-white'}`}><MoreHorizontal size={14} /></button>
      </div>

      <div className="z-20 flex flex-1 flex-col justify-end px-5 pb-5">
        <div className="mb-2 flex items-center gap-4 lg:mb-4">
          <motion.div className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border lg:h-14 lg:w-14 ${isLight ? 'border-black/10 bg-zinc-100' : 'border-white/10 bg-zinc-900'}`} whileHover={canPlay ? { scale: 1.05 } : {}}>
            {displayImage ? <img src={displayImage} alt="Cover" className={`h-full w-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-100' : 'scale-110 grayscale'}`} /> : <Music size={20} className={isLight ? 'text-zinc-400' : 'text-zinc-600'} />}
          </motion.div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <h3 className={`truncate text-xs font-bold leading-tight lg:text-sm ${isLight ? 'text-black' : 'text-white'}`}>{currentTrack?.title || 'Sin Pista'}</h3>
            <p className={`mt-0.5 truncate text-[9px] font-medium uppercase lg:text-[10px] ${isLight ? 'text-black/60' : 'text-white/60'}`}>{currentTrack?.genre || 'OST'}</p>
          </div>

          <button type="button" disabled={!canPlay} onClick={() => currentTrack && toggleLike(currentTrack.id)} className={`transition-transform active:scale-90 disabled:opacity-40 ${trackLiked ? 'text-[#1DB954]' : isLight ? 'text-black hover:text-[#1DB954]' : 'text-white hover:text-[#1DB954]'}`} aria-label="Marcar canción como favorita">
            <Heart size={16} fill={trackLiked ? 'currentColor' : 'transparent'} />
          </button>
        </div>

        <div className="mb-2 w-full lg:mb-4">
          <div className="mb-1 flex justify-end"><span className={`font-mono text-[8px] font-bold tracking-wider lg:text-[9px] ${isLight ? 'text-black/90' : 'text-white/90'}`}>{formatTime(currentTime)} / {formatTime(duration)}</span></div>
          <div ref={progressBarRef} onClick={handleProgressBarClick} className={`group/bar relative -my-2 flex h-1 w-full items-center overflow-hidden rounded-full bg-white/0 py-2 ${canPlay ? 'cursor-pointer' : 'cursor-default'}`}>
            <div className={`pointer-events-none absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full ${isLight ? 'bg-black/25' : 'bg-white/30'}`} />
            <motion.div className={`pointer-events-none relative h-1 rounded-full ${isLight ? 'bg-black' : 'bg-white'}`} style={{ width: `${progressPercent}%` }} transition={{ ease: 'linear', duration: 0.1 }}>
              {canPlay && <div className={`absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover/bar:opacity-100 ${isLight ? 'bg-black shadow-[0_0_10px_rgba(0,0,0,0.45)]' : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'}`} />}
            </motion.div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" disabled={!canPlay} className={`transition-colors disabled:opacity-40 ${isLight ? 'text-black/60 hover:text-black' : 'text-white/60 hover:text-white'}`}><Shuffle size={14} /></button>
          <div className="flex items-center gap-4 lg:gap-5">
            <button type="button" onClick={() => playPrev(isPlaying)} disabled={!canPlay} className={`transition-all hover:-translate-x-0.5 disabled:opacity-40 ${isLight ? 'text-black hover:text-black/70' : 'text-white hover:text-white/70'}`}><SkipBack size={18} fill="currentColor" /></button>
            <button type="button" onClick={togglePlay} disabled={!canPlay} className={`flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 lg:h-10 lg:w-10 ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`} aria-label={isPlaying ? 'Pausar música' : 'Reproducir música'}>
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>
            <button type="button" onClick={() => playNext(isPlaying)} disabled={!canPlay} className={`transition-all hover:translate-x-0.5 disabled:opacity-40 ${isLight ? 'text-black hover:text-black/70' : 'text-white hover:text-white/70'}`}><SkipForward size={18} fill="currentColor" /></button>
          </div>
          <button type="button" onClick={() => canPlay && setShowPlaylist((show) => !show)} disabled={!canPlay} className={`relative transition-colors disabled:opacity-40 ${showPlaylist ? 'text-[#1DB954]' : isLight ? 'text-black/60 hover:text-black' : 'text-white/60 hover:text-white'}`} aria-label="Mostrar lista de reproducción"><ListMusic size={16} /></button>
        </div>
      </div>

      <AnimatePresence>
        {showPlaylist && canPlay && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className={`absolute inset-0 z-30 flex flex-col ${isLight ? 'bg-white/95' : 'bg-black/95'}`}>
            <div className={`flex items-center justify-between border-b p-4 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
              <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-black/80' : 'text-white/80'}`}>Playlist ({tracks.length})</span>
              <button type="button" onClick={() => setShowPlaylist(false)} className={`transition-all hover:rotate-90 ${isLight ? 'text-black' : 'text-white'}`}><X size={14} /></button>
            </div>
            <div className="hide-scroll flex-1 space-y-1 overflow-y-auto p-2">
              {tracks.map((track) => (
                <button type="button" key={track.id} onClick={() => playTrack(track.id, !isPlayableTrack(track))} className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-all ${currentId === track.id ? isLight ? 'border-black/5 bg-black/10' : 'border-white/5 bg-white/10' : isLight ? 'border-transparent hover:bg-black/5' : 'border-transparent hover:bg-white/5'}`}>
                  <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>{track.cover_url ? <img src={track.cover_url} className="h-full w-full object-cover opacity-80" alt="" /> : <Music size={12} className={isLight ? 'text-black/50' : 'text-white/50'} />}</div>
                  <h4 className={`min-w-0 flex-1 truncate text-[10px] font-bold ${currentId === track.id ? 'text-[#1DB954]' : isLight ? 'text-black' : 'text-white'}`}>{track.title}</h4>
                  <span className={`font-mono text-[9px] ${isLight ? 'text-black/35' : 'text-white/30'}`}>{track.duration}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};
