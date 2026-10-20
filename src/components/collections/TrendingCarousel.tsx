import type { MangaCapitulo } from '../../types/manga';
import { TrendingSection } from '../home/HomeTrending';

interface TrendingCarouselProps {
  audience: 'women' | 'men';

  filterMangas: (items: MangaCapitulo[]) => MangaCapitulo[];

  minItemsForMotion?: number;
  className?: string;
  selectorColor?: string;
}

export const TrendingCarousel = ({ audience, filterMangas, className = '', selectorColor }: TrendingCarouselProps) => (
  <TrendingSection audience={audience} filterMangas={filterMangas} className={className} selectorColor={selectorColor} />
);
