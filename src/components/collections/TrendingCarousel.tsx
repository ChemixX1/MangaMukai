import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { RANKING_PERIODS, useTrendingRanking, type RankedManga, type RankingPeriod } from '../../hooks/useTrendingRanking';
import type { MangaCapitulo } from '../../types/manga';
import { CrownIcon, PillTabs, RankNumber, SectionHeading, TrendingFlameIcon, TypeBadge, type Accent } from '../ui';
import { formatChapterCount } from '../../utils/trendingRanking';

const RANKING_SIZE = 12;

interface RankedCardProps {
  manga: RankedManga;
  rank: number;
  accent: Accent;
  /** Copia de relleno del bucle: fuera del orden de tabulación. */
  isCopy: boolean;
}

/** Tarjeta del ranking con el total de capítulos de la serie. */
const RankedCard = ({ manga, rank, accent, isCopy }: RankedCardProps) => (
  <div className="box-border w-[184px] flex-none pr-4 sm:w-[214px] lg:w-[calc((min(100vw,1480px)-4rem)/6)] lg:px-2">
    <Link
      to={`/manga/${manga.id}`}
      tabIndex={isCopy ? -1 : undefined}
      aria-label={`${rank}. ${manga.title}`}
      className="group block transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[185/288] overflow-hidden rounded-t-xl bg-media">
        <img src={manga.coverImage} alt={`Portada del manga ${manga.title}`} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {rank === 1 && (
          <span aria-hidden="true" className="absolute right-[5px] top-2 grid h-7 w-7 place-items-center rounded-[5px] bg-amber-400 text-ink">
            <CrownIcon size={14} />
          </span>
        )}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-surface/95 via-surface/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end">
          <RankNumber rank={rank} className="-mb-2 -ml-3 text-[96px]" />
          <div className="mb-2.5 min-w-0 flex-1 pl-6 pr-2.5">
            <TypeBadge type={manga.type} accent={accent} className="h-3 rounded-[3px] px-1.5 text-[8px]" />
            <h3 className="mt-1 line-clamp-2 font-montserrat text-xs font-black uppercase leading-[14px] text-ink">{manga.title}</h3>
          </div>
        </div>
      </div>
      <div className="flex h-9 items-center rounded-b-lg bg-panel px-2.5 font-montserrat text-xs text-ink">
        {formatChapterCount(manga.chapterCount)}
      </div>
    </Link>
  </div>
);

interface TrendingCarouselProps {
  audience: 'women' | 'men';
  /** Filtro de colección. Debe ser estable (definido a nivel de módulo). */
  filterMangas: (items: MangaCapitulo[]) => MangaCapitulo[];
  /** Portadas mínimas para animar la cinta; con menos se queda quieta (0 = siempre se mueve si llena el ancho). */
  minItemsForMotion?: number;
}

/**
 * "Tendencia Ahora" de las colecciones (B&N y +19): la cinta de seis tarjetas
 * a la vista que avanzan en bucle, con el titular, las pestañas en píldora y
 * las tarjetas del ranking. Rosa para mujeres y celeste para la sección juvenil.
 */
export const TrendingCarousel = ({ audience, filterMangas, minItemsForMotion = 0 }: TrendingCarouselProps) => {
  const accent: Accent = audience === 'men' ? 'cyan' : 'pink';
  const [period, setPeriod] = useState<RankingPeriod>('Semanal');
  const { items, loading } = useTrendingRanking({ audience, period, size: RANKING_SIZE, filterMangas, preloadCount: 5 });
  const [isTouchPaused, setIsTouchPaused] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  // Con pocas portadas la cinta no da la vuelta: se muestran una sola vez y
  // quietas, en vez de repetir la misma portada para rellenar el ancho.
  const [fillsViewport, setFillsViewport] = useState(true);
  const moving = fillsViewport && !(minItemsForMotion > 0 && items.length < minItemsForMotion);

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const sequence = sequenceRef.current;
      // Sin medidas fiables se decide por cantidad: con menos de 8 portadas la
      // cinta nunca llena el ancho en escritorio.
      if (!viewport || !sequence || sequence.scrollWidth === 0) {
        setFillsViewport(items.length >= 8);
        return;
      }
      setFillsViewport(sequence.scrollWidth >= viewport.clientWidth);
    };
    measure();
    // Segunda pasada por si las tarjetas terminan de asentar su ancho.
    const timer = window.setTimeout(measure, 300);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [items]);

  return (
    <section className="relative w-full" aria-busy={loading}>
      <div className="relative z-20 mx-auto w-full max-w-[1600px] px-4 sm:px-5 lg:max-w-[min(100vw,1480px)] lg:px-8">
        <div className="mb-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading icon={<TrendingFlameIcon size={42} />} lead="Tendencia" highlight="Ahora" accent={accent} />
          <PillTabs options={RANKING_PERIODS} value={period} onChange={setPeriod} label="Periodo del ranking" className="w-full sm:w-80" />
        </div>

        <div className="relative min-h-[300px]">
          {items.length > 0 ? (
            <div
              ref={viewportRef}
              className="-mx-2 touch-pan-y overflow-hidden py-4"
              aria-label="Ranking en movimiento continuo"
              onTouchStart={() => setIsTouchPaused(true)}
              onTouchEnd={() => setIsTouchPaused(false)}
              onTouchCancel={() => setIsTouchPaused(false)}
            >
              <div
                className={`collection-trending-track flex w-max will-change-transform ${moving ? 'animate-marquee-x motion-reduce:[animation-play-state:paused]' : ''}`}
                style={isTouchPaused ? { animationPlayState: 'paused' } : undefined}
              >
                {(moving ? [0, 1] : [0]).map((copy) => (
                  <div key={copy} ref={copy === 0 ? sequenceRef : undefined} className="flex flex-none" aria-hidden={copy === 1 ? true : undefined}>
                    {items.map((manga, index) => (
                      <RankedCard key={`${copy}-${manga.id}`} manga={manga} rank={index + 1} accent={accent} isCopy={copy === 1} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !loading && (
              <p className="flex h-[300px] items-center justify-center font-montserrat text-xs font-bold uppercase tracking-wider text-muted">
                No hay resultados en este periodo
              </p>
            )
          )}
        </div>
      </div>
    </section>
  );
};
