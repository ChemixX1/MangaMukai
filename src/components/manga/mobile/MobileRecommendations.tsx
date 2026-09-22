import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { ChaptersTabIcon, RecommendationsHeadingIcon } from './designIcons';
import type { RecommendationManga } from '../MangaRecommendationSidebar';
import { toTitleCase } from '../../../utils/titleCase';

/**
 * "Recomendaciones" del diseño. Conserva la animación de la versión de
 * escritorio: la lista se duplica y el carril (.manga-related-marquee-track)
 * la desplaza en bucle.
 */
export const MobileRecommendations = ({ items, currentId }: { items: RecommendationManga[]; currentId?: number | string }) => {
  const visibleItems = items
    .filter((item) => currentId === undefined || String(item.id) !== String(currentId))
    .slice(0, 8);

  if (visibleItems.length === 0) return null;

  return (
    <section aria-label="Recomendaciones" className="mmd-recommendations mx-auto w-[87.3%]">
      <div className="mmd-recommendations-panel rounded-2xl border-[0.5px] border-zinc-400/60 px-3 py-5">
        <h2 className="mmd-montserrat flex items-center justify-center gap-2 text-xl font-black leading-4">
          <RecommendationsHeadingIcon size={24} className="fill-[#FFCD0F] text-[#FFCD0F]" aria-hidden="true" />
          RECOMENDACIONES
        </h2>

        <div className="manga-related-marquee relative mt-6 h-[600px] overflow-hidden">
          <div className="manga-related-marquee-track">
            {[0, 1].map((copyIndex) => (
              <div key={`mmd-recommendation-${copyIndex}`} className="manga-related-marquee-sequence" aria-hidden={copyIndex === 1 ? true : undefined}>
                {visibleItems.map((manga) => (
                  <Link
                    key={`${copyIndex}-${manga.id}`}
                    to={`/manga/${manga.id}`}
                    tabIndex={copyIndex === 1 ? -1 : undefined}
                    className="mmd-recommendation-row flex min-w-0 items-start gap-4 border-b border-neutral-500/60 px-1 py-3 last:border-b-0"
                  >
                    <img src={manga.portada} alt={copyIndex === 0 ? toTitleCase(manga.titulo) : ''} loading="lazy" className="h-24 w-[70px] shrink-0 rounded-lg object-cover" />
                    <span className="flex min-h-24 min-w-0 flex-1 flex-col">
                      <span className="mmd-montserrat line-clamp-3 text-sm font-normal leading-4 text-white">{toTitleCase(manga.titulo)}</span>
                      <span className="mt-auto flex items-center gap-4">
                        <span className="mmd-anta inline-flex items-center gap-1.5 text-sm leading-4 text-white">
                          <Star size={20} className="fill-[#FFCD0F] text-[#FFCD0F]" aria-hidden="true" />10
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-neutral-200">
                          <ChaptersTabIcon size={16} className="shrink-0" />
                          <span className="mmd-anta truncate text-xs leading-4">
                            {typeof manga.chapterCount === 'number' ? manga.chapterCount : '—'}
                            <span className="mmd-montserrat font-medium"> Capítulos</span>
                          </span>
                        </span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-black to-transparent" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-black to-transparent" />
        </div>
      </div>
    </section>
  );
};
