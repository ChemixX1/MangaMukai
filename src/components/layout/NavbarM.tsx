import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEARCH_FILTERS, setSearchFilter, setSearchTerm } from '../../hooks/useSearchTerm';
import { SearchGlyph } from '../common';
import type { NavbarViewProps } from './useNavbarState';

export function NavbarM({ model }: NavbarViewProps) {
  const { isProfileRoute, isHeaderHidden, isSearchMode, headerUsesDarkText, searchTerm, searchFilter, hideHeaderOnMobile, searchInputRef, searchGlyphRef, openSearch, closeSearch, renderMobileBell, handleLogoClick } = model;
  return (<header
        className={`${isProfileRoute ? 'sticky' : 'fixed'} site-navbar-surface left-0 top-0 z-[100] w-full ${isSearchMode ? 'py-2.5' : 'site-navbar-mobile h-14'} transition-transform duration-300 lg:py-3 ${hideHeaderOnMobile ? 'hidden lg:block' : ''} ${isSearchMode ? 'pb-0' : ''}`}
        style={{ transform: isHeaderHidden && !isSearchMode ? 'translateY(-100%)' : 'translateY(0)' }}
      >
        {/* Tres columnas iguales: el logo queda centrado de verdad, con los enlaces a la izquierda y las herramientas a la derecha. */}
        <div className={`max-w-[1400px] mx-auto ${isSearchMode ? 'px-4' : 'h-full px-6'} sm:px-8 lg:!max-w-[1366px] lg:px-6 xl:px-16 items-center ${isSearchMode ? 'flex justify-between' : 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'}`}>
          {isSearchMode ? (
            <div className="w-full">
              <div className="flex h-14 w-full items-center gap-2">
                {/* Píldora: la lupa (que llega volando desde la derecha) y el campo hasta justo antes de la X.
                    El fondo va en ::before para que su fundido no arrastre a la lupa. */}
                <div className={`navbar-search-pill relative flex h-14 min-w-0 flex-1 items-center gap-2 pl-3 pr-1.5 before:absolute before:inset-0 before:rounded before:border before:content-[''] ${headerUsesDarkText ? 'text-black before:border-black/[0.06] before:bg-[#f2f2f4]' : 'text-white before:border-white/10 before:bg-white/10'}`}>
                  <span ref={searchGlyphRef} className="relative flex shrink-0 items-center">
                    <SearchGlyph size={24} />
                  </span>
                  <input
                    ref={searchInputRef}
                    type="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    placeholder="Busca títulos, autores o palabras clave"
                    aria-label="Buscar manga"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className={`relative h-full min-w-0 flex-1 bg-transparent font-[Montserrat] text-[14px] font-semibold outline-none placeholder:text-[12.5px] placeholder:text-ellipsis [&::-webkit-search-cancel-button]:hidden ${headerUsesDarkText ? 'placeholder:text-zinc-400' : 'placeholder:text-zinc-500'}`}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                      aria-label="Borrar búsqueda"
                      className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${headerUsesDarkText ? 'text-zinc-500 hover:text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      <X size={12} strokeWidth={2.75} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Cerrar búsqueda"
                  title="Cerrar búsqueda"
                  className={`navbar-search-close -mr-2 rounded-full p-2 transition-colors ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'}`}
                >
                  <X size={26} strokeWidth={2.5} />
                </button>
              </div>

              {/* Pestañas de colección (Inter regular): "Todos" en negro puro; las no seleccionadas, negro tirando a gris. */}
              <div role="tablist" aria-label="Colección" className="navbar-search-filters mt-6 flex items-end gap-6">
                {SEARCH_FILTERS.map(({ id, label }) => {
                  const active = searchFilter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => { setSearchFilter(id); searchInputRef.current?.focus({ preventScroll: true }); }}
                      className={`relative pb-2.5 font-[Inter] text-[15px] leading-none transition-colors ${active ? `font-medium ${headerUsesDarkText ? 'text-black' : 'text-white'}` : `font-normal ${headerUsesDarkText ? 'text-[#4b4b50] hover:text-black' : 'text-zinc-400 hover:text-white'}`}`}
                    >
                      {label}
                      {/* Rayita bajo la pestaña activa, apoyada en la línea separadora de la cabecera. */}
                      {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-current" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
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
                        className={`${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'} flex h-11 w-11 items-center justify-center rounded-full transition-colors`}
                    >
                        <span ref={searchGlyphRef} className="flex items-center"><SearchGlyph size={25.2} /></span>
                    </button>
                </div>

                </div>
            </div>
          </>
          )}
        </div>
      </header>);
}
