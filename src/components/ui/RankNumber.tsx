/** Oro, plata y bronce para el podio; el resto va en la tinta del tema. */
const PODIUM_COLORS: Record<number, string> = { 1: '#f59e0b', 2: 'var(--mm-rank-silver)', 3: '#f97316' };

export const rankColor = (rank: number) => PODIUM_COLORS[rank] ?? 'rgb(var(--mm-ink))';

interface RankNumberProps {
  rank: number;
  /** Tamaño y posición (cuerpo de letra, márgenes negativos). */
  className?: string;
}

/** Número del ranking: Montserrat itálica con una sombra del color de fondo que lo despega de la portada. */
export const RankNumber = ({ rank, className = '' }: RankNumberProps) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none shrink-0 select-none font-montserrat font-extrabold italic leading-[0.8] tracking-[-0.04em] [text-shadow:4px_4px_0_rgb(var(--mm-surface))] ${className}`}
    style={{ color: rankColor(rank) }}
  >
    {rank}
  </span>
);
