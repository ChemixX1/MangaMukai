import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

import { ChaptersTabIcon, RecommendationsHeadingIcon } from './designIcons';
import { toTitleCase } from '../../utils/titleCase';

export interface RecommendationManga {
  id: number | string;
  titulo: string;
  portada: string;
  chapterCount?: number;
}

/**
 * "Recomendaciones" del diseño: la lista se duplica y el carril
 * (animate-marquee-y) la desplaza en bucle; con el puntero o el foco encima se
 * detiene. En móvil va al final de la ficha y en escritorio en la columna
 * derecha, donde `className` y `listClassName` ajustan el alto al hueco.
 */
export const MangaRecommendations = ({
  items,
  currentId,
  title = 'Series similares',
  loading = false,
  className = '',
  listClassName = 'h-[600px]',
}: {
  items: RecommendationManga[];
  currentId?: number | string;
  title?: string;
  loading?: boolean;
  className?: string;
  listClassName?: string;
}) => {
  const visibleItems = items
    .filter((item) => currentId === undefined || String(item.id) !== String(currentId))
    .slice(0, 8);

  if (loading) return <section aria-label="Cargando series similares" role="status" className={`manga-recommendations rounded-2xl border border-line p-5 ${className}`}><h2 className="text-center font-montserrat text-base font-black uppercase">Series <span className="text-mukai-magenta">similares</span></h2><div className="mt-6 space-y-4">{Array.from({ length: 5 }, (_, i) => <div key={i} aria-hidden="true" className="h-[75px] rounded bg-ink/5 animate-pulse motion-reduce:animate-none" />)}</div></section>;
  if (visibleItems.length === 0) return null;

  return (
    <section aria-label={title} className={`manga-recommendations flex flex-col rounded-2xl border-[0.5px] border-zinc-400/60 bg-surface px-[26px] pb-[17px] pt-[23px] text-ink max-[400px]:px-4 ${className}`}>
      <h2 className="flex items-center justify-center gap-2 whitespace-nowrap font-montserrat text-xl font-black uppercase leading-4 max-[400px]:text-base">
        <RecommendationsHeadingIcon size={24} className="fill-mukai-gold text-mukai-gold" />
        {title === "Series similares" ? <span>Series <span className="text-mukai-magenta">similares</span></span> : title}
      </h2>

      <div className={`group/marquee relative mt-[42px] overflow-hidden ${listClassName}`}>
        <div className="flex w-full animate-marquee-y flex-col will-change-transform group-hover/marquee:[animation-play-state:paused] group-focus-within/marquee:[animation-play-state:paused] motion-reduce:[animation-play-state:paused]">
          {[0, 1].map((copyIndex) => (
            <div key={`recommendation-${copyIndex}`} className="flex flex-none flex-col" aria-hidden={copyIndex === 1 ? true : undefined}>
              {visibleItems.map((manga) => (
                <Link
                  key={`${copyIndex}-${manga.id}`}
                  to={`/manga/${manga.id}`}
                  tabIndex={copyIndex === 1 ? -1 : undefined}
                  className="group flex h-[120px] min-w-0 items-start gap-[11px] border-b border-neutral-500/60 pb-[25px] last:border-b-0"
                >
                  <img src={manga.portada} alt={copyIndex === 0 ? toTitleCase(manga.titulo) : ''} loading="lazy" className="h-[94px] w-[70px] shrink-0 rounded-lg object-cover" />
                  <span className="flex min-h-[94px] min-w-0 flex-1 flex-col">
                    <span className="line-clamp-3 font-montserrat text-sm font-normal leading-4 transition-colors group-hover:text-mukai-magenta">{toTitleCase(manga.titulo)}</span>
                    <span className="mt-auto flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5 font-anta text-sm font-normal leading-4">
                        <Star size={20} className="fill-mukai-gold text-mukai-gold" aria-hidden="true" />10
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-ink/85">
                        <ChaptersTabIcon size={16} className="shrink-0" />
                        <span className="truncate font-anta text-xs font-normal leading-4">
                          {typeof manga.chapterCount === 'number' ? manga.chapterCount : '—'}
                          <span className="font-montserrat font-medium">{manga.chapterCount === 1 ? ' Capítulo' : ' Capítulos'}</span>
                        </span>
                      </span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-surface to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-surface to-transparent" />
      </div>
    </section>
  );
};
