import { HeroCarousel } from '../components/home/HomeHero';
import { toHeroItems } from '../components/home/homeModels';
import { useEffect, useMemo, useState } from 'react';

import {
  AdultLatestUpdates,
  BlackWhiteHero,
  HomePageFrame,
  TrendingCarousel,
} from '../components/collections';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';
import { useTheme } from '../hooks/useTheme';
import { getUltimosCapitulos } from '../services/mangaService';
import type { MangaCapitulo } from '../types/manga';
import { filterMenBlackWhite, filterWomenBlackWhite } from '../utils/womenBlackWhite';

const uniqueMangas = (items: MangaCapitulo[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.eroSeri || item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function MangaBlackWhiteContent() {
  // Las series B&N suelen entrar antes que su primer capítulo: `includeUpcoming`
  // y la fusión con el catálogo general las listan igual (portada y título)
  // para que "Lo Más Reciente" siempre muestre todas las obras de la colección.
  const {
    latestWomen,
    latestMen,
    popularHistorical,
    popularWeekly,
    popularMenHistorical,
    popularMenWeekly,
    newReleases,
    isReady,
  } = useHomeData();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [catalog, setCatalog] = useState<MangaCapitulo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getUltimosCapitulos()
      .then((list) => {
        if (mounted) setCatalog(list);
      })
      .finally(() => {
        if (mounted) setCatalogLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Marca en el body para teñir de gris también la cabecera, que vive fuera de
  // esta página. Se retira al salir de la colección.
  useEffect(() => {
    document.body.classList.add('bn-monochrome');
    return () => document.body.classList.remove('bn-monochrome');
  }, []);

  const womenLatestItems = useMemo(
    () =>
      filterWomenBlackWhite(
        uniqueMangas([
          ...latestWomen,
          ...popularWeekly,
          ...popularHistorical,
          ...newReleases,
          ...catalog,
        ]),
      ),
    [latestWomen, popularWeekly, popularHistorical, newReleases, catalog],
  );

  const menLatestItems = useMemo(
    () =>
      filterMenBlackWhite(
        uniqueMangas([
          ...latestMen,
          ...popularMenWeekly,
          ...popularMenHistorical,
          ...newReleases,
          ...catalog,
        ]),
      ),
    [latestMen, popularMenWeekly, popularMenHistorical, newReleases, catalog],
  );

  const sectionLoading = !isReady && catalogLoading;

  return (
    <HomePageFrame
      hero={<BlackWhiteHero />}
      popularSection={<TrendingCarousel audience="women" filterMangas={filterWomenBlackWhite} />}
      latestSection={(
        <AdultLatestUpdates
          items={womenLatestItems}
          isLight={isLight}
          sectionId="bn-latest-editorial"
          accent="pink"
          rowTone="neutral"
          includeUpcoming
          loading={sectionLoading}
        />
      )}
      menSection={<HeroCarousel items={toHeroItems(menLatestItems)} loading={sectionLoading} accent="cyan" label="Mangas juveniles destacados" coverLayout="row" />}
      youthSection={<TrendingCarousel audience="men" filterMangas={filterMenBlackWhite} />}
      youthLatestSection={(
        <AdultLatestUpdates
          items={menLatestItems}
          isLight={isLight}
          sectionId="bn-latest-youth-gallery"
          accent="blue"
          rowTone="neutral"
          includeUpcoming
          loading={sectionLoading}
        />
      )}
      pageClassName="manga-bn-page"
      pageHeading="Manga en blanco y negro: shounen, seinen y acción"
    />
  );
}

export default function MangaBlackWhite() {
  return (
    <HomeDataProvider>
      <MangaBlackWhiteContent />
    </HomeDataProvider>
  );
}
