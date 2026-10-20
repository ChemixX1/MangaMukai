import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getMangaById } from '../../../services/mangaService';
import type { MangaCapitulo } from '../../../types/manga';
import { cleanTitle, formatViewsEs } from '../../../utils/mangaFormat';

interface RelatedMangaProps {
  mangaId: number;
}

export const RelatedManga = ({ mangaId }: RelatedMangaProps) => {
  const [manga, setManga] = useState<MangaCapitulo | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setManga(undefined);
    void getMangaById(mangaId).then((result) => { if (active) setManga(result); });
    return () => { active = false; };
  }, [mangaId]);

  if (manga === null) return null;

  return (
    <div className="mt-3 flex min-h-[118px] items-center gap-3 rounded-xl bg-[#f0f0f0] p-2 pr-3 shadow-[0_8px_22px_-6px_rgba(0,0,0,0.14)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.2)] dark:bg-zinc-900 dark:ring-white/10 dark:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.55)]">
      {manga && (
        <Link to={`/manga/${manga.id}`} className="group flex min-w-0 flex-1 items-center gap-3">

          <span className="h-[102px] w-[68px] shrink-0 overflow-hidden rounded-md bg-zinc-200 shadow-md dark:bg-zinc-300">
            <img src={manga.portada} alt={`Portada de ${cleanTitle(manga.titulo)}`} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 block font-montserrat text-[15px] font-bold leading-5 transition-colors group-hover:text-mukai-magenta">{cleanTitle(manga.titulo)}</span>
            <span className="mt-1 block font-raleway text-[11px] text-black/55 dark:text-white/55">
              {manga.tipo}{manga.totalViews ? ` · ${formatViewsEs(manga.totalViews)}` : ''}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-black/55 transition-transform duration-300 group-hover:translate-x-1 dark:text-white/55" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
};
