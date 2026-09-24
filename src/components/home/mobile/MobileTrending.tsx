import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { useHomeData } from '../../../context/HomeDataContext';
import { getPopularMenByViews, getPopularWomenByViews } from '../../../services/mangaService';
import type { MangaCapitulo } from '../../../types/manga';
import { useInfiniteMarquee } from '../../../hooks/useInfiniteMarquee';
import { cleanTitle, timeAgoEs, uniqueBySeries } from '../../../utils/mangaFormat';
import { filterYouthMen } from '../../../utils/youthFilter';
import { ACCENT_HEX, ChapterMeta, CrownIcon, PillTabs, RankNumber, TrendingFlameIcon, TypeBadge, type Accent } from '../../ui';

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

interface MobileTrendingProps {
  audience: 'women' | 'men';
  accent: Accent;
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
    <section className="pt-[45px]" aria-busy={loading}>
      {/* Cabecera */}
      <div className="flex items-center gap-[5px] pl-[21px]">
        <span className="grid h-9 w-9 place-items-center" style={{ color: accentHex }}>
          <TrendingFlameIcon size={36} />
        </span>
        <h2 className="font-dela text-xl font-normal leading-8 text-ink">
          Tendencia <span style={{ color: accentHex }}>Ahora</span>
        </h2>
      </div>

      {/* Periodo */}
      <PillTabs options={PERIODS} value={period} onChange={setPeriod} label="Periodo del ranking" className="mx-auto mt-[18px] w-80 max-w-[calc(100%-2rem)]" />

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
                  return (
                    <Link
                      key={String(manga.id)}
                      to={`/manga/${manga.id}`}
                      draggable={false}
                      tabIndex={copy > 0 ? -1 : undefined}
                      className="block w-[185px] shrink-0"
                      aria-label={`${rank}. ${manga.title}`}
                    >
                      <div className="relative h-[288px] overflow-hidden rounded-t-xl bg-media">
                        <img src={manga.coverImage} alt={`Portada del manga ${manga.title}`} draggable={false} loading={copy === 0 && index < 2 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
                        {rank === 1 && (
                          <span className="absolute right-[3px] top-[6px] grid h-6 w-6 place-items-center rounded-[5px] bg-amber-400 text-ink" aria-hidden="true">
                            <CrownIcon size={12} />
                          </span>
                        )}
                        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[130px] bg-gradient-to-t from-surface/95 via-surface/55 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end">
                          <RankNumber rank={rank} className="-mb-[7px] -ml-[14px] text-[84px]" />
                          <div className="mb-2 min-w-0 flex-1 pl-[22px] pr-2">
                            <TypeBadge type={manga.type} accent={accent} className="h-2.5 rounded-[3px] px-1.5 text-[7px]" />
                            <h3 className="mt-1 line-clamp-2 font-montserrat text-[10px] font-black uppercase leading-3 text-ink">
                              {manga.title}
                            </h3>
                          </div>
                        </div>
                      </div>

                      <div className="h-9 rounded-b-lg bg-panel px-2.5 text-ink">
                        <ChapterMeta variant="bar" chapter={manga.chapter} isFree={manga.isFree} date={manga.date} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <p className="w-full py-16 text-center font-montserrat text-xs font-bold uppercase tracking-wider text-muted">
              No hay resultados en este periodo
            </p>
          )
        )}
      </div>
    </section>
  );
};
