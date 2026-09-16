import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Footer } from '../layout';
import { useHomeData } from '../../context/HomeDataContext';
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
  afterLatest?: ReactNode;
  latestSection?: ReactNode;
  popularSection?: ReactNode;
  youthSection?: ReactNode;
  /** La colección B&N no usa la tira de filtros. */
  hideFilterStrip?: boolean;
  /** Oculta "Nuevos lanzamientos" (la colección B&N no lo usa). */
  hideReleases?: boolean;
  menSection?: ReactNode;
  youthLatestSection?: ReactNode;
  pageClassName?: string;
  /**
   * H1 de la página. Los títulos visibles del hero son nombres de manga que
   * rotan, así que el encabezado real de la página va aquí para que buscadores y
   * lectores de pantalla sepan de qué trata.
   */
  pageHeading?: string;
}

/**
 * Shared Home composition. Pages can provide a purpose-built hero while the
 * filters, carousels, news and release sections remain structurally identical.
 */
export function HomePageFrame({
  hero,
  afterHero,
  afterLatest,
  latestSection,
  popularSection,
  youthSection,
  hideFilterStrip = false,
  hideReleases = false,
  menSection,
  youthLatestSection,
  pageClassName = '',
  pageHeading = 'Leer manga online gratis en español',
}: HomePageFrameProps) {
  const navigate = useNavigate();
  const { isReady } = useHomeData();

  const handleCategoryClick = (category: string) => {
    startGlobalLoading();
    navigate('/biblioteca#filtros', {
      state: { filterCategory: category },
    });
  };

  return (
    // El tema llega por las clases home-theme-* de <html> (ver useTheme): este árbol no se re-renderiza al cambiarlo.
    <div className={`home-shell flex min-h-screen flex-col overflow-x-hidden font-sans selection:bg-red-600 selection:text-white ${isReady ? 'home-data-ready' : 'home-data-pending'} ${pageClassName}`}>
      <div className="home-stage flex flex-1 flex-col">
        <h1 className="sr-only">{pageHeading}</h1>
        <section className="home-block home-block-hero relative z-40 bg-black">
          {hero}
        </section>

        {afterHero}

        <div className="home-main relative z-10 w-full flex-grow bg-[#050505] pb-20 pt-10">
          <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,#f5f6f8_0%,#eef2f7_100%)] dark:bg-black dark:bg-none" />

          <div className="relative z-20 flex flex-col gap-24">
            {!hideFilterStrip && (
              <section className="home-block home-block-filter">
                <FilterStrip activeCategory={null} onCategoryChange={handleCategoryClick} />
              </section>
            )}

            <section className="home-block home-block-popular">{popularSection ?? <PopularCarousel />}</section>
            <section className="home-block home-block-news"><News /></section>
            <section className="home-block home-block-latest">{latestSection ?? <Latest />}</section>
            {afterLatest}
            <section className="home-block home-block-men relative z-30 -mt-10 md:-mt-14 lg:-mt-16">{menSection ?? <LatestUpdates />}</section>
            <section className="home-block home-block-youth">{youthSection ?? <YouthCarousel youthOnly />}</section>
            <section className="home-block home-block-youth-news"><News variant="youth" /></section>
            <section className="home-block home-block-youth-latest">{youthLatestSection ?? <YouthLatest />}</section>
            {!hideReleases && <section className="home-block home-block-releases -mt-4 sm:mt-0"><NewReleases /></section>}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
