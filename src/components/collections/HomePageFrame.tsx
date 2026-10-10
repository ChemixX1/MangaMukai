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
  /**
   * H1 de la página. Los títulos visibles del hero son nombres de manga que
   * rotan, así que el encabezado real de la página va aquí para que buscadores y
   * lectores de pantalla sepan de qué trata.
   */
  pageHeading: string;
}

/**
 * Composición de la colección B&N: el hero y después tendencias, novedades,
 * lo más reciente, el bloque juvenil con sus tendencias, sus novedades y lo más
 * reciente, y el pie.
 */
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
    <div className={`home-shell flex min-h-screen flex-col overflow-x-hidden bg-surface font-sans text-ink selection:bg-mukai-pink selection:text-white ${isReady ? 'home-data-ready' : 'home-data-pending'} ${pageClassName}`}>
      <div className="flex flex-1 flex-col">
        <h1 className="sr-only">{pageHeading}</h1>
        <section className="home-block home-block-hero relative z-40 bg-surface">
          {hero}
        </section>

        <div className="home-main relative z-10 w-full flex-grow bg-surface pb-20 pt-10">
          <div className="relative z-20 flex flex-col gap-24 max-sm:gap-[4.5rem]">
            <section className="home-block home-block-popular">{popularSection}</section>
            <section className="home-block home-block-news"><HomeAnnouncements /></section>
            <section className="home-block home-block-latest">{latestSection}</section>
            <section className="home-block home-block-men relative z-30 -mt-10 md:-mt-14 lg:-mt-16">{menSection}</section>
            <section className="home-block home-block-youth">{youthSection}</section>
            <section className="home-block home-block-youth-news"><HomeAnnouncements /></section>
            <section className="home-block home-block-youth-latest">{youthLatestSection}</section>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
