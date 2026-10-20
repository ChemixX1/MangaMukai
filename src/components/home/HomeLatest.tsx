import { openSearchPanel } from '../../hooks/useSearchTerm';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';

import { HomeChapterIcon, HomeClockIcon, HomeCoinsIcon, HomeNewIcon, HomeRecentIcon } from '../../components/home/HomeIcons';
import { HomePagination } from '../../components/home/HomePagination';
import { ACCENT_COLOR, ViewAllIcon, type Accent } from '../../components/ui';
import { useHomeData } from '../../context/HomeDataContext';
import { useChapterAccess } from '../../hooks/useChapterAccess';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import { isPublishedChapter, matchesTypeTab, TYPE_TABS, type MangaTypeTab } from '../../utils/mangaFormat';
import { filterYouthMen } from '../../utils/youthFilter';

import { toLatestMangas, type Audience, type LatestChapter, type LatestManga } from './homeModels';

const LATEST_PER_PAGE = 18;
const MOBILE_LATEST_PER_PAGE = 6;

const TYPE_TAB_POSITION: Record<MangaTypeTab, string> = { Manga: 'left-0', Manhua: 'left-[78px]', Manhwa: 'left-[165px]' };

interface ChapterRowProps {
  manga: LatestManga;
  chapter: LatestChapter | undefined;
  accentColor: string;
  onOpenPaid: (manga: LatestManga, chapter: LatestChapter) => void;
  className: string;
}

const ChapterRow = ({ manga, chapter, accentColor, onOpenPaid, className }: ChapterRowProps) => {
  const rowClass = `absolute inset-x-0 flex items-center transition-colors hover:bg-ink/[.06] ${className}`;
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
      aria-label={`${manga.title}: capítulo ${chapter.numero}, ${chapter.isFree ? 'gratis' : 'de pago'}, ${chapter.isNew ? 'nuevo' : chapter.date}`}
    >
      <span className="home-chapter-meta" style={{ color: chapter.isFree ? undefined : '#ffa43d' }}>
        <span className="home-chapter-number">{chapter.isFree ? <HomeChapterIcon /> : <HomeCoinsIcon />}<span>Capítulo {chapter.numero}</span></span>
        <span className="home-chapter-date" style={{ color: chapter.isNew && chapter.isFree ? accentColor : undefined }}>
          {chapter.isNew ? <>Nuevo<HomeNewIcon className="home-new-flame" /></> : <>{chapter.date}<HomeClockIcon /></>}
        </span>
      </span>
    </Link>
  );
};

interface LatestCardProps {
  manga: LatestManga;
  accent: Accent;

  eager: boolean;
  onOpenPaid: (manga: LatestManga, chapter: LatestChapter) => void;
}

