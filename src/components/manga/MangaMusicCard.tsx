import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
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
import { getMusicTracks, type MusicTrack } from '../../services/communityService';
import { SubscriptionModal } from '../modals';

interface MangaMusicCardProps {
  cover: string;
  compactHeight?: boolean;
  isLight?: boolean;
}

const formatTime = (time: number) => {
  if (!Number.isFinite(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const MangaMusicCard = ({ cover, compactHeight = false, isLight = false }: MangaMusicCardProps) => {
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [trackLiked, setTrackLiked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getMusicTracks()
      .then((items) => {
        if (!active) return;
        setPlaylist(items);
        setCurrentTrack(items[0] || null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const canPlay = Boolean(currentTrack?.url && !currentTrack.is_locked);
  const isLocked = !loading && !canPlay;
  const displayImage = currentTrack?.cover_url || cover;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const handleNext = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex((track) => track.id === currentTrack.id);
    setCurrentTrack(playlist[(currentIndex + 1) % playlist.length]);
    setTrackLiked(false);
  }, [currentTrack, playlist]);

  const handlePrev = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex((track) => track.id === currentTrack.id);
    setCurrentTrack(playlist[(currentIndex - 1 + playlist.length) % playlist.length]);
    setTrackLiked(false);
  }, [currentTrack, playlist]);

  useEffect(() => {
    if (!currentTrack || !canPlay) {
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(currentTrack.url);
    audioRef.current = audio;
    setAudioError(false);
    setCurrentTime(0);
    setDuration(0);

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleError = () => {
      setAudioError(true);
      setIsPlaying(false);
    };
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleNext);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleNext);
      audio.removeEventListener('error', handleError);
    };
  }, [canPlay, currentTrack, handleNext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !canPlay) return;
    if (isPlaying) {
      void audio.play().catch(() => {
        setAudioError(true);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [canPlay, isPlaying]);

  const handleProgressBarClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!canPlay || !progressBarRef.current || !duration || !audioRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const nextTime = ((event.clientX - rect.left) / rect.width) * duration;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const playTrack = (track: MusicTrack) => {
    if (track.is_locked || !track.url) {
      setShowSubscription(true);
      return;
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setShowPlaylist(false);
    setTrackLiked(false);
  };

  return (
    <>
      <aside className={`manga-music-card group relative flex w-full flex-col overflow-hidden rounded-[24px] border shadow-2xl ${isLocked ? 'is-locked' : ''} ${compactHeight ? 'h-[215px] lg:h-[235px]' : 'h-[220px] lg:h-[250px]'} ${isLight ? 'bg-white' : 'bg-black'} ${audioError ? 'border-red-500/50' : isLight ? 'border-black/15' : 'border-white/20'}`}>
        {isLocked && (
          <div className={`manga-music-lock-overlay absolute inset-0 z-50 flex flex-col items-center justify-center ${isLight ? 'bg-white/[0.97]' : 'bg-black/[0.94]'}`}>
            <div className="flex animate-in flex-col items-center p-6 text-center duration-500 fade-in zoom-in">
              <div className="relative mb-3">
                <div className="absolute inset-0 rounded-full bg-[#FF4D88] opacity-20 blur-xl" />
                <div className={`relative z-10 rounded-full border p-3 ${isLight ? 'border-black/10 bg-zinc-100 text-zinc-600' : 'border-white/10 bg-zinc-900 text-zinc-400'}`}><Lock size={20} /></div>
              </div>
              <h3 className={`mb-1 text-lg font-black uppercase italic tracking-tighter ${isLight ? 'text-black' : 'text-white'}`}>Mukai <span className="text-[#FF4D88]">Music</span></h3>
              <p className={`mb-4 max-w-[230px] text-[10px] font-medium leading-relaxed ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Desbloquea los Soundtracks y escucha música mientras lees.</p>
              <button type="button" onClick={() => setShowSubscription(true)} className={`manga-detail-ui-label group relative flex items-center gap-2 rounded-full px-6 py-2 text-[10px] uppercase transition-all hover:bg-[#FF4D88] hover:text-white hover:shadow-[0_0_20px_rgba(255,77,136,0.4)] ${isLight ? 'bg-black text-white shadow-[0_0_15px_rgba(0,0,0,0.12)]' : 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}>Desbloquear</button>
            </div>
          </div>
        )}

        {loading && <div className={`absolute inset-0 z-50 flex items-center justify-center ${isLight ? 'bg-white' : 'bg-black'}`}><Loader2 size={22} className={`animate-spin ${isLight ? 'text-black/50' : 'text-white/50'}`} /></div>}

        <div className="absolute inset-0 z-0 overflow-hidden rounded-[24px]">
          {displayImage ? <img src={displayImage} className={`h-full w-full scale-110 object-cover ${isLight ? 'opacity-[0.08]' : 'opacity-20'}`} alt="" aria-hidden="true" /> : <div className={`h-full w-full ${isLight ? 'bg-zinc-100' : 'bg-zinc-900/50'}`} />}
          <div className={`absolute inset-0 bg-gradient-to-t ${isLight ? 'from-white via-white/85 to-transparent' : 'from-black via-black/80 to-transparent'}`} />
        </div>

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

            <button type="button" disabled={!canPlay} onClick={() => setTrackLiked((liked) => !liked)} className={`transition-transform active:scale-90 disabled:opacity-40 ${trackLiked ? 'text-[#1DB954]' : isLight ? 'text-black hover:text-[#1DB954]' : 'text-white hover:text-[#1DB954]'}`} aria-label="Marcar canción como favorita">
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
              <button type="button" onClick={handlePrev} disabled={!canPlay} className={`transition-all hover:-translate-x-0.5 disabled:opacity-40 ${isLight ? 'text-black hover:text-black/70' : 'text-white hover:text-white/70'}`}><SkipBack size={18} fill="currentColor" /></button>
              <button type="button" onClick={() => setIsPlaying((playing) => !playing)} disabled={!canPlay} className={`flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 lg:h-10 lg:w-10 ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`} aria-label={isPlaying ? 'Pausar música' : 'Reproducir música'}>
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
              </button>
              <button type="button" onClick={handleNext} disabled={!canPlay} className={`transition-all hover:translate-x-0.5 disabled:opacity-40 ${isLight ? 'text-black hover:text-black/70' : 'text-white hover:text-white/70'}`}><SkipForward size={18} fill="currentColor" /></button>
            </div>
            <button type="button" onClick={() => canPlay && setShowPlaylist((show) => !show)} disabled={!canPlay} className={`relative transition-colors disabled:opacity-40 ${showPlaylist ? 'text-[#1DB954]' : isLight ? 'text-black/60 hover:text-black' : 'text-white/60 hover:text-white'}`} aria-label="Mostrar lista de reproducción"><ListMusic size={16} /></button>
          </div>
        </div>

        <AnimatePresence>
          {showPlaylist && canPlay && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className={`absolute inset-0 z-30 flex flex-col ${isLight ? 'bg-white/95' : 'bg-black/95'}`}>
              <div className={`flex items-center justify-between border-b p-4 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-black/80' : 'text-white/80'}`}>Playlist ({playlist.length})</span>
                <button type="button" onClick={() => setShowPlaylist(false)} className={`transition-all hover:rotate-90 ${isLight ? 'text-black' : 'text-white'}`}><X size={14} /></button>
              </div>
              <div className="hide-scroll flex-1 space-y-1 overflow-y-auto p-2">
                {playlist.map((track) => (
                  <button type="button" key={track.id} onClick={() => playTrack(track)} className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-all ${currentTrack?.id === track.id ? isLight ? 'border-black/5 bg-black/10' : 'border-white/5 bg-white/10' : isLight ? 'border-transparent hover:bg-black/5' : 'border-transparent hover:bg-white/5'}`}>
                    <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>{track.cover_url ? <img src={track.cover_url} className="h-full w-full object-cover opacity-80" alt="" /> : <Music size={12} className={isLight ? 'text-black/50' : 'text-white/50'} />}</div>
                    <h4 className={`min-w-0 flex-1 truncate text-[10px] font-bold ${currentTrack?.id === track.id ? 'text-[#1DB954]' : isLight ? 'text-black' : 'text-white'}`}>{track.title}</h4>
                    <span className={`font-mono text-[9px] ${isLight ? 'text-black/35' : 'text-white/30'}`}>{track.duration}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      <SubscriptionModal isOpen={showSubscription} onClose={() => setShowSubscription(false)} />
    </>
  );
};
