import { useEffect, useState } from 'react';

import { useHomeData } from '../context/HomeDataContext';
import { getCachedSeriesChapterCount, getPopularMenByViews, getPopularWomenByViews, getSeriesChapterCount, getUltimosCapitulos } from '../services/mangaService';
import type { MangaCapitulo } from '../types/manga';
import { cleanTitle } from '../utils/mangaFormat';
import { rankSeriesByViews } from '../utils/trendingRanking';
import { preloadImages } from '../utils/preloadImages';
import { whenIdle } from '../utils/whenIdle';
import { filterYouthMen } from '../utils/youthFilter';

export type RankingPeriod = 'Semanal' | 'Mensual' | 'Histórico';
export const RANKING_PERIODS: RankingPeriod[] = ['Semanal', 'Mensual', 'Histórico'];
const REMOTE_PERIOD = { Semanal: 'weekly', Mensual: 'monthly', Histórico: 'historical' } as const;

export interface RankedManga {
  id: number | string;
  title: string;
  coverImage: string;
  chapterCount: number | null;
  type: string;
  views: number;
}

 const toRankedMangas = (mangas: MangaCapitulo[]): RankedManga[] =>
  mangas.map((manga) => {
    return {
      id: manga.eroSeri || manga.id,
      title: cleanTitle(manga.titulo),
      coverImage: manga.portada,
      chapterCount: manga.chapterCount ?? getCachedSeriesChapterCount(manga.eroSeri || manga.id),
      type: manga.tipo || 'Manga',
      views: manga.totalViews ?? 0,
    };
  });

interface TrendingOptions {
  audience: 'women' | 'men';
  period: RankingPeriod;

  size: number;

  youthOnly?: boolean;

  filterMangas?: (items: MangaCapitulo[]) => MangaCapitulo[];

  preloadCount?: number;
}

export const useTrendingRanking = ({ audience, period, size, youthOnly = false, filterMangas, preloadCount = 0 }: TrendingOptions) => {
  const { popularWeekly, popularMenWeekly, popularHistorical, popularMenHistorical, latestWomen, latestMen, loaded, isReady } = useHomeData();
  const [items, setItems] = useState<RankedManga[]>([]);
  const [loading, setLoading] = useState(true);
  const isMen = audience === 'men';

  const weeklySource = isMen ? popularMenWeekly : popularWeekly;
  const historicalSource = isMen ? popularMenHistorical : popularHistorical;
  const latestSource = isMen ? latestMen : latestWomen;
  const rankingReady = period === 'Histórico'
    ? loaded[isMen ? 'popularMenHistorical' : 'popularHistorical']
    : loaded[isMen ? 'popularMenWeekly' : 'popularWeekly'];

  useEffect(() => {
    if (!rankingReady) return;
    let cancelled = false;
    let cancelCounts = () => {};
    const narrow = (list: MangaCapitulo[]) => {
      const base = youthOnly ? filterYouthMen(list) : list;
      return filterMangas ? filterMangas(base) : base;
    };
    const weekly = narrow(weeklySource);
    const historical = narrow(historicalSource);
    const latest = narrow(latestSource);

    const load = async () => {
      setLoading(true);
      let primary = period === 'Semanal' ? weekly : period === 'Histórico' ? historical : [];
      if (primary.length === 0) {
        const fetchPopular = isMen ? getPopularMenByViews : getPopularWomenByViews;
        primary = narrow(await fetchPopular(REMOTE_PERIOD[period], false).catch(() => []));
      }
      const fallback = [...historical, ...latest].map((manga) =>
        period === 'Histórico' ? manga : { ...manga, totalViews: 0 });
      let next = rankSeriesByViews(primary, fallback, size);
      if (next.length === 0) {
        const catalog = narrow(await getUltimosCapitulos().catch(() => []));
        next = rankSeriesByViews([], catalog.map((manga) =>
          period === 'Histórico' ? manga : { ...manga, totalViews: 0 }), size);
      }
      const ranked = toRankedMangas(next);
      if (preloadCount > 0 && next.length > 0) {
        void preloadImages(next.slice(0, preloadCount).map((manga) => manga.portada));
      }
      if (cancelled) return;

      if (ranked.length > 0) setItems(ranked);
      setLoading(false);

      if (isReady) cancelCounts = whenIdle(() => {
        const queue = ranked.filter(manga => manga.chapterCount === null);
        const worker = async () => {
          while (!cancelled && queue.length) {
            const manga = queue.shift()!;
            const chapterCount = await getSeriesChapterCount(manga.id).catch(() => null);
            if (!cancelled && chapterCount !== null) setItems(current => current.map(item =>
              item.id === manga.id ? { ...item, chapterCount } : item));
          }
        };
        void Promise.all([worker(), worker()]);
      });
    };
    void load();
    return () => { cancelled = true; cancelCounts(); };
  }, [rankingReady, isReady, isMen, period, size, youthOnly, filterMangas, preloadCount, weeklySource, historicalSource, latestSource]);

  return { items, loading };
};
