import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import mukaiMusicBackdrop from '../../../assets/manga/mukai-music.png';

/**
 * Cartel de Mukai Music (288×160 en el diseño): la ilustración al fondo con un
 * velo negro, la corona, el rótulo MUKAIMUSIC y el botón amarillo.
 */
export const MobileMukaiMusic = () => (
  <section aria-label="Mukai Music" className="mmd-music mx-auto w-[65.5%]">
    <div className="relative aspect-[288/160] w-full overflow-hidden rounded-2xl border border-white/50">
      <img src={mukaiMusicBackdrop} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <span aria-hidden="true" className="absolute inset-0 bg-black/50" />

      <div className="relative flex h-full flex-col items-center justify-center px-3 text-center">
        <Crown size={32} className="fill-[#FFCD0F] text-[#FFCD0F]" aria-hidden="true" />
        <p className="mmd-montserrat mt-1 text-[20px] font-black leading-5">
          MUKAI<span className="text-[#FFCD0F]">MUSIC</span>
        </p>
        <p className="mmd-montserrat mt-1.5 w-40 text-[8px] font-medium leading-3 text-white">
          Desbloquea los SoundTracks y escucha música mientras lees
        </p>
        <Link to="/recargar" className="mmd-anta mt-2.5 flex h-7 w-28 items-center justify-center rounded-3xl bg-[#FFCD0F] text-[12px] leading-4 text-white transition-transform active:scale-95">
          SUSCRIBETE
        </Link>
      </div>
    </div>
  </section>
);
