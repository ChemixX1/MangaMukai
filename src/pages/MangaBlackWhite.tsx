import { useEffect } from 'react';

import {
  AdultLatestUpdates,
  BlackWhiteHero,
  BlackWhiteYouthAccordion,
} from '../components/collections';
import { HomePageFrame, PopularCarousel, YouthCarousel } from '../components/home';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';
import { useTheme } from '../hooks/useTheme';
import { filterMenBlackWhite, filterWomenBlackWhite } from '../utils/womenBlackWhite';

function MangaBlackWhiteContent() {
  const { latestWomen, latestMen } = useHomeData();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Marca en el body para teñir de gris también la cabecera, que vive fuera de
  // esta página. Se retira al salir de la colección.
  useEffect(() => {
    document.body.classList.add('bn-monochrome');
    return () => document.body.classList.remove('bn-monochrome');
  }, []);

  return (
    <HomePageFrame
      hero={<BlackWhiteHero />}
      popularSection={<PopularCarousel filterMangas={filterWomenBlackWhite} />}
      latestSection={(
        <AdultLatestUpdates
          items={filterWomenBlackWhite(latestWomen)}
          isLight={isLight}
          sectionId="bn-latest-editorial"
          accent="pink"
          rowTone="neutral"
        />
      )}
      menSection={<BlackWhiteYouthAccordion />}
      youthSection={<YouthCarousel filterMangas={filterMenBlackWhite} />}
      youthLatestSection={(
        <AdultLatestUpdates
          items={filterMenBlackWhite(latestMen)}
          isLight={isLight}
          sectionId="bn-latest-youth-gallery"
          accent="blue"
          rowTone="neutral"
        />
      )}
      hideFilterStrip
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
