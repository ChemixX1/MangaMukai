import asset0 from '../assets/search/BannerDerechoSearch.png';
import asset1 from '../assets/search/BannerIzquierdoSearch.png';
import asset2 from '../assets/search/Drama.png';
import asset3 from '../assets/search/Reencarnación.png';
import asset4 from '../assets/search/Romance.png';
import asset5 from '../assets/search/Comedia.png';
import asset6 from '../assets/search/Romance Obsesivo.png';
import asset7 from '../assets/search/Venganza.png';

// Recursos locales del buscador, centralizados para su futura gestión en el CMS.
export const searchBanners = { left: asset1, right: asset0 };
export const searchGenres = [
  { genre: 'Drama', cover: asset2, color: '#ef4444' },
  { genre: 'Reencarnación', cover: asset3, color: '#38bdf8' },
  { genre: 'Romance', cover: asset4, color: '#f59e0b' },
  { genre: 'Comedia', cover: asset5, color: '#d946ef' },
  { genre: 'Romance Obsesivo', cover: asset6, color: '#ef4444' },
  { genre: 'Venganza', cover: asset7, color: '#d946ef' },
];
