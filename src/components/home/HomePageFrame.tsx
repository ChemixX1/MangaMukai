import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Footer } from '../layout';
import { useHomeData } from '../../context/HomeDataContext';
import { useTheme } from '../../hooks/useTheme';
import { startGlobalLoading } from '../../utils/globalLoading';
import FilterStrip from './FilterStrip';
import { Latest } from './Latest';
import { LatestUpdates } from './LatestMen';
import { YouthLatest } from './LatestYouth';
import { NewReleases } from './NewReleases';
import News from './News';
import { PopularCarousel } from './PopularCarousel';
import { YouthCarousel } from './YouthCarousel';

interface HomePageFrameProps {
  hero: ReactNode;
  afterHero?: ReactNode;
  pageClassName?: string;
}

/**
 * Shared Home composition. Pages can provide a purpose-built hero while the
 * filters, carousels, news and release sections remain structurally identical.
 */
export function HomePageFrame({ hero, afterHero, pageClassName = '' }: HomePageFrameProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isReady } = useHomeData();

  const handleCategoryClick = (category: string) => {
    startGlobalLoading();
    navigate('/biblioteca#filtros', {
      state: { filterCategory: category },
    });
  };

  return (
    <div className={`home-shell home-theme-${theme} flex min-h-screen flex-col overflow-x-hidden font-sans selection:bg-red-600 selection:text-white ${isReady ? 'home-data-ready' : 'home-data-pending'} ${pageClassName}`}>
      <div className="home-stage flex flex-1 flex-col transition-colors duration-300">
        <section className="home-block home-block-hero relative z-40 bg-black">
          {hero}
        </section>

        {afterHero}

        <div className="home-main relative z-10 w-full flex-grow bg-[#050505] pb-20 pt-10 transition-colors duration-300">
          <div className={`absolute inset-0 z-0 transition-colors duration-300 ${theme === 'light' ? 'bg-[linear-gradient(180deg,#f5f6f8_0%,#eef2f7_100%)]' : 'bg-black'}`} />

          <div className="relative z-20 flex flex-col gap-24">
            <section className="home-block home-block-filter">
              <FilterStrip activeCategory={null} onCategoryChange={handleCategoryClick} />
            </section>

            <section className="home-block home-block-popular"><PopularCarousel /></section>
            <section className="home-block home-block-news"><News /></section>
            <section className="home-block home-block-latest"><Latest /></section>
            <section className="home-block home-block-men relative z-30 -mt-10 md:-mt-14 lg:-mt-16"><LatestUpdates /></section>
            <section className="home-block home-block-youth"><YouthCarousel /></section>
            <section className="home-block home-block-youth-news"><News variant="youth" /></section>
            <section className="home-block home-block-youth-latest"><YouthLatest /></section>
            <section className="home-block home-block-releases -mt-4 sm:mt-0"><NewReleases /></section>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
