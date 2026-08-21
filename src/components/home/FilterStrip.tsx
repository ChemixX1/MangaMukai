import type { CSSProperties } from 'react';

const categories = [
  "Drama", "Romance", "Fantasía", 
  "Fusión", "Niños", "Leyenda", 
  "Nobleza", "Comedia", "Todos"
];

interface FilterStripProps {
  activeCategory: string | null;
  onCategoryChange: (category: string) => void;
  id?: string;
  className?: string;
  beamColor?: string;
}

const FilterStrip = ({ activeCategory, onCategoryChange, id, className = '', beamColor = '#ec4899' }: FilterStripProps) => {

  return (
    <>
      <style>{`
        @keyframes scanline {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .home-filter-strip .beam {
          background: linear-gradient(90deg, transparent 0%, var(--filter-beam-color) 80%, transparent 100%);
          width: 100%;
          height: 100%;
          opacity: 1;
        }

        .scan-top {
          animation: scanline 2.7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .scan-bottom {
          animation: scanline 2.7s cubic-bezier(0.4, 0, 0.2, 1) infinite reverse;
        }

        /* Ocultar scrollbar pero permitir scroll */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* CONTENEDOR PRINCIPAL */}
      <div
        id={id}
        className={`home-filter-strip home-theme-surface relative z-40 w-full bg-black -mt-10 md:-mt-10 lg:-mt-10 pt-0 overflow-hidden pb-0 block ${className}`}
        style={{ '--filter-beam-color': beamColor } as CSSProperties}
      >
        
        {/* === LÁSER SUPERIOR === */}
        <div className="absolute top-0 left-0 w-full h-[2.58px] z-50">
            <div className="beam scan-top"></div>
        </div>

        {/* === LÁSER INFERIOR === */}
        <div className="absolute bottom-0 left-0 w-full h-[2.58px] z-50">
            <div className="beam scan-bottom"></div>
        </div>

        <div className="desktop-content-shell container mx-auto max-w-full">
          
          {/* CAMBIO REALIZADO AQUÍ:
              - Móvil (default): 'flex overflow-x-auto no-scrollbar' -> Crea una fila con scroll horizontal sin barra visible.
              - PC (md): 'md:grid md:grid-cols-9 md:overflow-visible' -> Restaura tu diseño de grilla perfecto.
          */}
          <div className="flex overflow-x-auto no-scrollbar md:grid md:grid-cols-9 w-full relative z-10">
              
              {categories.map((category) => {
                  const isActive = activeCategory === category;

                  return (
                      <button
                          key={category}
                          onClick={() => onCategoryChange(category)}
                          /* CAMBIO EN CLASES DEL BOTÓN:
                             - 'flex-shrink-0' -> Evita que los botones se aplasten en móvil.
                             - 'min-w-[33vw] sm:min-w-[20vw]' -> Define el ancho en móvil (3 botones visibles aprox).
                             - 'md:min-w-0 md:w-full' -> En PC vuelve a ocupar el espacio de la grilla.
                          */
                          data-active={isActive}
                          className={`
                              home-filter-button
                              group relative 
                              flex-shrink-0 min-w-[33vw] sm:min-w-[20vw] md:min-w-0 md:w-full
                              h-10 md:h-16 lg:h-20 
                              flex flex-col items-center justify-center
                              border-r border-neutral-900
                              border-b-0
                              transition-all duration-0 ease-linear
                              overflow-hidden
                              ${isActive ? "bg-neutral-800" : "bg-neutral-1000 hover:bg-neutral-700"}
                          `}
                      >
                          {/* TEXTO */}
                          <span className={`
                              home-filter-label
                              relative z-10 font-black uppercase tracking-tighter leading-none
                              transition-all duration-200
                              text-lg md:text-2xl
                              ${category.startsWith("+") ? "font-mono tracking-tighter" : "italic"}
                              ${isActive 
                                  ? "text-black scale-110" 
                                  : "text-neutral-600 group-hover:text-white"
                              }
                          `}>
                              {category}
                          </span>

                          {/* DECORACIÓN ACTIVA */}
                          {isActive && (
                              <svg className="absolute bottom-1 right-1 w-3 h-3 text-black opacity-50" viewBox="0 0 10 10">
                                  <path d="M10 0V10H0" fill="none" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                          )}

                          {/* SCANLINE INTERNA */}
                          {!isActive && (
                              <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
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
