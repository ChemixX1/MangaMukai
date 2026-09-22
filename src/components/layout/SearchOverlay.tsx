import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Biblioteca } from '../../pages/Biblioteca';
import { SearchGlyph } from '../common';
import { SEARCH_FILTERS, setSearchFilter, setSearchTerm, useSearchFilter, useSearchTerm } from '../../hooks/useSearchTerm';
import { SlidePanel } from './SlidePanel';

/**
 * Buscador de la lupa del navbar: una ventana que entra deslizándose hacia la
 * izquierda con el campo, las pestañas y toda la Biblioteca dentro.
 */
export const SearchOverlay = ({ open, isLight, onClose }: { open: boolean; isLight: boolean; onClose: () => void }) => {
  const searchTerm = useSearchTerm();
  const searchFilter = useSearchFilter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const text = isLight ? 'text-black' : 'text-white';

  return (
    <SlidePanel open={open} from="right" isLight={isLight} label="Buscar manga" onClose={onClose}>
      <div className={`sticky top-0 z-10 px-4 pt-[calc(env(safe-area-inset-top)+10px)] sm:px-8 ${isLight ? 'bg-white' : 'bg-black'}`}>
        <div className="mx-auto w-full max-w-lg">
          <div className="flex h-12 w-full items-center gap-2">
            <div className={`relative flex h-12 min-w-0 flex-1 items-center gap-2 rounded border pl-3 pr-1.5 ${isLight ? 'border-black/[0.06] bg-[#f2f2f4] text-black' : 'border-white/10 bg-white/10 text-white'}`}>
              <span className="flex shrink-0 items-center"><SearchGlyph size={24} /></span>
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
                <button type="button" onClick={() => { setSearchTerm(''); inputRef.current?.focus(); }} aria-label="Borrar búsqueda" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${isLight ? 'text-zinc-500 hover:text-black' : 'text-zinc-400 hover:text-white'}`}>
                  <X size={12} strokeWidth={2.75} />
                </button>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar búsqueda" title="Cerrar búsqueda" className={`-mr-2 rounded-full p-2 transition-colors ${text} ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'} hover:text-[#FF4D88]`}>
              <X size={26} strokeWidth={2.5} />
            </button>
          </div>

          {/* Pestañas de colección (Inter regular): "Todos" en negro puro; las no seleccionadas, negro tirando a gris. */}
          <div role="tablist" aria-label="Colección" className={`mt-6 flex items-end gap-6 border-b ${isLight ? 'border-black/10' : 'border-white/10'}`}>
            {SEARCH_FILTERS.map(({ id, label }) => {
              const active = searchFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setSearchFilter(id); inputRef.current?.focus({ preventScroll: true }); }}
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
      <Biblioteca embedded />
    </SlidePanel>
  );
};
