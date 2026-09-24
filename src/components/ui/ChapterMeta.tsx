import { useFitScale } from '../../hooks/useFitScale';
import { ChapterBookIcon, CoinStackIcon, FlameIcon } from './icons';

interface ChapterMetaProps {
  chapter: string | number;
  isFree: boolean;
  /** Antigüedad del capítulo ("Hoy", "3 Días", "2 Meses"). */
  date: string;
  /** Capítulo de la última semana: la fecha se cambia por la llama de "NUEVO". */
  isNew?: boolean;
  /** Color de la llama y de "NUEVO" (el acento de la sección). */
  accentHex?: string;
  /**
   * `row`: filas de capítulo de "Lo Más Reciente" (con el libro y en
   * mayúsculas); `bar`: pie de las tarjetas del ranking.
   */
  variant?: 'row' | 'bar';
}

const Divider = () => <span aria-hidden="true" className="h-3.5 w-px min-w-px flex-none bg-ink/50" />;

/**
 * "Cap 7 · GRATIS · 2 Meses": tres columnas iguales con cada grupo centrado y
 * los separadores entre ellas. Ocupa todo el ancho de su contenedor; si el
 * contenido pide más, la fila entera se encoge en bloque (useFitScale).
 */
export const ChapterMeta = ({ chapter, isFree, date, isNew = false, accentHex, variant = 'row' }: ChapterMetaProps) => {
  const { outerRef, innerRef } = useFitScale<HTMLSpanElement, HTMLSpanElement>();
  const isRow = variant === 'row';
  return (
    <span ref={outerRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <span ref={innerRef} className="grid w-max min-w-full flex-none grid-cols-[1fr_1px_1fr_1px_1fr] items-center justify-items-center gap-x-[5px]">
        <span className="flex shrink-0 items-center gap-[3px]">
          {isRow && <ChapterBookIcon size={13} />}
          <span className={`whitespace-nowrap font-anta font-normal ${isRow ? 'text-[10px]' : 'text-xs'}`}>Cap {chapter}</span>
        </span>
        <Divider />
        <span className={`flex shrink-0 items-center gap-[3px] whitespace-nowrap font-audiowide font-normal ${isRow ? 'text-[8.5px]' : 'text-[9px]'}`}>
          {isFree
            ? <span aria-hidden="true" className="h-1.5 w-1.5 animate-blink rounded-full bg-mukai-free motion-reduce:animate-none" />
            : <CoinStackIcon size={15} />}
          {isFree ? 'GRATIS' : 'PAGO'}
        </span>
        <Divider />
        <span className="flex shrink-0 items-center gap-[3px]" style={isNew ? { color: accentHex } : undefined}>
          {isNew && <FlameIcon size={15} className="origin-bottom animate-flame motion-reduce:animate-none" />}
          <span className={`whitespace-nowrap font-anta font-normal ${isRow ? 'text-[10px] uppercase' : 'text-xs'}`}>{isNew ? 'Nuevo' : date}</span>
        </span>
      </span>
    </span>
  );
};
