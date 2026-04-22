import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 

// --- SERVICIOS Y TIPOS (CONEXIÓN HOSTINGER) ---
// (Ya no necesitamos importar el servicio aquí, porque Latest se encarga solo)

// --- COMPONENTES UI ---
import AngledHeroCarousel from "../components/Hero";
import FilterStrip from '../components/FilterStrip'; 
import { Footer } from '../components/Footer';

// --- SECCIONES DE CONTENIDO (ORIGINALES / ROSADAS) ---
import { PopularCarousel } from '../components/PopularCarousel';
import { Latest } from '../components/Latest'; 
import { LatestUpdates } from '../components/LatestMen'; 
import News from "../components/News";
import { NewReleases } from '../components/NewReleases';

// --- SECCIONES NUEVAS (JUVENILES / CELESTES) ---
import { YouthCarousel } from '../components/YouthCarousel'; 
import { YouthLatest } from '../components/LatestYouth'; 

// --- CONFIGURACIÓN DE ESTRELLAS (FONDO) ---
const generateStars = (count: number) => {
  return Array.from({ length: count })
    .map(() => `${Math.random() * 2500}px ${Math.random() * 8000}px #FFF`) 
    .join(',');
};

const starsSmall = generateStars(1000); 
const starsMedium = generateStars(300);
const starsBig = generateStars(100);

const starAnimationStyles = `
  @keyframes move-stars-vertical { 
    from { transform: translateY(0px); } 
    to { transform: translateY(-1000px); } 
  }
  .star-layer {
    background: transparent;
    position: absolute;
    top: 0; left: 0; right: 0;
    z-index: 0;
    pointer-events: none;
  }
`;

export default function Home() {
  const navigate = useNavigate();

  // 🗑️ ELIMINADO: Ya no necesitamos useState ni useEffect para 'mangas' aquí.
  // El componente <Latest /> ahora es inteligente y busca sus propios datos.

  // Inyectar estilos de animación de estrellas
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = starAnimationStyles;
    styleSheet.id = "star-animation-styles"; 
    document.head.appendChild(styleSheet);
    return () => { 
        const styleElement = document.getElementById("star-animation-styles");
        if(styleElement) document.head.removeChild(styleElement); 
    };
  }, []);

  // Manejador del FilterStrip
  const handleCategoryClick = (category: string) => {
    navigate('/catalog#tactical-filters', { 
      state: { filterCategory: category }
    });
  };

  return (
    <div className="min-h-screen bg-[#02040a] overflow-x-hidden font-sans selection:bg-red-600 selection:text-white flex flex-col"> 
      
      {/* 1. HERO SECTION */}
      <section className="relative z-40 bg-black">
        <AngledHeroCarousel />
      </section>

      <div className="relative z-10 w-full pt-10 pb-20 flex-grow">
        
        {/* Fondo Gradiente y Estrellas */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#000000_0%,#02040a_10%,#1B2735_50%,#02040a_90%,#000000_100%)] z-0"></div>
        <div className="star-layer w-[1px] h-[1px]" style={{ boxShadow: starsSmall, animation: 'move-stars-vertical 100s linear infinite' }}></div>
        <div className="star-layer w-[2px] h-[2px] opacity-70" style={{ boxShadow: starsMedium, animation: 'move-stars-vertical 150s linear infinite' }}></div>
        <div className="star-layer w-[3px] h-[3px] opacity-50" style={{ boxShadow: starsBig, animation: 'move-stars-vertical 200s linear infinite' }}></div>

        {/* Contenido Vertical */}
        <div className="relative z-20 flex flex-col gap-24">
            
            {/* Tira de Filtros */}
            <FilterStrip 
                activeCategory={null} 
                onCategoryChange={handleCategoryClick} 
            />

            {/* Bloque 1: Popular (Rosado) */}
            <section><PopularCarousel /></section>
            
            {/* Bloque 2: Noticias */}
            <section><News /></section>
            
            {/* Bloque 3: Últimos General (Rosado) */}
            {/* ✅ SOLUCIÓN: Usamos Latest sin props, porque él busca sus propios datos */}
            <section>
                <Latest />
            </section>
            
            {/* Bloque 4: Lista de Actualizaciones (Manhwa/Etc) */}
            <section className="relative z-30">
                <LatestUpdates />
            </section>

            {/* --- BLOQUE JUVENIL (CELESTE) --- */}
            
            {/* Carrusel Juvenil */}
            <section>
                <YouthCarousel />
            </section>

            {/* Grilla Juvenil (Copia de Latest pero azul) */}
            <section>
                <YouthLatest />
            </section>

            {/* --- FIN BLOQUE JUVENIL --- */}

            {/* Bloque Final: Nuevos Lanzamientos */}
            <section><NewReleases /></section>
        </div>
      </div>

      <Footer /> 
    </div>
  );
}