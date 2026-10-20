import type { MangaCapitulo } from '../../types/manga';
import { cleanTitle, isRecentChapter, timeAgoDaysEs } from '../../utils/mangaFormat';
import { displayViews } from '../../utils/seriesViews';
import { toTitleCase } from '../../utils/titleCase';

export type Audience = 'women' | 'men';

export const HERO_SIZE = 7;
export const HERO_TAGS = 6;
export const MOBILE_HERO_TAGS = 4;

export interface HeroItem {
  id: number | string;
  title: string;
  coverImage: string;
  description: string;
  type: string;
  tags: string[];
  views: number;
}

export const toHeroItems = (mangas: MangaCapitulo[]): HeroItem[] =>
  mangas.slice(0, HERO_SIZE).map((manga) => {
    const type = manga.tipo || 'Manga';
    const genres = manga.genres && manga.genres.length > 0 ? manga.genres.map(String) : ['Romance'];
    return {
      id: manga.id,
      title: toTitleCase(cleanTitle(manga.titulo)),
      coverImage: manga.portada,
      description: manga.descripcion || 'Una historia increíble te espera...',
      type,
      tags: [type, ...genres].filter(Boolean).slice(0, HERO_TAGS),
      views: displayViews(manga),
    };
  });

export interface LatestChapter {
  id: number;
  numero: string;
  isFree: boolean;

  isNew: boolean;

  date: string;
}

export interface LatestManga {
  id: number | string;
  seriesId: number | string | null;
  title: string;
  coverImage: string;
  type: string;
  chapters: LatestChapter[];
}

export const toLatestMangas = (mangas: MangaCapitulo[]): LatestManga[] =>
  mangas.map((manga) => ({
    id: manga.id,
    seriesId: manga.eroSeri || manga.id,
    title: toTitleCase(cleanTitle(manga.titulo)),
    coverImage: manga.portada,
    type: manga.tipo || 'Manga',
    chapters: (manga.capitulosRecientes || []).slice(0, 2).map((chapter) => ({
      id: chapter.id,
      numero: chapter.numero,
      isFree: chapter.esGratis,
      isNew: isRecentChapter(chapter.fecha),
      date: timeAgoDaysEs(chapter.fecha),
    })),
  }));

export interface HomeLayoutProps { womenHero: HeroItem[]; menHero: HeroItem[]; isReady: boolean }
