import { useMemo } from 'react';

import { useHomeData } from '../../../context/HomeDataContext';
import { uniqueBySeries } from '../../../utils/mangaFormat';
import { buildViewsIndex, withKnownViews } from '../../../utils/seriesViews';
import { filterYouthMen } from '../../../utils/youthFilter';
import { Footer } from '../../layout/Footer';
import { MobileHero, toHeroItems } from './MobileHero';
import { MobileLatest } from './MobileLatest';
import { MobileRecruitBanner } from './MobileRecruitBanner';
import { MobileTrending } from './MobileTrending';

const HERO_SIZE = 8;

/**
 * Home móvil (< 1024px) según el diseño de Figma: bloque femenino en rosa
 * (hero, Tendencia Ahora, Lo Más Reciente), cartel de novedades con Discord y
 * Telegram, bloque juvenil en celeste y el footer con las montañas.
 */
export const MobileHome = () => {
  const { popularHistorical, popularMenHistorical, popularMenWeekly, latestMen, isReady } = useHomeData();

  const womenHero = useMemo(() => toHeroItems(popularHistorical, HERO_SIZE), [popularHistorical]);

  const menHero = useMemo(() => {
    // Las últimas actualizaciones llegan sin vistas: se completan con las de los rankings.
    const viewsIndex = buildViewsIndex(popularMenWeekly, popularMenHistorical);
    const ranked = filterYouthMen(popularMenHistorical);
    const latest = withKnownViews(filterYouthMen(latestMen), viewsIndex);
    return toHeroItems(uniqueBySeries([ranked, latest], HERO_SIZE), HERO_SIZE);
  }, [popularMenHistorical, popularMenWeekly, latestMen]);

  return (
    <div className="focus-scope tap-transparent overflow-x-hidden bg-surface text-ink" data-ready={isReady}>
      <h1 className="sr-only">Leer manga online gratis en español</h1>

      <MobileHero items={womenHero} accent="pink" label="Mangas destacados" />
      <MobileTrending audience="women" accent="pink" />
      <MobileLatest audience="women" accent="pink" />

      <MobileRecruitBanner />

      <MobileHero items={menHero} accent="cyan" label="Mangas juveniles destacados" topSpacingClass="pt-[99px]" coverLayout="peek" />
      <MobileTrending audience="men" accent="cyan" />
      <MobileLatest audience="men" accent="cyan" />

      <Footer className="-mt-6" />
    </div>
  );
};
