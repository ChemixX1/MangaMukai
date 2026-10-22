import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Playlist01Icon, Loading03Icon, MusicNote01Icon, PauseIcon, PlayIcon, PreviousIcon, NextIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import {
  isPlayableTrack,
  playNext,
  playPrev,
  seekTo,
  selectTrack,
  setVolume,
  setMusicPlaylistOpen,
  togglePlay,
  useMusicPlayer,
} from '../../services/musicPlayer';
import { MukaiMusicPromo } from './MukaiMusicPromo';
import { useNavigate } from 'react-router-dom';
import ElasticSlider from '../ui/ElasticSlider';
import { getStoredToken } from '../../services/authService';

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

export const MangaMusicCard = ({ compactHeight = false, isLight = false }: MangaMusicCardProps) => {
  const navigate = useNavigate();

  const { tracks, loading, currentId, isPlaying, currentTime, duration, error: audioError, volume, playlistOpen: showPlaylist } = useMusicPlayer();
  const [seekPreview, setSeekPreview] = useState<{ trackId: number | null; time: number } | null>(null);
  const progressTime = seekPreview?.trackId === currentId ? seekPreview.time : currentTime;
  const [failedCover, setFailedCover] = useState<string | null>(null);

  const currentTrack = tracks.find((track) => track.id === currentId) ?? null;
  const canPlay = isPlayableTrack(currentTrack);
  // The subscription artwork is already usable for guests, even if the shared
  // library is still arriving after they move from the manga into the reader.
  const isLocked = !canPlay && (!loading || !getStoredToken());
  const canBrowsePlaylist = canPlay;
  const displayImage = currentTrack?.cover_url;

  const playTrack = (id: number, locked: boolean) => {
    if (locked) {
      navigate('/pro');
      return;
    }
    selectTrack(id);
    setMusicPlaylistOpen(false);
  };

  const heightClass = compactHeight ? 'min-h-[200px] lg:min-h-[220px]' : 'min-h-[220px] lg:min-h-[240px]';

  if (isLocked) {
    return (
      <aside aria-label="Mukai Music" className="manga-music-locked-card w-full shrink-0 overflow-hidden rounded-2xl">
        <MukaiMusicPromo />
      </aside>
    );
  }

  return (
    <aside className={`manga-music-player group relative isolate flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border shadow-sm ${heightClass} ${isLight ? 'bg-white text-black' : 'bg-[#0a0a0d] text-white'} ${audioError ? 'border-red-500/50' : isLight ? 'border-black/15' : 'border-white/20'}`}>
      {loading && <div className={`absolute inset-0 z-50 flex items-center justify-center ${isLight ? 'bg-white' : 'bg-[#0a0a0d]'}`}><HugeiconsIcon icon={Loading03Icon} size={22} className={`animate-spin ${isLight ? 'text-black/50' : 'text-white/50'}`} /></div>}


      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px z-0 rounded-2xl"
        style={{
          background: isLight
            ? 'radial-gradient(ellipse at 25% 15%, #ffffff 0%, #ffffff 45%, #f5f8ff 100%)'
            : '#0a0a0d',
        }}
      />

      <div className="z-20 flex flex-1 flex-col gap-2 px-5 pt-4 pb-2 lg:gap-3 lg:pt-5 lg:pb-2">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0">
          <motion.div className={`absolute left-0 top-0 flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-xl border bg-black ${isLight ? 'border-black/10' : 'border-white/10'}`} whileHover={canPlay ? { scale: 1.05 } : {}}>
            {displayImage && displayImage !== failedCover && <img src={displayImage} onError={() => setFailedCover(displayImage)} alt="Portada de la pista" className={`h-full w-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-100' : 'scale-110'}`} />}
          </motion.div>
          </div>

          <div className="min-w-0 flex-1 overflow-hidden pl-3">
            <h3 className={`truncate text-base font-semibold leading-tight ${isLight ? 'text-black' : 'text-white'}`}>{currentTrack?.title || 'Sin Pista'}</h3>
            <p className={`mt-0.5 truncate text-[9px] font-medium uppercase lg:text-[10px] ${isLight ? 'text-black/60' : 'text-white/60'}`}>{currentTrack?.genre || 'OST'}</p>
          </div>

        </div>

        <div className="mt-1.5 w-full">
          <ElasticSlider
            key={currentId}
            value={progressTime}
            maxValue={duration || 1}
            onChange={(time) => setSeekPreview({ trackId: currentId, time })}
            onChangeEnd={(time) => {
              seekTo(time);
              setSeekPreview(null);
            }}
            disabled={!canPlay || !duration}
            ariaLabel="Progreso de la canción"
            leftIcon={null}
            rightIcon={null}
            valuePosition="none"
            thickness={6}
            activeThickness={12}
            radius={40}
            maxStretch={16}
            bounce={0.5}
            growOnHover
            wheel={false}
            jumpToClick
            style={{ width: '100%' }}
          />
          <div className={`-mt-1 flex justify-between font-montserrat text-[12px] font-normal leading-4 tabular-nums ${isLight ? 'text-black' : 'text-white'}`}>
            <span>{formatTime(progressTime)}</span><span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="w-[22px]" aria-hidden="true" />
          <div className="flex items-center gap-4 lg:gap-5">
            <button type="button" aria-label="Pista anterior" onClick={() => playPrev(isPlaying)} disabled={!canPlay} className={`transition-transform enabled:hover:-translate-x-0.5 disabled:cursor-not-allowed ${isLight ? 'text-black' : 'text-white'}`}><HugeiconsIcon icon={PreviousIcon} size={24} fill="none" /></button>
            <button type="button" onClick={togglePlay} disabled={!canPlay} className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-transform enabled:hover:scale-105 enabled:active:scale-95 disabled:cursor-not-allowed ${isLight ? 'border-black/15 bg-black/5 text-black shadow-[inset_0_2px_5px_rgba(0,0,0,0.2),inset_0_-1px_2px_rgba(255,255,255,0.8)]' : 'border-white/20 bg-white/10 text-white shadow-[inset_0_2px_6px_rgba(0,0,0,0.75),inset_0_-1px_2px_rgba(255,255,255,0.15)]'}`} aria-label={isPlaying ? 'Pausar música' : 'Reproducir música'}>
              {isPlaying ? <HugeiconsIcon icon={PauseIcon} size={24} fill="none" /> : <HugeiconsIcon icon={PlayIcon} size={24} fill="none" className="ml-0.5" />}
            </button>
            <button type="button" aria-label="Pista siguiente" onClick={() => playNext(isPlaying)} disabled={!canPlay} className={`transition-transform enabled:hover:translate-x-0.5 disabled:cursor-not-allowed ${isLight ? 'text-black' : 'text-white'}`}><HugeiconsIcon icon={NextIcon} size={24} fill="none" /></button>
          </div>
          <button type="button" onClick={() => canBrowsePlaylist && setMusicPlaylistOpen(!showPlaylist)} disabled={!canBrowsePlaylist} className={`relative transition-colors disabled:opacity-40 ${showPlaylist ? 'text-[#1DB954]' : isLight ? 'text-black/60 hover:text-black' : 'text-white/60 hover:text-white'}`} aria-label="Mostrar lista de reproducción"><HugeiconsIcon icon={Playlist01Icon} size={22} /></button>
        </div>
        <div className="flex justify-center">
          <ElasticSlider
            value={volume}
            onChange={setVolume}
            ariaLabel="Volumen de la música"
            maxStretch={16}
            bounce={0.5}
            growOnHover
            wheel={false}
            orientation="horizontal"
            iconPlacement="outside"
            valuePosition="none"
            thickness={6}
            activeThickness={12}
            restOpacity={0.7}
            fillFrom={0}
            isStepped={false}
            stepSize={10}
            ticks={false}
            thumb={false}
            jumpToClick
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <AnimatePresence>
        {showPlaylist && canBrowsePlaylist && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className={`absolute inset-0 z-30 flex flex-col ${isLight ? 'bg-white' : 'bg-[#0a0a0d]'}`}>
            <div className={`flex items-center justify-between border-b p-4 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
              <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-black/80' : 'text-white/80'}`}>Playlist ({tracks.length})</span>
              <button type="button" aria-label="Cerrar lista de reproducción" onClick={() => setMusicPlaylistOpen(false)} className={`transition-all hover:rotate-90 ${isLight ? 'text-black' : 'text-white'}`}><HugeiconsIcon icon={Cancel01Icon} size={22} /></button>
            </div>
            <div className="hide-scroll flex-1 space-y-1 overflow-y-auto p-2">
              {tracks.map((track) => (
                <button type="button" key={track.id} onClick={() => playTrack(track.id, !isPlayableTrack(track))} className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-all ${currentId === track.id ? isLight ? 'border-black/5 bg-black/10' : 'border-white/5 bg-white/10' : isLight ? 'border-transparent hover:bg-black/5' : 'border-transparent hover:bg-white/5'}`}>
                  <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>{track.cover_url ? <img src={track.cover_url} className="h-full w-full object-cover opacity-80" alt="" /> : <HugeiconsIcon icon={MusicNote01Icon} size={16} className={isLight ? 'text-black/50' : 'text-white/50'} />}</div>
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
