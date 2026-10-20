import { openSearchPanel } from '../../hooks/useSearchTerm';
import { Flame, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import type { MangaCapitulo } from '../../types/manga';
import { HomeNewIcon, HomeRecentIcon } from '../home/HomeIcons';
import { HomePagination } from '../home/HomePagination';
import { ACCENT_COLOR, ViewAllIcon, type Accent } from '../ui';
import { useChapterAccess } from '../../hooks/useChapterAccess';
import { getChaptersBySeries, type SeriesChapter } from '../../services/mangaService';
import { getStoredToken, getUnlockedChapters } from '../../services/authService';
import { isRecentChapter, matchesTypeTab, TYPE_TABS, type MangaTypeTab } from '../../utils/mangaFormat';
import { whenIdle } from '../../utils/whenIdle';

interface AdultLatestUpdatesProps {
  items: MangaCapitulo[];
  isLight: boolean;
  titleAccent?: string;
  sectionId?: string;
  accent?: 'pink' | 'blue';

  rowTone?: 'accent' | 'neutral';

  includeUpcoming?: boolean;
  loading?: boolean;
}

const ITEMS_PER_PAGE = 9;
const TYPE_TAB_POSITION: Record<MangaTypeTab, string> = {
  Manga: 'left-0',
  Manhua: 'left-[78px]',
  Manhwa: 'left-[165px]',
};

const cleanTitle = (value = '') => value
  .replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '')
  .trim();

const parseDate = (value = '') => {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return value && !Number.isNaN(date.getTime()) ? date : null;
};

const relativeDate = (value = '') => {
  const date = parseDate(value);
  if (!date) return '';

  const elapsed = Math.max(0, Date.now() - date.getTime());
  const hours = Math.max(1, Math.floor(elapsed / 3_600_000));
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;

  const months = Math.floor(days / 30);
  if (days < 365) return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;

  const years = Math.floor(days / 365);
  return `hace ${years} ${years === 1 ? 'año' : 'años'}`;
};

const isPublishedChapter = (chapter: { id: number | string; numero: string }) =>
  Number(chapter.numero) > 0 && Number(chapter.id) > 0;

const hasPublishedChapters = (manga: MangaCapitulo) => manga.capitulosRecientes.some(isPublishedChapter);

const seriesDateOf = (manga: MangaCapitulo) => manga.rawFecha || manga.publishedAt || '';

const latestDateOf = (manga: MangaCapitulo) =>
  manga.capitulosRecientes[0]?.fecha || seriesDateOf(manga);

