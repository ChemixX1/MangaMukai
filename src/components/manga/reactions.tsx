import angryImage from '../../assets/manga/reactions/angry.svg';
import hahaImage from '../../assets/manga/reactions/haha.svg';
import likeImage from '../../assets/manga/reactions/like.svg';
import loveImage from '../../assets/manga/reactions/love.svg';
import sadImage from '../../assets/manga/reactions/sad.svg';
import wowImage from '../../assets/manga/reactions/wow.svg';
import detailHahaImage from '../../assets/manga/reactions/detail/haha.png';
import detailLikeImage from '../../assets/manga/reactions/detail/like.png';
import detailSadImage from '../../assets/manga/reactions/detail/sad.png';
import detailWowImage from '../../assets/manga/reactions/detail/wow.png';
import detailAngryImage from '../../assets/manga/reactions/detail/angry.png';
import detailLoveImage from '../../assets/manga/reactions/detail/love.png';

export const MANGA_REACTIONS = [
  { id: 'like', label: 'Me gusta', image: likeImage },
  { id: 'love', label: 'Me encanta', image: loveImage },
  { id: 'haha', label: 'Me divierte', image: hahaImage },
  { id: 'wow', label: 'Me asombra', image: wowImage },
  { id: 'sad', label: 'Me entristece', image: sadImage },
  { id: 'angry', label: 'Me enoja', image: angryImage },
] as const;

export type MangaReactionId = (typeof MANGA_REACTIONS)[number]['id'];

const DETAIL_REACTION_IMAGES: Partial<Record<MangaReactionId, string>> = {
  like: detailLikeImage,
  haha: detailHahaImage,
  wow: detailWowImage,
  sad: detailSadImage,
  angry: detailAngryImage,
  love: detailLoveImage,
};

export const ReactionIcon = ({ id, className = 'h-[23px] w-[23px]' }: {
  id: MangaReactionId;
  className?: string;
}) => (
  <img
    src={MANGA_REACTIONS.find((reaction) => reaction.id === id)?.image}
    alt=""
    aria-hidden="true"
    width="23"
    height="23"
    loading="lazy"
    decoding="async"
    className={`shrink-0 object-contain ${className}`}
  />
);

export const createReactionCounts = (): Record<MangaReactionId, number> =>
  Object.fromEntries(MANGA_REACTIONS.map(({ id }) => [id, 0])) as Record<MangaReactionId, number>;

const RING_GRADIENT_ID = 'reaction-ring-gradient';

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

  tracing: boolean;
  onReact: () => void;

  className?: string;
}

export const ReactionButton = ({ reaction, count, selected, tracing, onReact, className = 'aspect-square w-full' }: ReactionButtonProps) => (
  <>
    <button
      type="button"
      onClick={onReact}
      aria-label={reaction.label}
      aria-pressed={selected}
      title={reaction.label}
      className={`manga-reaction-button relative flex items-center justify-center rounded-full bg-panel transition-transform hover:scale-105 active:scale-95 ${className}`}
    >
      <svg viewBox="0 0 80 80" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="40" cy="40" r="38" fill="none" stroke="rgb(116,116,116)" strokeWidth="0" />
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
      <img
        src={DETAIL_REACTION_IMAGES[reaction.id] ?? reaction.image}
        alt=""
        aria-hidden="true"
        width="48"
        height="48"
        loading="lazy"
        decoding="async"
        className="relative h-[64%] w-[64%] shrink-0 object-contain"
      />
    </button>
    <span className={`manga-reaction-count ${selected ? 'text-mukai-magenta' : 'text-ink'}`}>{count}</span>
  </>
);
