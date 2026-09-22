import { EmergencyScreen } from '../components/common/EmergencyScreen';
import { Hero, HomePageFrame } from '../components/home';
import { MobileHome } from '../components/home/mobile/MobileHome';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';
import { useIsMobileViewport } from '../hooks/useIsMobileViewport';

/** Por debajo de lg la portada usa el diseño móvil propio; en escritorio, el clásico.
    Si el servidor no responde (todas las secciones vacías), la pantalla de emergencia. */
const HomeView = () => {
  const isMobile = useIsMobileViewport();
  const { isReady, isOutage } = useHomeData();
  if (isReady && isOutage) return <EmergencyScreen />;
  return isMobile ? <MobileHome /> : <HomePageFrame hero={<Hero />} />;
};

export default function Home() {
  return (
    <HomeDataProvider>
      <HomeView />
    </HomeDataProvider>
  );
}
