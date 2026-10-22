import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Biblioteca } from '../../pages/Biblioteca';
import { SearchIcon, SearchCloseIcon, SearchEraseIcon } from './SearchIcons';
import { searchBanners } from '../../config/searchAppearance';
import '../../styles/search.css';
import { SEARCH_FILTERS, setSearchFilter, setSearchTerm, useSearchFilter, useSearchTerm } from '../../hooks/useSearchTerm';
import { SlidePanel } from './SlidePanel';

export const SearchOverlay = ({ open, isLight, onClose }: { open: boolean; isLight: boolean; onClose: () => void }) => {
  const [contentReady, setContentReady] = useState(false);
  useEffect(() => {
    if (!open || contentReady) return;
    const timer = window.setTimeout(() => setContentReady(true), 420);
    return () => window.clearTimeout(timer);
  }, [open, contentReady]);
  const searchTerm = useSearchTerm();
  const searchFilter = useSearchFilter();
  const inputRef = useRef<HTMLInputElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const isSearching = searchTerm.trim().length > 0;

  useEffect(() => {
    centerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [searchFilter, isSearching]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 420);
    return () => window.clearTimeout(timer);
  }, [open]);

  const text = isLight ? 'text-black' : 'text-white';

  return (
    <SlidePanel open={open} from="right" isLight={isLight} label="Buscar manga" onClose={onClose} scrollable={false} animateOnOpen>
      <div className={`search-layout ${isLight ? 'search-light' : 'search-dark'}`}>
        <aside className="search-banner" aria-hidden="true"><img src={searchBanners.left} alt="" /></aside>
        <div ref={centerRef} className="search-center">
      <div className={`search-header sticky top-0 z-10 px-4 pt-[calc(env(safe-area-inset-top)+10px)] sm:px-8 ${isLight ? 'bg-white' : 'bg-black'}`}>
        <div className="search-header-inner mx-auto w-full max-w-lg">
          <div className="search-input-row flex h-14 w-full items-center gap-2">
            <div className={`search-input relative flex h-14 min-w-0 flex-1 items-center gap-2 rounded border pl-3 pr-1.5 ${isLight ? 'border-black/[0.06] bg-[#f2f2f4] text-black' : 'border-white/10 bg-white/10 text-white'}`}>
              <span className="flex shrink-0 items-center"><SearchIcon className="search-input-icon" /></span>
              <input
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Busca títulos, autores o palabras clave"
                aria-label="Buscar manga"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className={`h-full min-w-0 flex-1 bg-transparent font-[Montserrat] text-[14px] font-semibold outline-none placeholder:text-[12.5px] placeholder:text-ellipsis [&::-webkit-search-cancel-button]:hidden ${isLight ? 'placeholder:text-zinc-400' : 'placeholder:text-zinc-500'}`}
              />
              {searchTerm && (
                <button type="button" onClick={() => { setSearchTerm(''); inputRef.current?.focus(); }} aria-label="Borrar búsqueda" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${isLight ? 'text-black hover:text-zinc-600' : 'text-white hover:text-zinc-300'}`}>
                  <SearchEraseIcon />
                </button>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar búsqueda" title="Cerrar búsqueda" className={`search-close -mr-2 rounded-full p-2 transition-colors ${text} ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'} hover:text-[#FF4D88]`}>
              <SearchCloseIcon />
            </button>
          </div>


          <div role="tablist" aria-label="Colección" className={`search-tabs mt-6 flex items-end gap-6 border-b ${isLight ? 'border-black/10' : 'border-white/10'}`}>
            {SEARCH_FILTERS.map(({ id, label }) => {
              const active = searchFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setSearchFilter(id); if (window.matchMedia('(max-width: 1023px)').matches) inputRef.current?.blur(); else inputRef.current?.focus({ preventScroll: true }); }}
                  className={`relative pb-2.5 font-[Inter] text-[15px] leading-none transition-colors ${active ? `font-medium ${text}` : `font-normal ${isLight ? 'text-[#4b4b50] hover:text-black' : 'text-zinc-400 hover:text-white'}`}`}
                >
                  {label}
                  {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-current" />}
                </button>
              );
            })}
          </div>

        </div>
      </div>
      {contentReady ? <Biblioteca collectionAction={searchFilter !== 'todos' ? (
        <Link
          to={searchFilter === 'bn' ? '/manga-bn' : '/manga-19'}
          onClick={onClose}
          className={`inline-flex shrink-0 items-center justify-center rounded-md px-2.5 py-1.5 font-montserrat text-[11px] font-semibold leading-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden ${searchFilter === 'bn' ? 'bg-[#4C4C4C] focus-visible:outline-[#4C4C4C]' : 'bg-[#FB5937] focus-visible:outline-[#FB5937]'}`}
        >
          Ir a {searchFilter === 'bn' ? 'Manga B&N' : 'Manga Hot'}
        </Link>
      ) : undefined} /> : <div role="status" aria-label="Preparando búsqueda" className="mx-auto w-full max-w-lg space-y-4 p-4 motion-safe:animate-pulse"><div className="h-24 rounded-xl bg-zinc-400/15" /><div className="h-40 rounded-xl bg-zinc-400/15" /></div>}
        </div>
        <aside className="search-banner" aria-hidden="true"><img src={searchBanners.right} alt="" /></aside>
      </div>
    </SlidePanel>
  );
};
