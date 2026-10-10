import angryImage from '../../assets/manga/reactions/angry.png';
import hahaImage from '../../assets/manga/reactions/haha.png';
import likeImage from '../../assets/manga/reactions/like.png';
import loveImage from '../../assets/manga/reactions/love.png';
import sadImage from '../../assets/manga/reactions/sad.png';
import wowImage from '../../assets/manga/reactions/wow.png';

/** Reacciones a la serie, en el orden del diseño (móvil y escritorio). */
export const MANGA_REACTIONS = [
  { id: 'like', label: 'Me gusta', image: likeImage },
  { id: 'love', label: 'Me encanta', image: loveImage },
  { id: 'haha', label: 'Me divierte', image: hahaImage },
  { id: 'wow', label: 'Me asombra', image: wowImage },
  { id: 'sad', label: 'Me entristece', image: sadImage },
  { id: 'angry', label: 'Me enoja', image: angryImage },
] as const;

export type MangaReactionId = (typeof MANGA_REACTIONS)[number]['id'];

export const createReactionCounts = (): Record<MangaReactionId, number> =>
  Object.fromEntries(MANGA_REACTIONS.map(({ id }) => [id, 0])) as Record<MangaReactionId, number>;

const RING_GRADIENT_ID = 'reaction-ring-gradient';

/** Degradado rosa→morado del aro; se pinta una vez por página. */
export const ReactionRingGradient = () => (
  <svg width="0" height="0" className="absolute" aria-hidden="true">
    <defs>
      <linearGradient id={RING_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#FF008C" />
        <stop offset="1" stopColor="#B000AD" />
      </linearGradient>
    </defs>
  </svg>
);

interface ReactionButtonProps {
  reaction: (typeof MANGA_REACTIONS)[number];
  count: number;
  selected: boolean;
  /** El aro se está dibujando (la reacción recién pulsada). */
  tracing: boolean;
  onReact: () => void;
  /** Tamaño del círculo; por defecto ocupa el ancho de su celda. */
  className?: string;
}

/**
 * Emoji de la reacción en su círculo con el contador debajo. El aro gris de
 * base se vuelve rosa al elegirla y, al tocarla, se dibuja dando una vuelta.
 */
export const ReactionButton = ({ reaction, count, selected, tracing, onReact, className = 'aspect-square w-full' }: ReactionButtonProps) => (
  <>
    <button
      type="button"
      onClick={onReact}
      aria-label={reaction.label}
      aria-pressed={selected}
      title={reaction.label}
      className={`relative flex items-center justify-center rounded-full bg-panel transition-transform hover:scale-105 active:scale-95 ${className}`}
    >
      <svg viewBox="0 0 80 80" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="40" cy="40" r="38" fill="none" stroke="rgb(116,116,116)" strokeWidth="2" />
        <circle
          cx="40"
          cy="40"
          r="38"
          fill="none"
          stroke={`url(#${RING_GRADIENT_ID})`}
          strokeWidth="4"
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          className={`transition-opacity duration-200 ${tracing ? 'animate-ring-trace motion-reduce:animate-none' : ''}`}
          style={{ opacity: selected || tracing ? 1 : 0 }}
        />
      </svg>
      <img src={reaction.image} alt="" aria-hidden="true" loading="lazy" decoding="async" className="relative h-[55%] w-[55%] object-contain" />
    </button>
    <span className={`font-anta text-xl font-normal leading-6 tabular-nums ${selected ? 'text-mukai-magenta' : 'text-ink'}`}>{count}</span>
  </>
);
