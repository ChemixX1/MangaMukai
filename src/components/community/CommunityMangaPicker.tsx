import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Search, X } from 'lucide-react';
import { getChaptersBySeries, searchMangas, type SeriesChapter } from '../../services/mangaService';
import type { MangaCapitulo } from '../../types/manga';
import type { CommunityMangaTag } from '../../data/communityPosts';
const divider = 'border-black/10 dark:border-white/10';
const muted = 'text-black/60 dark:text-white/65';
const rowHover = 'hover:bg-black/5 dark:hover:bg-white/10';
const iconHover = rowHover;
const pill = 'bg-[#ff008c] text-white hover:bg-[#d90077]';
export function CommunityMangaPicker({ onPick, onClose }: { onPick: (tag: CommunityMangaTag) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MangaCapitulo[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<MangaCapitulo | null>(null);
  const [chapters, setChapters] = useState<SeriesChapter[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearching(false); return; }
    let active = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchMangas(query).then((found) => { if (active) setResults(found); }).catch(() => { if (active) setResults([]); }).finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (!picked) return;
    let active = true;
    setChapters(null);
    getChaptersBySeries(picked.eroSeri || picked.id).then((list) => { if (active) setChapters(list); }).catch(() => { if (active) setChapters([]); });
    return () => { active = false; };
  }, [picked]);

  const tagFor = (manga: MangaCapitulo, chapter?: SeriesChapter): CommunityMangaTag => ({
    id: String(manga.id),
    title: manga.titulo,
    cover: manga.portada,
    showCover: true,
    ...(chapter ? { chapterId: chapter.id, chapterLabel: `Capítulo ${chapter.chapter_number}${chapter.title ? ` · ${chapter.title}` : ''}` } : {}),
  });

  return (
    <div className={`community-manga-picker mb-2 overflow-hidden rounded-xl border ${divider}`}>
      {!picked ? (
        <>
          <label className={`flex items-center gap-2 border-b px-3 py-2 ${divider}`}>
            <Search size={16} className={muted} />
            <input ref={inputRef} aria-label="Buscar manga para recomendar" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca un manga para recomendar" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:opacity-60" />
            {searching ? <Loader2 size={16} className={`animate-spin ${muted}`} /> : <button type="button" onClick={onClose} aria-label="Cerrar" className={muted}><X size={16} /></button>}
          </label>
          <div className="max-h-56 overflow-y-auto">
            {results.map((manga) => (
              <button key={manga.id} type="button" onClick={() => setPicked(manga)} className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${rowHover}`}>
                <img src={manga.portada} alt="" className="h-12 w-9 shrink-0 rounded object-cover" loading="lazy" />
                <span className="min-w-0 flex-1"><strong className="block truncate text-[14px] font-semibold">{manga.titulo}</strong><small className={`block text-[12px] ${muted}`}>{manga.tipo}</small></span>
              </button>
            ))}
            {!searching && query.trim() && !results.length && <p className={`px-3 py-4 text-center text-[13px] ${muted}`}>No encontramos ese manga.</p>}
            {!query.trim() && <p className={`px-3 py-4 text-center text-[13px] ${muted}`}>Escribe el título del manga que quieres recomendar.</p>}
          </div>
        </>
      ) : (
        <>
          <div className={`flex items-center gap-3 border-b px-3 py-2 ${divider}`}>
            <button type="button" onClick={() => setPicked(null)} aria-label="Elegir otro manga" className={`rounded-full p-1 ${iconHover}`}><ArrowLeft size={16} /></button>
            <img src={picked.portada} alt="" className="h-10 w-8 shrink-0 rounded object-cover" />
            <strong className="min-w-0 flex-1 truncate text-[14px] font-semibold">{picked.titulo}</strong>
            <button type="button" onClick={() => onPick(tagFor(picked))} className={`h-8 shrink-0 rounded-[4px] px-3 text-[13px] font-semibold ${pill}`}>Solo el manga</button>
          </div>
          <p className={`px-3 pb-1 pt-2 text-[12px] font-semibold ${muted}`}>O elige un capítulo</p>
          <div className="max-h-48 overflow-y-auto pb-1">
            {chapters === null && <div role="status" aria-label="Cargando capítulos" className="h-12" />}
            {chapters?.map((chapter) => (
              <button key={chapter.id} type="button" onClick={() => onPick(tagFor(picked, chapter))} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition-colors ${rowHover}`}>
                <span className="font-semibold">Capítulo {chapter.chapter_number}</span>
                {chapter.title && <span className={`truncate text-[13px] ${muted}`}>{chapter.title}</span>}
              </button>
            ))}
            {chapters && !chapters.length && <p className={`px-3 py-4 text-center text-[13px] ${muted}`}>Este manga aún no tiene capítulos.</p>}
          </div>
        </>
      )}
    </div>
  );
}

