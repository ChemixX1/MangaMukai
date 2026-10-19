import { Link } from 'react-router-dom';
import { SearchGlyph } from '../common';
import type { NavbarViewProps } from './useNavbarState';

export function NavbarM({ model }: NavbarViewProps) {
  const { isProfileRoute, isHeaderHidden, headerUsesDarkText, hideHeaderOnMobile, openSearch, renderMobileBell, handleLogoClick } = model;
  return (<header
        className={`${isProfileRoute ? 'sticky' : 'fixed'} site-navbar-surface left-0 top-0 z-[100] w-full site-navbar-mobile h-14 transition-transform duration-300 lg:py-3 ${hideHeaderOnMobile ? 'hidden lg:block' : ''}`}
        style={{ transform: isHeaderHidden ? 'translateY(-100%)' : 'translateY(0)' }}
      >
        {/* Tres columnas iguales: el logo queda centrado de verdad, con los enlaces a la izquierda y las herramientas a la derecha. */}
        <div className={`max-w-[1400px] mx-auto h-full px-6 sm:px-8 lg:!max-w-[1366px] lg:px-6 xl:px-16 items-center grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]`}>
          <>
            {/* 1. IZQUIERDA: la campana compartida en todos los apartados. */}
            <div className="flex items-center justify-self-start">
            {renderMobileBell()}
            </div>

            {/* 2. CENTRO: logo compartido, siempre centrado. */}
            <Link to="/" onClick={handleLogoClick} className="group col-start-2 flex h-10 items-center justify-self-center lg:-translate-y-0.5" aria-label="Volver al inicio de MangaMukai">
              <span className={`home-mobile-wordmark select-none whitespace-nowrap text-xl font-[1000] uppercase italic leading-none transition-colors sm:text-3xl lg:text-2xl xl:text-3xl ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                  MANGA<span className="text-mukai-magenta">MUKAI</span>
              </span>
            </Link>

            {/* 3. DERECHA */}
            <div className={`flex col-start-3 items-center justify-self-end gap-0 sm:gap-1 lg:gap-4 lg:translate-y-0.5 xl:gap-6`}>

                <div className="contents">
                {/* Herramientas: la alarma móvil está en el menú principal. */}
                <div className={`relative flex items-center gap-0 lg:gap-2 ${headerUsesDarkText ? 'border-zinc-200' : 'border-white/10'} lg:border-r lg:mr-1 lg:pr-6`}>

                    {/* La lupa abre el buscador también en Comunidad y Tienda. */}
                    <button
                        onClick={openSearch}
                        aria-label="Buscar mangas"
                        title="Buscar mangas"
                        className={`${headerUsesDarkText ? 'text-black' : 'text-white'} flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 motion-reduce:transition-none`}
                    >
                        <span className="flex items-center"><SearchGlyph size={25.2} /></span>
                    </button>
                </div>

                </div>
            </div>
          </>
        </div>
      </header>);
}
