import { useMemo } from 'react';

import { EmergencyScreen } from '../components/common/EmergencyScreen';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';
import { uniqueBySeries } from '../utils/mangaFormat';
import { buildViewsIndex, withKnownViews } from '../utils/seriesViews';
import { filterYouthMen } from '../utils/youthFilter';

import { HERO_SIZE, toHeroItems } from '../components/home/homeModels';
import HomeContent from './home/HomeContent';

const HomeView = () => {
  const { popularHistorical, popularMenHistorical, popularMenWeekly, latestMen, loaded, isReady, isOutage } = useHomeData();

  const womenHero = useMemo(() => toHeroItems(popularHistorical), [popularHistorical]);

  const menHero = useMemo(() => {

    const viewsIndex = buildViewsIndex(popularMenWeekly, popularMenHistorical);
    const ranked = filterYouthMen(popularMenHistorical);
    const latest = withKnownViews(filterYouthMen(latestMen), viewsIndex);
    return toHeroItems(uniqueBySeries([ranked, latest], HERO_SIZE));
  }, [popularMenHistorical, popularMenWeekly, latestMen]);

  if (isReady && isOutage) return <EmergencyScreen />;

  return <HomeContent womenHero={womenHero} menHero={menHero} isReady={loaded.popularHistorical} />;
};

export default function Home() {
  return (
    <HomeDataProvider>
      <HomeView />
    </HomeDataProvider>
  );
}
