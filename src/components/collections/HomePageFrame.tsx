import type { ReactNode } from 'react';

import { useHomeData } from '../../context/HomeDataContext';
import { Footer } from '../layout/Footer';
import { HomeAnnouncements } from '../home/HomeAnnouncements';

interface HomePageFrameProps {
  hero: ReactNode;
  popularSection: ReactNode;
  latestSection: ReactNode;
  menSection: ReactNode;
  youthSection: ReactNode;
  youthLatestSection: ReactNode;
  pageClassName?: string;

  pageHeading: string;
}

export function HomePageFrame({
  hero,
  popularSection,
  latestSection,
  menSection,
  youthSection,
  youthLatestSection,
  pageClassName = '',
  pageHeading,
}: HomePageFrameProps) {
  const { isReady } = useHomeData();

  return (
    <div className={`home-shell flex min-h-screen flex-col overflow-x-hidden bg-surface font-sans text-ink ${isReady ? 'home-data-ready' : 'home-data-pending'} ${pageClassName}`}>
      <div className="flex flex-1 flex-col">
        <h1 className="sr-only">{pageHeading}</h1>
        <section className="home-block home-block-hero relative z-40 bg-surface">
          {hero}
        </section>

        <div className="home-main relative z-10 w-full flex-grow bg-surface pt-10">
          <div className="relative z-20 flex flex-col gap-16 max-sm:gap-12">
            <section className="home-block home-block-popular">{popularSection}</section>
            <section className="home-block home-block-latest">{latestSection}</section>
            <HomeAnnouncements />
            <section className="home-block home-block-men relative z-30 mt-4">{menSection}</section>
            <section className="home-block home-block-youth">{youthSection}</section>
            <section className="home-block home-block-youth-latest">{youthLatestSection}</section>
          </div>
        </div>

        <Footer ready={isReady} homeDesign className="mt-[94px] lg:mt-[125px]" />
      </div>
    </div>
  );
}
