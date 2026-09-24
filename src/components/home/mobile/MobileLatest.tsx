import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';

import { useHomeData } from '../../../context/HomeDataContext';
import { useChapterAccess } from '../../../hooks/useChapterAccess';
import type { MangaCapitulo } from '../../../types/manga';
import {
  cleanTitle,
  isPublishedChapter,
  isRecentChapter,
  matchesTypeTab,
  timeAgoEs,
  TYPE_TABS,
  type MangaTypeTab,
} from '../../../utils/mangaFormat';
import { filterYouthMen } from '../../../utils/youthFilter';
import { ACCENT_HEX, AgendaIcon, ArrowPagination, ChapterMeta, TypeBadge, type Accent } from '../../ui';

const ITEMS_PER_PAGE = 6;

interface LatestChapter {
  id: number;
  numero: string;
  isFree: boolean;
  isNew: boolean;
  dateLabel: string;
}

interface LatestManga {
  id: number | string;
  seriesId: number | string | null;
  title: string;
  coverImage: string;
  type: string;
  chapters: LatestChapter[];
}

const toLatest = (mangas: MangaCapitulo[]): LatestManga[] =>
  mangas.map((manga) => ({
    id: manga.id,
    seriesId: manga.eroSeri || manga.id,
    title: cleanTitle(manga.titulo),
    coverImage: manga.portada,
    type: manga.tipo || 'Manga',
    chapters: (manga.capitulosRecientes || []).slice(0, 2).map((chapter) => ({
      id: chapter.id,
      numero: chapter.numero,
      isFree: chapter.esGratis,
      isNew: isRecentChapter(chapter.fecha),
      dateLabel: timeAgoEs(chapter.fecha),
    })),
  }));

interface ChapterRowProps {
  manga: LatestManga;
  chapter: LatestChapter | undefined;
  accentHex: string;
  onOpenPaid: (manga: LatestManga, chapter: LatestChapter) => void;
  className?: string;
}

/**
 * Fila de capítulo: abre el lector (o la compra si es de pago); sin capítulo
 * lleva a la ficha. Si "Cap 100 · GRATIS · 2 Meses" no cabe, la fila entera se
 * encoge en bloque en vez de descuadrarse.
 */
const ChapterRow = ({ manga, chapter, accentHex, onOpenPaid, className = '' }: ChapterRowProps) => {
  const rowClass = `flex h-8 items-center justify-center overflow-hidden px-2 text-ink ${className}`;
  if (!chapter) {
    return <Link to={`/manga/${manga.id}`} aria-label={`Ver ${manga.title}`} className={rowClass} />;
  }

  const published = isPublishedChapter(chapter);
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!published || chapter.isFree) return;
    event.preventDefault();
    onOpenPaid(manga, chapter);
  };

  return (
    <Link
      to={published ? `/read/${chapter.id}` : `/manga/${manga.id}`}
      onClick={handleClick}
      className={rowClass}
      aria-label={`${manga.title}: capítulo ${chapter.numero}, ${chapter.isFree ? 'gratis' : 'de pago'}, ${chapter.isNew ? 'nuevo' : chapter.dateLabel}`}
    >
      <ChapterMeta chapter={chapter.numero} isFree={chapter.isFree} date={chapter.dateLabel} isNew={chapter.isNew} accentHex={accentHex} />
    </Link>
  );
};

interface MobileLatestProps {
  audience: 'women' | 'men';
  accent: Accent;
}

/**
 * "Lo Más Reciente": pestañas Manga / Manhua / Manhwa, rejilla de dos columnas
 * con los dos últimos capítulos de cada serie y la paginación en flecha.
 */
export const MobileLatest = ({ audience, accent }: MobileLatestProps) => {
  const { latestWomen, latestMen, isReady } = useHomeData();
  const { openChapter, chapterAccessModal } = useChapterAccess();
  const [tab, setTab] = useState<MangaTypeTab>('Manga');
  const [currentPage, setCurrentPage] = useState(1);
  const accentHex = ACCENT_HEX[accent];
  const gridId = `recent-${audience}`;

  const allItems = useMemo(
    () => toLatest(audience === 'men' ? filterYouthMen(latestMen) : latestWomen),
    [audience, latestMen, latestWomen],
  );
  const items = useMemo(() => allItems.filter((manga) => matchesTypeTab(manga.type, tab)), [allItems, tab]);
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const pageItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const selectTab = (nextTab: MangaTypeTab) => {
    setTab(nextTab);
    setCurrentPage(1);
  };

  const openPaid = (manga: LatestManga, chapter: LatestChapter) => {
    void openChapter({ chapterId: chapter.id, seriesId: manga.seriesId, isFree: chapter.isFree, chapterNumber: chapter.numero });
  };

  if (!isReady) return null;

  return (
    <section id={gridId} className="scroll-mt-16 pt-[47px]">
      {/* Cabecera */}
      <div className="flex items-center gap-[11px] pl-[29px]">
        <span className="grid h-6 w-6 place-items-center" style={{ color: accentHex }}>
          <AgendaIcon size={22} />
        </span>
        <h2 className="font-dela text-xl font-normal leading-8 text-ink">
          Lo Más <span style={{ color: accentHex }}>Reciente</span>
        </h2>
      </div>

      {/* Tipo */}
      <div role="tablist" aria-label="Tipo de obra" className="mt-[11px] flex items-end gap-[30px] pl-[62px]">
        {TYPE_TABS.map((option) => {
          const active = option === tab;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(option)}
              className="relative pb-[9px] font-montserrat text-sm font-medium leading-none text-ink"
            >
              {option}
              {active && <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-0.5 w-14 -translate-x-1/2" style={{ backgroundColor: accentHex }} />}
            </button>
          );
        })}
      </div>

      {/* Rejilla */}
      {pageItems.length > 0 ? (
        <div className="mt-[29px] grid grid-cols-2 gap-x-[11px] gap-y-[21px] px-3">
          {pageItems.map((manga, index) => (
            <article key={String(manga.id)} className="flex flex-col">
              <Link to={`/manga/${manga.id}`} className="relative block aspect-[203/283] overflow-hidden rounded-t-xl bg-media">
                <img src={manga.coverImage} alt={`Portada del manga ${manga.title}`} loading={index < 2 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
                <TypeBadge type={manga.type} accent={accent} className="absolute left-3.5 top-[5px] h-3.5 min-w-12 rounded-[3px] px-1 text-[8px]" />
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[90px] bg-gradient-to-t from-surface/95 via-surface/55 to-transparent" />
                <h3 className="absolute inset-x-3 bottom-[7px] line-clamp-2 text-center font-montserrat text-[10px] font-black uppercase leading-3 text-ink">
                  {manga.title}
                </h3>
              </Link>
              <div className="flex h-16 flex-col rounded-b-lg bg-panel">
                <ChapterRow manga={manga} chapter={manga.chapters[0]} accentHex={accentHex} onOpenPaid={openPaid} />
                <ChapterRow manga={manga} chapter={manga.chapters[1]} accentHex={accentHex} onOpenPaid={openPaid} className="border-t border-line" />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mx-3 mt-[29px] flex items-center justify-center rounded-xl border border-ink/[.07] bg-ink/[.04] px-5 py-16 text-center">
          <p className="font-montserrat text-base font-bold italic text-ink">Próximamente 🤓</p>
        </div>
      )}

      {chapterAccessModal}

      <div className="mt-[30px]">
        <ArrowPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accent={accent} scrollTargetId={gridId} />
      </div>
    </section>
  );
};
