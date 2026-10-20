import { useReducedMotion } from 'framer-motion';
import { GooeySelector } from '../ui/GooeySelector';
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { HomeChaptersIcon, HomeCrownIcon, HomeTrendingIcon, HomeViewsIcon } from '../../components/home/HomeIcons';
import { ACCENT_COLOR, TypeBadge, type Accent } from '../../components/ui';
import { useInfiniteMarquee } from '../../hooks/useInfiniteMarquee';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import { RANKING_PERIODS, useTrendingRanking, type RankedManga, type RankingPeriod } from '../../hooks/useTrendingRanking';
import { formatHomeViews } from '../../utils/mangaFormat';
import { toTitleCase } from '../../utils/titleCase';
import { formatChapterCount } from '../../utils/trendingRanking';

import type { MangaCapitulo } from '../../types/manga';
import { type Audience } from './homeModels';

const TRENDING_SIZE = 9;

const TRENDING_CARD = {
  desktop: { width: 230, gap: 17, inset: 38 },
  mobile: { width: 198, gap: 13, inset: 17 },
} as const;

const TRENDING_SPEED = 52;

const PERIOD_WIDTHS: Record<RankingPeriod, number> = { Semanal: 124, Mensual: 117, Histórico: 110 };

interface TrendingCardProps {
  manga: RankedManga;
  rank: number;
  accent: Accent;

  isCopy: boolean;
  isMobile: boolean;
}

