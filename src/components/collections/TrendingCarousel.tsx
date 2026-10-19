import type { MangaCapitulo } from '../../types/manga';
import { TrendingSection } from '../home/HomeTrending';

interface TrendingCarouselProps {
  audience: 'women' | 'men';
  /** Filtro de colección. Debe ser estable (definido a nivel de módulo). */
  filterMangas: (items: MangaCapitulo[]) => MangaCapitulo[];
  /** Mantenido por compatibilidad con las llamadas existentes. */
  minItemsForMotion?: number;
  className?: string;
  selectorColor?: string;
}

/**
 * "Tendencia Ahora" unificado en las tres portadas (Home, Manga B&N y Manga Hot):
 * reutiliza exactamente el mismo bloque, tarjetas, pestañas y movimiento del Home.
 */
export const TrendingCarousel = ({ audience, filterMangas, className = '', selectorColor }: TrendingCarouselProps) => (
  <TrendingSection audience={audience} filterMangas={filterMangas} className={className} selectorColor={selectorColor} />
);