const LatestCard = ({ manga, accent, eager, onOpenPaid }: LatestCardProps) => {
  const accentColor = ACCENT_COLOR[accent];
  return (
    <article className="home-latest-card flex flex-col">
      <Link to={`/manga/${manga.id}`} className="group relative block aspect-[218/329] overflow-hidden rounded-t-xl bg-media">
        <img src={manga.coverImage} alt={`Portada del manga ${manga.title}`} loading={eager ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-x-0 top-[67.17%] h-[27.36%] bg-gradient-to-b from-panel/0 from-[22.22%] to-panel to-[56.67%]" />
        <h3 className="absolute inset-x-3 bottom-[28px] line-clamp-2 text-center font-montserrat text-xs font-semibold leading-4 text-ink lg:bottom-[31.5px]">
          {manga.title}
        </h3>
      </Link>
      <div className="home-latest-chapters relative overflow-hidden rounded-b-lg bg-panel">
        <ChapterRow manga={manga} chapter={manga.chapters[0]} accentColor={accentColor} onOpenPaid={onOpenPaid} className="home-chapter-first top-0" />
        <span aria-hidden="true" className="home-chapter-separator absolute bg-ink/20" />
        <ChapterRow manga={manga} chapter={manga.chapters[1]} accentColor={accentColor} onOpenPaid={onOpenPaid} className="home-chapter-second bottom-0" />
      </div>
    </article>
  );
};

export const LatestSection = ({ audience, className }: { audience: Audience; className: string }) => {
  const { latestWomen, latestMen, loaded } = useHomeData();
  const isReady = audience === 'men' ? loaded.latestMen : loaded.latestWomen;
  const { openChapter, chapterAccessModal } = useChapterAccess();
  const isMobile = useIsMobileViewport();
  const [tab, setTab] = useState<MangaTypeTab>('Manga');
  const [currentPage, setCurrentPage] = useState(1);
  const accent: Accent = audience === 'men' ? 'cyan' : 'pink';
  const accentColor = ACCENT_COLOR[accent];
  const gridId = `latest-${audience}`;

  const allItems = useMemo(
    () => toLatestMangas(audience === 'men' ? filterYouthMen(latestMen) : latestWomen),
    [audience, latestMen, latestWomen],
  );
  const availableTabs = useMemo(
    () => TYPE_TABS.filter((option) => allItems.some((manga) => matchesTypeTab(manga.type, option))),
    [allItems],
  );
  const activeTab = availableTabs.includes(tab) ? tab : (availableTabs[0] ?? 'Manga');
  const items = useMemo(() => allItems.filter((manga) => matchesTypeTab(manga.type, activeTab)), [allItems, activeTab]);
  const perPage = isMobile ? MOBILE_LATEST_PER_PAGE : LATEST_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const visiblePage = tab === activeTab ? Math.min(currentPage, totalPages) : 1;
  const pageItems = items.slice((visiblePage - 1) * perPage, visiblePage * perPage);

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

  const openPaid = (manga: LatestManga, chapter: LatestChapter) => {
    void openChapter({ chapterId: chapter.id, seriesId: manga.seriesId, isFree: chapter.isFree, chapterNumber: chapter.numero });
  };

  return (
    <section id={gridId} aria-busy={!isReady} className={`relative w-full scroll-mt-24 ${className}`}>
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
            onClick={() => openSearchPanel()}
            className="absolute right-0 top-[14px] hidden h-[39px] w-[122px] items-center rounded-lg border border-[rgba(147,147,147,0.4)] bg-panel pl-[17.5px] font-montserrat text-sm font-medium text-ink shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-colors hover:border-ink lg:flex"
          >
            <ViewAllIcon size={21} className="shrink-0" />
            <span className="ml-[4.5px]">Ver todo</span>
          </button>
          <div role="tablist" aria-label="Tipo de obra" className="absolute left-[70px] top-[44px] lg:left-[71px] lg:top-[52px]">
            {TYPE_TABS.map((option) => {
              const active = option === activeTab;
              const disabled = !isReady || (option !== 'Manga' && !availableTabs.includes(option));
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

        {!isReady ? (
          <div className="home-latest-grid grid grid-cols-2 gap-x-[11px] gap-y-3 lg:grid-cols-6 lg:gap-y-5" role="status" aria-label="Cargando mangas recientes">
            {Array.from({ length: perPage }, (_, index) => (
              <div key={index} aria-hidden="true" className="home-latest-card flex animate-pulse flex-col motion-reduce:animate-none">
                <div className="home-latest-skeleton-cover rounded-t-xl bg-ink/10" />
                <div className="home-latest-chapters flex flex-col justify-around rounded-b-lg bg-panel px-3 py-2">
                  <div className="h-2 w-3/4 rounded bg-ink/10" />
                  <div className="h-2 w-1/2 rounded bg-ink/10" />
                </div>
              </div>
            ))}
          </div>
        ) : pageItems.length > 0 ? (
          <div className="home-latest-grid grid grid-cols-2 gap-x-[11px] gap-y-3 lg:grid-cols-6 lg:gap-y-5">
            {pageItems.map((manga, index) => (
              <LatestCard key={`${visiblePage}-${manga.id}`} manga={manga} accent={accent} eager={index < 6} onOpenPaid={openPaid} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-ink/[.07] bg-ink/[.04] px-5 py-16 text-center">
            <p className="font-montserrat text-base font-bold text-ink">Próximamente 🤓</p>
          </div>
        )}

        {chapterAccessModal}

        {isReady ? <HomePagination currentPage={visiblePage} totalPages={totalPages} onPageChange={setCurrentPage} scrollTargetId={gridId} /> : <div aria-hidden="true" className="home-pagination animate-pulse motion-reduce:animate-none" />}
      </div>
    </section>
  );
};

