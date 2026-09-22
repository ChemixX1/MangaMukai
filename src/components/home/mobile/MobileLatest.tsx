import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';

import { useHomeData } from '../../../context/HomeDataContext';
import { useChapterAccess } from '../../../hooks/useChapterAccess';
import type { MangaCapitulo } from '../../../types/manga';
import { filterYouthMen } from '../../../utils/youthFilter';
import { AgendaIcon, ChapterBookIcon, CoinStackIcon, FlameIcon } from './icons';
import { MobilePagination } from './MobilePagination';
import { useFitScale } from './useFitScale';
import {
  ACCENT_HEX,
  cleanTitle,
  isPublishedChapter,
  isRecentChapter,
  matchesTypeTab,
  timeAgoEs,
  typeBadgeColor,
  TYPE_TABS,
  type MangaTypeTab,
  type MobileAccent,
} from './shared';

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
  const { outerRef, innerRef } = useFitScale<HTMLAnchorElement, HTMLSpanElement>();
  const rowClass = `flex h-8 items-center justify-center overflow-hidden px-2 mh-text ${className}`;
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
      ref={outerRef}
      to={published ? `/read/${chapter.id}` : `/manga/${manga.id}`}
      onClick={handleClick}
      className={rowClass}
      aria-label={`${manga.title}: capítulo ${chapter.numero}, ${chapter.isFree ? 'gratis' : 'de pago'}, ${chapter.isNew ? 'nuevo' : chapter.dateLabel}`}
    >
      {/* Tres grupos (icono + palabra) repartidos hasta los bordes con sus separadores;
          si algún día no caben, la fila entera se encoge (useFitScale). */}
      <span ref={innerRef} className="mh-meta-grid">
        <span className="flex shrink-0 items-center gap-[3px]">
          <ChapterBookIcon size={13} />
          <span className="mh-font-anta whitespace-nowrap text-[10px]">Cap {chapter.numero}</span>
        </span>
        <span aria-hidden="true" className="mh-meta-divider" />
        <span className="mh-font-audiowide flex shrink-0 items-center gap-[3px] whitespace-nowrap text-[8.5px]">
          {chapter.isFree
            ? <span aria-hidden="true" className="mh-free-dot h-1.5 w-1.5 rounded-full" />
            : <CoinStackIcon size={15} />}
          {chapter.isFree ? 'GRATIS' : 'PAGO'}
        </span>
        <span aria-hidden="true" className="mh-meta-divider" />
        <span className="flex shrink-0 items-center gap-[3px]" style={chapter.isNew ? { color: accentHex } : undefined}>
          {chapter.isNew && <FlameIcon size={15} className="mh-flame-live" />}
          <span className="mh-font-anta whitespace-nowrap text-[10px] uppercase">{chapter.isNew ? 'Nuevo' : chapter.dateLabel}</span>
        </span>
      </span>
    </Link>
  );
};

interface MobileLatestProps {
  audience: 'women' | 'men';
  accent: MobileAccent;
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
  const gridId = `mh-latest-${audience}`;

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
    <section id={gridId} className="mh-latest scroll-mt-16 pt-[47px]">
      {/* Cabecera */}
      <div className="flex items-center gap-[11px] pl-[29px]">
        <span className="grid h-6 w-6 place-items-center" style={{ color: accentHex }}>
          <AgendaIcon size={22} />
        </span>
        <h2 className="mh-font-dela text-xl leading-8 mh-text">
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
              className="mh-font-montserrat relative pb-[9px] text-sm font-medium leading-none mh-text"
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
              <Link to={`/manga/${manga.id}`} className="relative block aspect-[203/283] overflow-hidden rounded-t-xl mh-cover-base">
                <img src={manga.coverImage} alt={`Portada del manga ${manga.title}`} loading={index < 2 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
                {/* Etiqueta de tipo: siempre en blanco (en claro `mh-text` sería negro sobre el color de fondo). */}
                <span className="mh-font-montserrat absolute left-3.5 top-[5px] grid h-3.5 min-w-12 place-items-center rounded-[3px] px-1 text-[8px] font-black uppercase leading-none text-white" style={{ backgroundColor: typeBadgeColor(manga.type, accent) }}>
                  {manga.type}
                </span>
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[90px] mh-card-scrim" />
                <h3 className="mh-font-montserrat mh-line-clamp-2 absolute inset-x-3 bottom-[7px] text-center text-[10px] font-black uppercase leading-3 mh-text">
                  {manga.title}
                </h3>
              </Link>
              <div className="flex h-16 flex-col rounded-b-lg mh-panel">
                <ChapterRow manga={manga} chapter={manga.chapters[0]} accentHex={accentHex} onOpenPaid={openPaid} />
                <ChapterRow manga={manga} chapter={manga.chapters[1]} accentHex={accentHex} onOpenPaid={openPaid} className="border-t mh-border" />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mx-3 mt-[29px] flex items-center justify-center rounded-xl border mh-empty px-5 py-16 text-center">
          <p className="mh-font-montserrat text-base font-bold italic mh-text">Próximamente 🤓</p>
        </div>
      )}

      {chapterAccessModal}

      <div className="mt-[30px]">
        <MobilePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accent={accent} scrollTargetId={gridId} />
      </div>
    </section>
  );
};