const TrendingCard = ({ manga, rank, accent, isCopy, isMobile }: TrendingCardProps) => {
  const accentColor = ACCENT_COLOR[accent];
  const title = toTitleCase(manga.title);
  const card = TRENDING_CARD[isMobile ? 'mobile' : 'desktop'];
  const rankColor = ({ 1: '#fb923c', 2: '#a21caf', 3: '#ef4444' } as Record<number, string>)[rank] ?? '#000';
  const views = formatHomeViews(manga.views);
  const chapters = formatChapterCount(manga.chapterCount);
  return (
    <Link to={`/manga/${manga.id}`} draggable={false} tabIndex={isCopy ? -1 : undefined}
      aria-label={`${rank}. ${title}: ${chapters}, ${views} vistas`}
      className="home-ranking-card" style={{ width: card.width, marginRight: card.gap }}>
      <div className="home-ranking-surface">
        <div className="home-ranking-cover">
          <img src={manga.coverImage} alt={`Portada del manga ${title}`} loading={!isCopy && rank <= 5 ? "eager" : "lazy"} decoding="async" draggable={false} />
          {rank === 1 && <span aria-hidden="true" className="home-ranking-crown"><HomeCrownIcon /></span>}
          <span aria-hidden="true" className="home-ranking-number" style={{ color: rankColor }}>{rank}</span>
        </div>
        <div className="home-ranking-caption">
          <h3 title={title}>{title}</h3>
          <div className="home-ranking-meta">
            <span className="home-ranking-chapter"><HomeChaptersIcon style={{ color: accentColor }} /><span>{chapters}</span></span>
            <span className="home-ranking-views" title={`${manga.views} vistas`}><HomeViewsIcon />{views}</span>
            <TypeBadge type={manga.type} accent={accent} className="home-ranking-type" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const PeriodTabs = ({ value, onChange, className, selectorColor }: { selectorColor?: string; value: RankingPeriod; onChange: (period: RankingPeriod) => void; className: string }) => (
  <div role="tablist" aria-label="Periodo del ranking" className={`flex h-11 shrink-0 rounded-3xl border border-[#878383] dark:border-[color:var(--mm-tab-line)] dark:bg-black lg:h-12 lg:shadow-[0_4px_4px_rgba(0,0,0,1)] ${className}`}>
    <GooeySelector activeIndex={RANKING_PERIODS.indexOf(value)} color={selectorColor} />
    {RANKING_PERIODS.map((option) => {
      const active = option === value;
      return (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(option)}
          className={`relative z-[1] h-full flex-1 rounded-3xl font-montserrat text-xs uppercase leading-3 lg:-my-px lg:h-12 lg:w-[var(--tab-width)] lg:flex-none lg:first-of-type:-ml-px lg:last:-mr-px ${active ? `font-black ${selectorColor ? 'text-white' : 'text-surface'}` : 'font-bold text-black dark:text-white'}`}
          style={{ '--tab-width': `${PERIOD_WIDTHS[option]}px` } as CSSProperties}
        >
          {option}
        </button>
      );
    })}
  </div>
);

export const TrendingSection = ({
  audience,
  className = '',
  filterMangas,
  selectorColor,
}: {
  audience: Audience;
  className?: string;
  selectorColor?: string;
  filterMangas?: (items: MangaCapitulo[]) => MangaCapitulo[];
}) => {
  const accent: Accent = audience === 'men' ? 'cyan' : 'pink';
  const accentColor = ACCENT_COLOR[accent];
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobileViewport();
  const [period, setPeriod] = useState<RankingPeriod>('Semanal');
  const { items, loading } = useTrendingRanking({
    audience,
    period,
    size: TRENDING_SIZE,
    youthOnly: !filterMangas && audience === 'men',
    filterMangas,
    preloadCount: 5,
  });
  const { viewportRef, trackRef, sequenceRef, copies, viewportProps } = useInfiniteMarquee({
    itemCount: items.length,
    speed: prefersReducedMotion ? 0 : TRENDING_SPEED,
    direction: 'left',
    leadingInset: TRENDING_CARD[isMobile ? 'mobile' : 'desktop'].inset,
    pauseOnHover: !isMobile,
  });

  return (
    <section id={!filterMangas ? (audience === 'men' ? 'mangas-juveniles' : 'tendencia-ahora') : undefined} className={`relative w-full ${className}`} aria-busy={loading}>
      <div className="relative mx-auto w-full max-w-[1440px]">

        <div className="home-trending-heading relative h-[111px] lg:h-[103px]">
          <div className="absolute left-[43px] top-0 flex items-start lg:left-[62px]">
            <span aria-hidden="true" className="flex shrink-0" style={{ color: accentColor }}>
              <HomeTrendingIcon className="home-trending-icon h-[69px] w-[71px]" />
            </span>
            <h2 className="mt-[14px] whitespace-pre font-dela text-xl font-normal leading-8 text-ink lg:mt-[22px] lg:text-[30px] lg:leading-8">
              {'Tendencia  '}<span style={{ color: accentColor }}>Ahora</span>
            </h2>
          </div>
          <PeriodTabs selectorColor={selectorColor} value={period} onChange={setPeriod} className="absolute left-[43px] right-[43px] top-[67px] lg:left-auto lg:right-[95px] lg:top-[14px]" />
        </div>

        <div className="home-trending-cards relative mt-[29px] min-h-[328px] lg:mt-0 lg:min-h-[339px]">
          {items.length > 0 ? (
            <div
              ref={viewportRef}
              {...viewportProps}
              className="home-trending-viewport cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
              aria-label="Ranking en movimiento continuo; arrastra para recorrerlo"
            >
              <div ref={trackRef} className="flex w-max will-change-transform">
                {Array.from({ length: copies }, (_, copy) => (
                  <div key={copy} ref={copy === 0 ? sequenceRef : undefined} className="flex flex-none" aria-hidden={copy > 0 ? true : undefined}>
                    {items.map((manga, index) => (
                      <TrendingCard key={`${copy}-${manga.id}`} manga={manga} rank={index + 1} accent={accent} isCopy={copy > 0} isMobile={isMobile} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div role="status" aria-label="Cargando tendencias" className="home-trending-skeleton overflow-hidden">
              <span className="sr-only">Cargando tendencias…</span>
              <div className="flex w-max" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="home-ranking-card" style={{ width: TRENDING_CARD[isMobile ? "mobile" : "desktop"].width, marginRight: TRENDING_CARD[isMobile ? "mobile" : "desktop"].gap }}>
                    <div className="home-ranking-cover animate-pulse motion-reduce:animate-none" />
                    <div className="home-ranking-caption"><span className="mx-auto mt-1 h-3 w-4/5 rounded bg-ink/10" /><span className="h-3 w-2/3 rounded bg-ink/10" /></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !loading && (
              <p className="flex h-[328px] items-center justify-center font-montserrat text-xs font-bold uppercase tracking-wider text-muted lg:h-[339px]">
                No hay resultados en este periodo
              </p>
            )
          )}


          <div aria-hidden="true" className="home-trending-edge home-trending-edge-left" />
          <div aria-hidden="true" className="home-trending-edge home-trending-edge-right" />
        </div>
      </div>
    </section>
  );
};