export function AdultLatestUpdates({
  items,
  isLight,
  sectionId = 'adult-latest-updates',
  accent = 'pink',
  rowTone = 'accent',
  includeUpcoming = false,
  loading = false,
}: AdultLatestUpdatesProps) {
  const [tab, setTab] = useState<MangaTypeTab>('Manga');
  const [currentPage, setCurrentPage] = useState(1);
  const { openChapter, chapterAccessModal } = useChapterAccess();

  const [visibleChapters, setVisibleChapters] = useState(5);

  const [seriesChapters, setSeriesChapters] = useState<Record<string, SeriesChapter[]>>({});
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => new Set());

  const requestedSeries = useRef<Set<string>>(new Set());

  const uiAccent: Accent = accent === 'blue' ? 'cyan' : 'pink';
  const accentColor = ACCENT_COLOR[uiAccent];

  useEffect(() => {
    if (!getStoredToken()) return;
    let active = true;
    void getUnlockedChapters()
      .then((ids) => { if (active) setUnlockedIds(ids); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 640px)');
    const sync = () => setVisibleChapters(wide.matches ? 5 : 4);
    sync();
    wide.addEventListener('change', sync);
    return () => wide.removeEventListener('change', sync);
  }, []);

  const allLatestItems = useMemo(() => [...items]
    .filter((manga) => includeUpcoming || hasPublishedChapters(manga))
    .sort((first, second) => {
      const firstDate = parseDate(latestDateOf(first))?.getTime() ?? 0;
      const secondDate = parseDate(latestDateOf(second))?.getTime() ?? 0;
      return secondDate - firstDate;
    }), [items, includeUpcoming]);

  const availableTabs = useMemo(
    () => TYPE_TABS.filter((option) => allLatestItems.some((manga) => matchesTypeTab(manga.tipo, option))),
    [allLatestItems],
  );
  const activeTab = availableTabs.includes(tab) ? tab : (availableTabs[0] ?? 'Manga');
  const latestItems = useMemo(
    () => allLatestItems.filter((manga) => matchesTypeTab(manga.tipo, activeTab)),
    [allLatestItems, activeTab],
  );

  const totalPages = Math.max(1, Math.ceil(latestItems.length / ITEMS_PER_PAGE));
  const visiblePage = tab === activeTab ? Math.min(currentPage, totalPages) : 1;
  const pageItems = latestItems.slice((visiblePage - 1) * ITEMS_PER_PAGE, visiblePage * ITEMS_PER_PAGE);

  const accentClasses = accent === 'blue' ? {
    border: 'border-[#00C2FF]',
    text: 'text-[#00C2FF]',
    background: 'bg-[#00C2FF]',
    hoverBorder: 'hover:border-[#00C2FF]',
  } : {
    border: 'border-[#FF008C]',
    text: 'text-[#FF008C]',
    background: 'bg-[#FF008C]',
    hoverBorder: 'hover:border-[#FF008C]',
  };

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (tab === activeTab) return;
    setTab(activeTab);
    setCurrentPage(1);
  }, [tab, activeTab]);

  const selectTab = (nextTab: MangaTypeTab) => {
    if (nextTab !== 'Manga' && !availableTabs.includes(nextTab)) return;
    setTab(nextTab);
    setCurrentPage(1);
  };

  const visibleSeriesIds = pageItems
    .filter((manga) => includeUpcoming || hasPublishedChapters(manga))
    .map((manga) => String(manga.eroSeri || manga.id));
  const visibleSeriesKey = visibleSeriesIds.join(',');

  useEffect(() => {
    const ids = visibleSeriesKey ? visibleSeriesKey.split(',') : [];
    if (ids.length === 0) return;

    const alreadyRequested = requestedSeries.current;
    const missing = ids.filter((id) => !alreadyRequested.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => alreadyRequested.add(id));

    let active = true;
    let started = false;
    const cancelIdle = whenIdle(() => {
      started = true;
      void Promise.all(missing.map(async (id) => [id, await getChaptersBySeries(id).catch(() => [])] as const))
        .then((entries) => {
          if (active) setSeriesChapters((previous) => ({ ...previous, ...Object.fromEntries(entries) }));
        });
    });

    return () => {
      active = false;
      cancelIdle();
      if (!started) missing.forEach((id) => alreadyRequested.delete(id));
    };
  }, [visibleSeriesKey]);

  return (
    <section id={sectionId} aria-busy={loading} className={`relative w-full scroll-mt-24 py-8 sm:py-10 bg-surface`}>
      <div className="home-latest-container mx-auto w-full max-w-[1440px] px-3">

        <div className="home-latest-heading relative h-[95px] lg:h-[121px]">
          <span aria-hidden="true" className="absolute left-[23px] top-0 flex lg:left-[6px] lg:h-11 lg:w-12 lg:items-center lg:justify-center" style={{ color: accentColor }}>
            <HomeRecentIcon className="home-recent-icon size-[57px]" />
          </span>
          <h2 className="absolute left-[68px] top-px whitespace-pre font-dela text-xl font-normal leading-8 text-ink lg:left-[67px] lg:top-[7px] lg:text-[28px] lg:leading-[30px]">
            {'Lo Más  '}<span style={{ color: accentColor }}>Reciente</span>
          </h2>
          <button
            type="button"
            onClick={() => openSearchPanel('hot')}
            className="absolute right-0 top-[14px] hidden h-[39px] w-[122px] items-center rounded-lg border border-[rgba(147,147,147,0.4)] bg-panel pl-[17.5px] font-montserrat text-sm font-medium text-ink shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-colors hover:border-ink lg:flex"
          >
            <ViewAllIcon size={21} className="shrink-0" />
            <span className="ml-[4.5px]">Ver todo</span>
          </button>
          <div role="tablist" aria-label="Tipo de obra" className="absolute left-[70px] top-[44px] lg:left-[71px] lg:top-[52px]">
            {TYPE_TABS.map((option) => {
              const active = option === activeTab;
              const disabled = loading || (option !== 'Manga' && !availableTabs.includes(option));
              return (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={disabled}
                  onClick={() => selectTab(option)}
                  className={`absolute top-0 whitespace-nowrap pb-[7px] font-montserrat text-sm font-medium leading-[17px] text-ink disabled:cursor-not-allowed disabled:opacity-40 ${TYPE_TAB_POSITION[option]}`}
                >
                  {option}
                  {active && <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-0.5 w-14 -translate-x-1/2" style={{ backgroundColor: accentColor }} />}
                </button>
              );
            })}
          </div>
        </div>

        {loading && pageItems.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Cargando mangas recientes">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} aria-hidden="true" className={`flex min-h-[250px] animate-pulse overflow-hidden rounded-[12px] border sm:min-h-[285px] ${isLight ? 'border-black/15 bg-white' : 'border-white/15 bg-black'}`}>
                <div className="w-[43%] shrink-0 bg-ink/10 sm:w-[45%]" />
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div className="h-5 w-4/5 rounded bg-ink/10" />
                  <div className="space-y-3">
                    <div className="h-3 w-full rounded bg-ink/10" />
                    <div className="h-3 w-5/6 rounded bg-ink/10" />
                    <div className="h-3 w-3/4 rounded bg-ink/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pageItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((manga) => {
              const fullList = seriesChapters[String(manga.eroSeri || manga.id)];
              const chapters = (fullList && fullList.length > 0
                ? [...fullList]
                    .sort((first, second) => second.chapter_number - first.chapter_number)
                    .map((chapter) => ({
                      id: chapter.id,
                      numero: String(chapter.chapter_number),
                      esGratis: !chapter.is_paid,
                      fecha: chapter.created_at,
                    }))
                : manga.capitulosRecientes)
                .filter(isPublishedChapter)
                .slice(0, visibleChapters);
              return (
                <article key={manga.id} className={`collection-latest-card group flex min-h-[250px] overflow-hidden rounded-[12px] border transition-transform duration-300 hover:-translate-y-1 sm:min-h-[285px] ${isLight ? 'border-black/25 bg-white text-slate-950' : 'border-white/20 bg-black text-white'}`}>
                  <Link to={`/manga/${manga.id}`} className="collection-latest-cover relative w-[43%] shrink-0 overflow-hidden sm:w-[45%]">
                    <img src={manga.portada} alt={`Portada del manga ${cleanTitle(manga.titulo)}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.09]" />
                    <span className={`absolute bottom-3 left-3 z-10 grid h-8 w-8 place-items-center rounded-full text-white ${accentClasses.background}`}>
                      <Flame size={16} fill="currentColor" />
                    </span>
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
                    <Link to={`/manga/${manga.id}`} className="mb-3">
                      <h3 className="line-clamp-3 text-[17px] font-black leading-[1.15] sm:text-[20px]">
                        {cleanTitle(manga.titulo)}
                      </h3>
                    </Link>

                    <div className="divide-y divide-current/20 border-y border-current/25">
                      {chapters.length === 0 && (
                        <Link
                          to={`/manga/${manga.id}`}
                          className={`-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[4px] px-2 py-2.5 font-[Montserrat] font-normal transition-colors ${
                            isLight ? 'text-black/45 hover:bg-black/[0.06]' : 'text-white/45 hover:bg-white/[0.07]'
                          }`}
                        >
                          <span className="truncate text-[13px] sm:text-[14px]">Capítulo -</span>
                          <time className="shrink-0 whitespace-nowrap text-[11px] sm:text-[12px]">
                            {relativeDate(seriesDateOf(manga))}
                          </time>
                        </Link>
                      )}
                      {chapters.map((chapter, index) => {
                        const isNew = isRecentChapter(chapter.fecha);
                        return (
                          <Link
                            key={chapter.id}
                            to={`/read/${chapter.id}`}
                            onClick={(event) => {
                              if (chapter.esGratis) {
                                return;
                              }
                              event.preventDefault();
                              void openChapter({
                                chapterId: chapter.id,
                                seriesId: manga.eroSeri || manga.id,
                                isFree: chapter.esGratis,
                                chapterNumber: chapter.numero,
                              });
                            }}
                            className={`-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[4px] px-2 py-2.5 font-[Montserrat] font-normal transition-colors ${isLight ? 'hover:bg-black/[0.06]' : 'hover:bg-white/[0.07]'} ${
                              rowTone === 'neutral'
                                ? (isLight ? 'text-black' : 'text-white')
                                : index === 0
                                  ? `font-bold ${accentClasses.text}`
                                  : isLight ? 'text-black/45' : 'text-white/45'
                            }`}
                          >
                            <span className={`flex min-w-0 items-center gap-1.5 ${chapter.esGratis ? '' : isLight ? 'text-[#B8860B]' : 'text-[#F0B429]'}`}>
                              <span className="truncate text-[13px] sm:text-[14px]">Capítulo {chapter.numero}</span>
                              {!chapter.esGratis && (unlockedIds.has(String(chapter.id))
                                ? <LockKeyholeOpen className="h-3.5 w-3.5 shrink-0" />
                                : <LockKeyhole className="h-3.5 w-3.5 shrink-0" />)}
                            </span>
                            <time
                              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] sm:text-[12px]"
                              style={{ color: isNew && chapter.esGratis ? accentColor : undefined }}
                            >
                              {isNew ? (
                                <>
                                  <span>Nuevo</span>
                                  <HomeNewIcon className="home-new-flame size-4" />
                                </>
                              ) : (
                                relativeDate(chapter.fecha)
                              )}
                            </time>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-ink/[.07] bg-ink/[.04] px-5 py-16 text-center">
            <p className="font-montserrat text-base font-bold text-ink">Próximamente 🤓</p>
          </div>
        )}

        {chapterAccessModal}
        <HomePagination
          currentPage={visiblePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          scrollTargetId={sectionId}
        />
      </div>
    </section>
  );
}
