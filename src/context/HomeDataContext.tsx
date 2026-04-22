import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { MangaCapitulo } from '../types/manga';
import { getPopularWomenByViews, getLatestWomenUpdates, getNewReleases } from '../services/mangaService';

interface HomeData {
  popularHistorical: MangaCapitulo[];
  latestWomen: MangaCapitulo[];
  latestMen: MangaCapitulo[];
  newReleases: MangaCapitulo[];
  isReady: boolean;
}

const HomeDataContext = createContext<HomeData>({
  popularHistorical: [],
  latestWomen: [],
  latestMen: [],
  newReleases: [],
  isReady: false,
});

export const useHomeData = () => useContext(HomeDataContext);

export const HomeDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<HomeData>({
    popularHistorical: [],
    latestWomen: [],
    latestMen: [],
    newReleases: [],
    isReady: false,
  });

  useEffect(() => {
    const preload = async () => {
      try {
        const [popularWomen, latestWomen, newReleases] = await Promise.all([
          getPopularWomenByViews('historical'),
          getLatestWomenUpdates(18),
          getNewReleases(),
        ]);

        setData({
          popularHistorical: popularWomen.slice(0, 12),
          latestWomen:       latestWomen.slice(0, 18),
          latestMen:         [],   // se carga bajo demanda si se necesita
          newReleases,
          isReady: true,
        });
      } catch (error) {
        console.error('HomeDataContext preload error:', error);
        setData(prev => ({ ...prev, isReady: true }));
      }
    };
    preload();
  }, []);

  return <HomeDataContext.Provider value={data}>{children}</HomeDataContext.Provider>;
};
