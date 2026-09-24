import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getMangaById } from '../../../services/mangaService';
import type { MangaCapitulo } from '../../../types/manga';
import { cleanTitle, formatViewsEs } from '../../../utils/mangaFormat';

interface RelatedMangaProps {
  mangaId: number;
}

/**
 * "Manga Referencial": la serie del catálogo ligada al personaje, con su
 * portada entera (2:3), título y tipo; lleva a la ficha del manga. Mientras
 * carga se ve el hueco de la tarjeta; si no existe, no se pinta nada.
 */
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
    <div className="mt-3 flex min-h-[118px] items-center gap-3 rounded-xl bg-[#f0f0f0] p-2 pr-3 dark:bg-zinc-900">
      {manga && (
        <Link to={`/manga/${manga.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          {/* Portada entera, en su proporción (2:3), sin recortarla en cuadrado. */}
          <img src={manga.portada} alt={`Portada de ${cleanTitle(manga.titulo)}`} loading="lazy" decoding="async" className="h-[102px] w-[68px] shrink-0 rounded-md bg-zinc-200 object-cover dark:bg-zinc-300" />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 block font-montserrat text-[15px] font-bold leading-5">{cleanTitle(manga.titulo)}</span>
            <span className="mt-1 block font-raleway text-[11px] text-black/55 dark:text-white/55">
              {manga.tipo}{manga.totalViews ? ` · ${formatViewsEs(manga.totalViews)}` : ''}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-black/55 dark:text-white/55" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
};
