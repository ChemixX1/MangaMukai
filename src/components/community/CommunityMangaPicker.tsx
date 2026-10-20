import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { searchMangas } from '../../services/mangaService';
import type { MangaCapitulo } from '../../types/manga';
import type { CommunityMangaTag } from '../../data/communityPosts';

export function CommunityMangaPicker({ onPick, onClose }: { onPick: (tag: CommunityMangaTag) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MangaCapitulo[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    inputRef.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-manga-picker-trigger]')) return;
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearching(false); return; }
    let active = true;
    setSearching(true);
    setResults([]);
    const timer = window.setTimeout(() => {
      searchMangas(query).then((found) => { if (active) setResults(found); }).catch(() => { if (active) setResults([]); }).finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  return (
    <div ref={panelRef} role="dialog" aria-label="Recomendar manga" className="community-manga-picker">
      <label className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
        <Search size={16} />
        <input ref={inputRef} aria-label="Buscar manga para recomendar" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca un manga para recomendar" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:opacity-60" />
        {searching && <Loader2 size={16} className="animate-spin" />}
        <button type="button" onClick={onClose} aria-label="Cerrar selector de manga"><X size={16} /></button>
      </label>
      <div className="max-h-56 overflow-y-auto" aria-busy={searching}>
        {results.map((manga) => (
          <button key={manga.id} type="button" onClick={() => onPick({ id: String(manga.eroSeri || manga.id), title: manga.titulo, cover: manga.portada })} className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10">
            <img src={manga.portada} alt="" className="h-12 w-9 shrink-0 rounded object-cover" loading="lazy" />
            <span className="min-w-0 flex-1"><strong className="block truncate text-[14px] font-semibold">{manga.titulo}</strong><small className="block text-[12px] opacity-65">{manga.tipo}</small></span>
          </button>
        ))}
        {!searching && query.trim() && !results.length && <p role="status" className="px-3 py-4 text-center text-[13px] opacity-65">No encontramos ese manga.</p>}
        {!query.trim() && <p className="px-3 py-4 text-center text-[13px] opacity-65">Escribe el título del manga que quieres recomendar.</p>}
      </div>
    </div>
  );
}
