import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { useHomeData } from '../../../context/HomeDataContext';
import { getPopularMenByViews, getPopularWomenByViews } from '../../../services/mangaService';
import type { MangaCapitulo } from '../../../types/manga';
import { filterYouthMen } from '../../../utils/youthFilter';
import { CoinStackIcon, CrownIcon, TrendingFlameIcon } from './icons';
import { ACCENT_HEX, cleanTitle, timeAgoEs, typeBadgeColor, uniqueBySeries, type MobileAccent } from './shared';
import { useFitScale } from './useFitScale';
import { useInfiniteMarquee } from './useInfiniteMarquee';

type Period = 'Semanal' | 'Mensual' | 'Histórico';
const PERIODS: Period[] = ['Semanal', 'Mensual', 'Histórico'];
const RANKING_SIZE = 9;
/** Velocidad de crucero de la cinta (px/s) y sentido en el que viajan las portadas. */
const MARQUEE_SPEED = 40;
const MARQUEE_DIRECTION = 'left';
const CARD_GAP = 13;
const LEADING_INSET = 28;

interface RankedManga {
  id: number | string;
  title: string;
  coverImage: string;
  chapter: string;
  isFree: boolean;
  date: string;
  type: string;
}

const toRanked = (mangas: MangaCapitulo[]): RankedManga[] =>
  mangas.map((manga) => {
    // capitulosRecientes[0] = capítulo más leído (rankings) o el último (biblioteca).
    const chapter = manga.capitulosRecientes?.[0];
    return {
      id: manga.id,
      title: cleanTitle(manga.titulo),
      coverImage: manga.portada,
      chapter: chapter?.numero && chapter.numero !== '-' ? chapter.numero : '—',
      isFree: chapter ? chapter.esGratis : true,
      date: timeAgoEs(chapter?.fecha || manga.rawFecha || manga.fecha),
      type: manga.tipo || 'Manga',
    };
  });

const RANK_COLORS: Record<number, string> = { 1: '#f59e0b', 2: 'var(--mh-rank-silver)', 3: '#f97316' };

/** Pie de la tarjeta: capítulo · gratis/pago · fecha. Si no cabe, se encoge en bloque. */
const RankedMeta = ({ manga }: { manga: RankedManga }) => {
  const { outerRef, innerRef } = useFitScale<HTMLDivElement, HTMLDivElement>();
  return (
    <div ref={outerRef} className="flex h-9 items-center justify-center overflow-hidden rounded-b-lg mh-panel px-2.5 mh-text">
      <div ref={innerRef} className="mh-meta-grid">
        <span className="mh-font-anta shrink-0 whitespace-nowrap text-xs">Cap {manga.chapter}</span>
        <span aria-hidden="true" className="mh-meta-divider" />
        <span className="mh-font-audiowide flex shrink-0 items-center gap-[3px] whitespace-nowrap text-[9px]">
          {manga.isFree
            ? <span aria-hidden="true" className="mh-free-dot h-1.5 w-1.5 rounded-full" />
            : <CoinStackIcon size={15} />}
          {manga.isFree ? 'GRATIS' : 'PAGO'}
        </span>
        <span aria-hidden="true" className="mh-meta-divider" />
        <span className="mh-font-anta shrink-0 whitespace-nowrap text-xs">{manga.date}</span>
      </div>
    </div>
  );
};

interface MobileTrendingProps {
  audience: 'women' | 'men';
  accent: MobileAccent;
}

/**
 * "Tendencia Ahora": pestañas Semanal / Mensual / Histórico y una cinta
 * infinita de hasta nueve portadas numeradas (dos a la vista) que avanza sola y
 * se puede arrastrar con el dedo; cada tarjeta lleva capítulo, precio y fecha.
 */
