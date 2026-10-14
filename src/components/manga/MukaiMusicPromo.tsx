import { Link } from 'react-router-dom';
import backdrop from '../../assets/manga/mukai-music-background.webp';
import '../../styles/mukai-music-promo.css';

const MusicCrown = () => (
  <svg className="mukai-music-crown" width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M2.89136 11.5653L4.7765 13.0731C5.43324 13.5984 6.19665 13.9741 7.01351 14.1741C7.83036 14.374 8.681 14.3934 9.50611 14.2309C10.3312 14.0683 11.111 13.7278 11.7909 13.2329C12.4709 12.7381 13.0348 12.1009 13.4432 11.3658L17.348 4.33699L21.2527 11.3658C21.6613 12.101 22.2253 12.7383 22.9054 13.2331C23.5856 13.728 24.3655 14.0685 25.1908 14.2309C26.0161 14.3933 26.8669 14.3737 27.6838 14.1735C28.5008 13.9733 29.2642 13.5973 29.9209 13.0717L31.8046 11.5653L29.2689 24.2438C29.1586 24.7972 28.9232 25.3181 28.5807 25.7666C28.2381 26.2151 27.7976 26.5794 27.2927 26.8315C24.205 28.3756 20.8002 29.1794 17.348 29.1794C13.8957 29.1794 10.4909 28.3756 7.40327 26.8315C6.89837 26.5794 6.45781 26.2151 6.11529 25.7666C5.77276 25.3181 5.53735 24.7972 5.42705 24.2438L2.89136 11.5653Z" stroke="#FFA43D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.5654 21.6849C15.3184 23.612 19.3778 23.612 23.1307 21.6849" stroke="#FFA43D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MukaiMusicPromo = ({ onUnlock }: { onUnlock?: () => void }) => (
  <div className="mukai-music-promo mukai-music-promo--subscription">
    <img src={backdrop} alt="" aria-hidden="true" loading="lazy" decoding="async" />
    <div className="mukai-music-promo-content">
      <MusicCrown />
      <p className="mukai-music-title">MUKAI<span>MUSIC</span></p>
      <p className="mukai-music-description">Desbloquea los SoundTracks y escucha música mientras lees</p>
      {onUnlock ? <button className="mukai-music-subscribe" type="button" onClick={onUnlock}>SUSCRÍBETE</button> : <Link className="mukai-music-subscribe" to="/recargar">SUSCRÍBETE</Link>}
    </div>
  </div>
);
