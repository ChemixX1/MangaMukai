import { useHomeData } from '../../context/HomeDataContext';
import { HomeAnnouncements } from '../../components/home/HomeAnnouncements';
import { HeroCarousel } from '../../components/home/HomeHero';
import { LatestSection } from '../../components/home/HomeLatest';
import type { HomeLayoutProps } from '../../components/home/homeModels';
import { TrendingSection } from '../../components/home/HomeTrending';
import { Footer } from '../../components/layout/Footer';

export default function HomeM({ womenHero, menHero, isReady }: HomeLayoutProps) {
  const { loaded } = useHomeData();
  return (
    <div className={`home-page flex min-h-screen flex-col overflow-x-clip bg-surface pt-12 font-sans text-ink lg:pt-[73px] ${isReady ? 'home-data-ready' : 'home-data-pending'}`}>
      <h1 className="sr-only">Leer manga online gratis en español</h1>

      <HeroCarousel items={womenHero} loading={!isReady} accent="pink" label="Mangas destacados" coverLayout="stacked" keyboardNavigation className="home-block home-block-hero z-10 pb-8 lg:pb-0" />
      <TrendingSection audience="women" className="home-block home-block-popular mt-[33px] lg:mt-[69px]" />
      <LatestSection audience="women" className="home-block home-block-latest mt-[50px] lg:mt-[68px]" />

      <HomeAnnouncements />

      <HeroCarousel items={menHero} loading={!loaded.popularMenHistorical || !loaded.latestMen} accent="cyan" label="Mangas juveniles destacados" coverLayout="row" className="home-block home-block-men z-10 pb-[53px] lg:mt-8 lg:pb-0" />
      <TrendingSection audience="men" className="home-block home-block-youth lg:mt-[71px]" />
      <LatestSection audience="men" className="home-block home-block-youth-latest mt-[50px] lg:mt-[68px]" />

      <Footer homeDesign className="mt-[94px] lg:mt-[125px]" />
    </div>
  );
}