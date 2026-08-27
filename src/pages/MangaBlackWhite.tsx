import {
  BlackWhiteHero,
  BlackWhiteLatestEditorial,
  BlackWhiteYouthAccordion,
  BlackWhiteYouthLatestGallery,
} from '../components/collections';
import { HomePageFrame } from '../components/home';
import { HomeDataProvider } from '../context/HomeDataContext';

export default function MangaBlackWhite() {
  return (
    <HomeDataProvider>
      <HomePageFrame
        hero={<BlackWhiteHero />}
        latestSection={<BlackWhiteLatestEditorial />}
        menSection={<BlackWhiteYouthAccordion />}
        youthLatestSection={<BlackWhiteYouthLatestGallery />}
        pageClassName="manga-bn-page"
      />
    </HomeDataProvider>
  );
}
