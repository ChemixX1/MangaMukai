import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const categories = [
  "Drama", "Romance", "Fantasía", 
  "Fusión", "Niños", "Leyenda", 
  "Nobleza", "Comedia", "Todos"
];

const FilterStrip = () => {
  // CORRECCIÓN 1: Definimos que el estado puede ser string o null
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const navigate = useNavigate();

  // CORRECCIÓN 2: Tipamos el parámetro 'category' como string
  const handleFilterClick = (category: string) => {
    setActiveFilter(category);
    
    if (category !== "Todos") {
        navigate('/catalogo', { state: { filter: category } });
    } else {
        navigate('/catalogo');
    }
  };

  return (
    <>
      <style>{`
        @keyframes scanline {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .beam-blue {
          background: linear-gradient(90deg, transparent 0%, #3b82f6 50%, transparent 100%);
          width: 100%;
          height: 100%;
          opacity: 1;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }

        .scan-top {
          animation: scanline 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .scan-bottom {
          animation: scanline 4s cubic-bezier(0.4, 0, 0.2, 1) infinite reverse;
        }
      `}</style>

      {/* CONTENEDOR PRINCIPAL */}
      <div id="tactical-filters" className="relative z-40 w-full bg-[#02040a] mt-0 overflow-hidden border-t border-blue-900/30">
        
        {/* === LÁSER SUPERIOR === */}
        <div className="absolute top-0 left-0 w-full h-[1px] z-50 opacity-50">
            <div className="beam-blue scan-top"></div>
        </div>

        {/* === LÁSER INFERIOR === */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] z-50 opacity-50">
            <div className="beam-blue scan-bottom"></div>
        </div>

        <div className="container mx-auto max-w-full">
          
          {/* GRILLA DE COMBATE */}
          <div className="grid grid-cols-3 md:grid-cols-9 w-full relative z-10">
              
              {categories.map((category) => {
                  const isActive = activeFilter === category;
                  const isNumber = category.startsWith("+");

                  return (
                      <button
                          key={category}
                          onClick={() => handleFilterClick(category)} 
                          className={`
                              group relative w-full
                              h-12 md:h-16 lg:h-20 
                              flex flex-col items-center justify-center
                              
                              /* BORDES AZULADOS SUTILES */
                              border-r border-blue-900/20
                              last:border-r-0
                              
                              transition-all duration-300 ease-out
                              overflow-hidden
                              
                              /* Fondo siempre oscuro */
                              bg-[#02040a] hover:bg-blue-950/30
                          `}
                      >
                          {/* TEXTO */}
                          <span className={`
                              relative z-10 font-black uppercase tracking-tighter leading-none
                              transition-all duration-300
                              ${isNumber ? "font-mono text-sm md:text-lg tracking-widest" : "italic text-xs md:text-sm lg:text-lg"}
                              
                              ${isActive 
                                  ? "text-white scale-110 drop-shadow-md" 
                                  : "text-slate-600 group-hover:text-blue-400 group-hover:scale-105"
                              }
                          `}>
                              {category}
                          </span>

                          {/* DECORACIÓN ACTIVA (Esquina Táctica) */}
                          {isActive && (
                            <>
                              <svg className="absolute bottom-1 right-1 w-2 h-2 text-blue-300 opacity-50" viewBox="0 0 10 10">
                                  <path d="M10 0V10H0" fill="none" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                              <svg className="absolute top-1 left-1 w-2 h-2 text-blue-300 opacity-50 rotate-180" viewBox="0 0 10 10">
                                  <path d="M10 0V10H0" fill="none" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                            </>
                          )}

                          {/* SCANLINE INTERNA (Efecto Radar en Hover) */}
                          {!isActive && (
                              <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
                          )}
                          
                          {/* INDICADOR DE CARGA INFERIOR (Solo activo) */}
                          {isActive && (
                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_white]"></div>
                          )}
                      </button>
                  );
              })}
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterStrip;