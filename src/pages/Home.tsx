import { useNavigate } from 'react-router-dom'; 

// --- SERVICIOS Y TIPOS (CONEXIÓN HOSTINGER) ---
// (Ya no necesitamos importar el servicio aquí, porque Latest se encarga solo)

// --- COMPONENTES UI ---
import {
  FilterStrip,
  Hero,
  Latest,
  LatestUpdates,
  NewReleases,
  News,
  PopularCarousel,
  YouthCarousel,
  YouthLatest,
} from '../components/home';
import { Footer } from '../components/layout';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';
import { useTheme } from '../hooks/useTheme';
import { startGlobalLoading } from '../utils/globalLoading';

function HomeContent() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isReady } = useHomeData();

  // Manejador del FilterStrip
  const handleCategoryClick = (category: string) => {
    startGlobalLoading();
    navigate('/biblioteca#filtros', {
      state: { filterCategory: category }
    });
  };

  return (
    <div className={`home-shell min-h-screen overflow-x-hidden font-sans selection:bg-red-600 selection:text-white flex flex-col home-theme-${theme} ${isReady ? 'home-data-ready' : 'home-data-pending'}`}>
      <div className="home-stage flex-1 flex flex-col transition-colors duration-300">
        {/* 1. HERO SECTION */}
        <section className="home-block home-block-hero relative z-40 bg-black">
          <Hero />
        </section>

        <div className="home-main relative z-10 w-full pt-10 pb-20 flex-grow bg-[#050505] transition-colors duration-300">
        
          <div className={`absolute inset-0 z-0 transition-colors duration-300 ${theme === 'light' ? 'bg-[linear-gradient(180deg,#f5f6f8_0%,#eef2f7_100%)]' : 'bg-black'}`} />

        {/* Contenido Vertical */}
        <div className="relative z-20 flex flex-col gap-24">
            
            {/* Tira de Filtros */}
            <section className="home-block home-block-filter">
              <FilterStrip activeCategory={null} onCategoryChange={handleCategoryClick} />
            </section>

            {/* Bloque 1: Popular (Rosado) */}
            <section className="home-block home-block-popular"><PopularCarousel /></section>
            
            {/* Bloque 2: Noticias */}
            <section className="home-block home-block-news"><News /></section>
            
            {/* Bloque 3: Últimos General (Rosado) */}
            {/* ✅ SOLUCIÓN: Usamos Latest sin props, porque él busca sus propios datos */}
            <section className="home-block home-block-latest">
                <Latest />
            </section>
            
            {/* Bloque 4: Lista de Actualizaciones (Manhwa/Etc) */}
            <section className="home-block home-block-men relative z-30 -mt-10 md:-mt-14 lg:-mt-16">
                <LatestUpdates />
            </section>

            {/* --- BLOQUE JUVENIL (CELESTE) --- */}
            
            {/* Carrusel Juvenil */}
            <section className="home-block home-block-youth">
                <YouthCarousel />
            </section>

            {/* Noticias para la rama juvenil, debajo de sus mangas populares */}
            <section className="home-block home-block-youth-news">
                <News variant="youth" />
            </section>

            {/* Grilla Juvenil (Copia de Latest pero azul) */}
            <section className="home-block home-block-youth-latest">
                <YouthLatest />
            </section>

            {/* --- FIN BLOQUE JUVENIL --- */}

            {/* Bloque Final: Nuevos Lanzamientos */}
            <section className="home-block home-block-releases -mt-4 sm:mt-0"><NewReleases /></section>
        </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <HomeDataProvider>
      <HomeContent />
    </HomeDataProvider>
  );
}
