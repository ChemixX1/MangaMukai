import {
  AdultLatestUpdates,
  BlackWhiteHero,
  BlackWhiteYouthAccordion,
} from '../components/collections';
import { HomePageFrame } from '../components/home';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';
import { useTheme } from '../hooks/useTheme';

function MangaBlackWhiteContent() {
  const { latestWomen, latestMen } = useHomeData();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <HomePageFrame
      hero={<BlackWhiteHero />}
      latestSection={(
        <AdultLatestUpdates
          items={latestWomen}
          isLight={isLight}
          sectionId="bn-latest-editorial"
          accent="blue"
        />
      )}
      menSection={<BlackWhiteYouthAccordion />}
      youthLatestSection={(
        <AdultLatestUpdates
          items={latestMen}
          isLight={isLight}
          sectionId="bn-latest-youth-gallery"
          accent="blue"
        />
      )}
      pageClassName="manga-bn-page"
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