export const MobileTrending = ({ audience, accent }: MobileTrendingProps) => {
  const { popularWeekly, popularMenWeekly, popularHistorical, popularMenHistorical, latestWomen, latestMen, isReady } = useHomeData();
  const prefersReducedMotion = useReducedMotion();
  const [period, setPeriod] = useState<Period>('Semanal');
  const [items, setItems] = useState<RankedManga[]>([]);
  const [loading, setLoading] = useState(false);
  const accentHex = ACCENT_HEX[accent];
  const isMen = audience === 'men';
  const { viewportRef, trackRef, sequenceRef, copies, viewportProps } = useInfiniteMarquee({
    itemCount: items.length,
    speed: prefersReducedMotion ? 0 : MARQUEE_SPEED,
    direction: MARQUEE_DIRECTION,
    leadingInset: LEADING_INSET,
  });

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const narrow = (list: MangaCapitulo[]) => (isMen ? filterYouthMen(list) : list);
    const weekly = narrow(isMen ? popularMenWeekly : popularWeekly);
    const historical = narrow(isMen ? popularMenHistorical : popularHistorical);
    const latest = narrow(isMen ? latestMen : latestWomen);

    const load = async () => {
      let primary: MangaCapitulo[] = period === 'Semanal' ? weekly : period === 'Histórico' ? historical : [];
      if (primary.length === 0) {
        setLoading(true);
        const fetchPopular = isMen ? getPopularMenByViews : getPopularWomenByViews;
        const remotePeriod = period === 'Semanal' ? 'weekly' : period === 'Mensual' ? 'monthly' : 'historical';
        primary = narrow(await fetchPopular(remotePeriod, false).catch(() => []));
      }
      if (cancelled) return;
      // El ranking se completa con el histórico y las últimas actualizaciones
      // para que siempre haya portadas aunque la semana venga corta.
      setItems(toRanked(uniqueBySeries([primary, historical, latest], RANKING_SIZE)));
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [isReady, isMen, period, popularWeekly, popularMenWeekly, popularHistorical, popularMenHistorical, latestWomen, latestMen]);

  return (
    <section className="mh-trending pt-[45px]" aria-busy={loading}>
      {/* Cabecera */}
      <div className="flex items-center gap-[5px] pl-[21px]">
        <span className="grid h-9 w-9 place-items-center" style={{ color: accentHex }}>
          <TrendingFlameIcon size={36} />
        </span>
        <h2 className="mh-font-dela text-xl leading-8 mh-text">
          Tendencia <span style={{ color: accentHex }}>Ahora</span>
        </h2>
      </div>

      {/* Periodo */}
      <div role="tablist" aria-label="Periodo del ranking" className="mx-auto mt-[18px] flex h-11 w-80 max-w-[calc(100%-2rem)] items-center rounded-3xl border mh-period-tabs p-[1px]">
        {PERIODS.map((option) => {
          const active = option === period;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPeriod(option)}
              className={`mh-font-montserrat h-10 flex-1 rounded-3xl text-xs uppercase leading-3 transition-colors ${active ? 'mh-selected font-black' : 'font-bold mh-text'}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Cinta de portadas: la secuencia se repite para que el bucle no se note. */}
      <div
        ref={viewportRef}
        {...viewportProps}
        className="mt-[37px] cursor-grab touch-pan-y select-none overflow-hidden pb-1 active:cursor-grabbing"
        aria-label="Ranking en movimiento continuo; arrastra para recorrerlo"
      >
        {items.length > 0 ? (
          <div ref={trackRef} className="flex w-max will-change-transform">
            {Array.from({ length: copies }, (_, copy) => (
              <div
                key={copy}
                ref={copy === 0 ? sequenceRef : undefined}
                className="flex"
                style={{ gap: CARD_GAP, paddingRight: CARD_GAP }}
                aria-hidden={copy > 0 ? true : undefined}
              >
                {items.map((manga, index) => {
                  const rank = index + 1;
                  const rankColor = RANK_COLORS[rank] ?? 'var(--mh-ink)';
                  return (
                    <Link
                      key={String(manga.id)}
                      to={`/manga/${manga.id}`}
                      draggable={false}
                      tabIndex={copy > 0 ? -1 : undefined}
                      className="block w-[185px] shrink-0"
                      aria-label={`${rank}. ${manga.title}`}
                    >
                      <div className="relative h-[288px] overflow-hidden rounded-t-xl mh-cover-base">
                        <img src={manga.coverImage} alt={`Portada del manga ${manga.title}`} draggable={false} loading={copy === 0 && index < 2 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
                        {rank === 1 && (
                          <span className="absolute right-[3px] top-[6px] grid h-6 w-6 place-items-center rounded-[5px] bg-amber-400 mh-text" aria-hidden="true">
                            <CrownIcon size={12} />
                          </span>
                        )}
                        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[130px] mh-card-scrim" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end">
                          <span className="mh-rank-number -mb-[7px] -ml-[14px] shrink-0 text-[84px]" style={{ color: rankColor }} aria-hidden="true">
                            {rank}
                          </span>
                          <div className="mb-2 min-w-0 flex-1 pl-[22px] pr-2">
                            <span className="mh-font-montserrat inline-flex h-2.5 items-center rounded-[3px] px-1.5 text-[7px] font-black uppercase leading-none text-white" style={{ backgroundColor: typeBadgeColor(manga.type, accent) }}>
                              {manga.type}
                            </span>
                            <h3 className="mh-font-montserrat mh-line-clamp-2 mt-1 text-[10px] font-black uppercase leading-3 mh-text">
                              {manga.title}
                            </h3>
                          </div>
                        </div>
                      </div>

                      <RankedMeta manga={manga} />
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <p className="mh-font-montserrat w-full py-16 text-center text-xs font-bold uppercase tracking-wider mh-muted">
              No hay resultados en este periodo
            </p>
          )
        )}
      </div>
    </section>
  );
};
