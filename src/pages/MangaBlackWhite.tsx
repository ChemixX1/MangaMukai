import { BlackWhiteHero, BlackWhiteYouthAccordion } from '../components/collections';
import { HomePageFrame } from '../components/home';
import { HomeDataProvider } from '../context/HomeDataContext';

export default function MangaBlackWhite() {
  return (
    <HomeDataProvider>
      <HomePageFrame hero={<BlackWhiteHero />} afterHero={<BlackWhiteYouthAccordion />} pageClassName="manga-bn-page" />
    </HomeDataProvider>
  );
}
