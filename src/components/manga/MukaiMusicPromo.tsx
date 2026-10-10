import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import backdrop from '../../assets/manga/mukai-music.png';

/**
 * Cartel de Mukai Music, compartido por la ficha móvil y el reproductor
 * bloqueado de escritorio. La ilustración es transparente en el centro, así que
 * el cartel lleva su propio fondo negro para no dejar ver lo que haya detrás.
 */
export const MukaiMusicPromo = ({ onUnlock }: { onUnlock?: () => void }) => {
  const actionClass = 'mt-[15px] flex h-7 w-28 shrink-0 items-center justify-center rounded-3xl bg-mukai-gold font-anta text-xs font-normal leading-4 text-mukai-ink transition-transform active:scale-95';
  return (
    <div className="relative flex h-full min-h-40 w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-black px-3 py-[15px] text-center text-white">
      <img src={backdrop} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <span aria-hidden="true" className="absolute inset-0 bg-black/60" />
      <div className="relative flex flex-col items-center">
        <Crown size={32} className="fill-mukai-gold text-mukai-gold" aria-hidden="true" />
        <p className="mt-[5px] font-montserrat text-xl font-black italic leading-5">MUKAI<span className="text-mukai-gold">MUSIC</span></p>
        <p className="mt-[5px] w-40 font-montserrat text-[8px] font-medium leading-3">Desbloquea los SoundTracks y escucha música mientras lees</p>
        {onUnlock ? <button type="button" onClick={onUnlock} className={actionClass}>SUSCRÍBETE</button> : <Link to="/recargar" className={actionClass}>SUSCRÍBETE</Link>}
      </div>
    </div>
  );
};
