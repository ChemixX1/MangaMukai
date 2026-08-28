import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface RecommendationManga {
  id: number | string;
  titulo: string;
  portada: string;
  chapterCount?: number;
}

const toTitleCase = (value: string) => value
  .toLocaleLowerCase('es')
  .replace(/(^|[\s\-\u2013\u2014/([{\u00bf\u00a1'\u2019])\p{L}/gu, (match) => match.toLocaleUpperCase('es'));

export function MangaRecommendationSidebar({
  items,
  currentId,
  isLight,
  title = 'Mangas similares',
  compactDesktop = false,
}: {
  items: RecommendationManga[];
  currentId?: number | string;
  isLight: boolean;
  title?: string;
  compactDesktop?: boolean;
}) {
  const visibleItems = items
    .filter((item) => currentId === undefined || String(item.id) !== String(currentId))
    .slice(0, 8);

  if (visibleItems.length === 0) return null;

  return (
    <aside className={`rounded-2xl border p-3 backdrop-blur-xl xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:overflow-hidden ${isLight ? 'border-black/10 bg-white/75' : 'border-white/10 bg-black/55'}`} aria-label={title}>
      <h2 className={`mb-3 px-1 text-center text-sm font-black uppercase tracking-[0.05em] ${isLight ? 'text-black' : 'text-white'}`}>{title}</h2>
      <div className={`manga-related-marquee relative h-[570px] overflow-hidden rounded-xl xl:h-auto xl:flex-1 ${compactDesktop ? 'xl:min-h-[520px] xl:max-h-[620px]' : 'xl:min-h-0 xl:max-h-none'}`}>
        <div className="manga-related-marquee-track">
          {[0, 1].map((copyIndex) => (
            <div key={`recommendation-sequence-${copyIndex}`} className="manga-related-marquee-sequence" aria-hidden={copyIndex === 1 ? true : undefined}>
              {visibleItems.map((manga) => (
                <Link key={`${copyIndex}-${manga.id}`} to={`/manga/${manga.id}`} tabIndex={copyIndex === 1 ? -1 : undefined} className={`group flex min-w-0 gap-3 rounded-xl border p-2 transition-colors hover:border-[#FF4D88]/40 ${isLight ? 'border-black/[0.07] bg-white/80' : 'border-white/[0.07] bg-white/[0.035]'}`}>
                  <img src={manga.portada} alt={copyIndex === 0 ? toTitleCase(manga.titulo) : ''} loading="lazy" className="h-[92px] w-[68px] shrink-0 rounded-lg object-cover" />
                  <span className="flex min-h-[92px] min-w-0 flex-1 flex-col py-0.5">
                    <span className={`manga-related-item-title line-clamp-3 font-[Montserrat] text-[13px] font-normal normal-case leading-[1.38] transition-colors group-hover:text-[#FF4D88] ${isLight ? 'text-black/85' : 'text-white/85'}`}>{toTitleCase(manga.titulo)}</span>
                    <span className={`mt-auto flex items-center gap-3 pb-0.5 text-[12px] ${isLight ? 'text-black/55' : 'text-white/50'}`}>
                      <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold"><Star size={17} className="manga-related-star fill-[#facc15] text-[#facc15]" />10</span>
                      <span className="truncate font-semibold">{typeof manga.chapterCount === 'number' ? `${manga.chapterCount} capítulos` : 'Calculando capítulos'}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
        <span className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-gradient-to-b to-transparent ${isLight ? 'from-white/90' : 'from-black/90'}`} />
        <span className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t to-transparent ${isLight ? 'from-white/90' : 'from-black/90'}`} />
      </div>
    </aside>
  );
}
