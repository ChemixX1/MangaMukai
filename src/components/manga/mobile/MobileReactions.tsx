import { useState } from 'react';
import angryImage from '../../../assets/manga/reactions/angry.png';
import hahaImage from '../../../assets/manga/reactions/haha.png';
import likeImage from '../../../assets/manga/reactions/like.png';
import loveImage from '../../../assets/manga/reactions/love.png';
import sadImage from '../../../assets/manga/reactions/sad.png';
import wowImage from '../../../assets/manga/reactions/wow.png';

export const MOBILE_REACTIONS = [
  { id: 'like', label: 'Me gusta', image: likeImage },
  { id: 'love', label: 'Me encanta', image: loveImage },
  { id: 'haha', label: 'Me divierte', image: hahaImage },
  { id: 'wow', label: 'Me asombra', image: wowImage },
  { id: 'sad', label: 'Me entristece', image: sadImage },
  { id: 'angry', label: 'Me enoja', image: angryImage },
] as const;

export type MobileReactionId = (typeof MOBILE_REACTIONS)[number]['id'];

/** Aro del emoji: gris de base y, al elegirlo, el degradado rosa→morado que se dibuja dando la vuelta. */
const ReactionRing = ({ active, tracing }: { active: boolean; tracing: boolean }) => (
  <svg viewBox="0 0 80 80" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
    <circle cx="40" cy="40" r="38" fill="none" stroke="rgb(116,116,116)" strokeWidth="2" />
    <circle
      cx="40"
      cy="40"
      r="38"
      fill="none"
      stroke="url(#mmd-reaction-ring)"
      strokeWidth="4"
      strokeLinecap="round"
      transform="rotate(-90 40 40)"
      className={`mmd-reaction-ring ${tracing ? 'is-tracing' : ''}`}
      style={{ opacity: active || tracing ? 1 : 0 }}
    />
  </svg>
);

/**
 * Panel de reacciones: los seis emojis del diseño en dos filas (cuatro y dos),
 * cada uno en su círculo con el contador debajo. Al tocar uno, el aro rosa se
 * dibuja dando una vuelta completa y se queda si la reacción es la elegida.
 */
export const MobileReactions = ({ counts, selected, error, onReact }: {
  counts: Record<MobileReactionId, number>;
  selected: MobileReactionId | null;
  error?: string;
  onReact: (id: MobileReactionId) => void;
}) => {
  const [tracing, setTracing] = useState<MobileReactionId | null>(null);

  const handleReact = (id: MobileReactionId) => {
    setTracing(id);
    window.setTimeout(() => setTracing((current) => (current === id ? null : current)), 700);
    onReact(id);
  };

  const renderReaction = ({ id, label, image }: (typeof MOBILE_REACTIONS)[number]) => {
    const isSelected = selected === id;
    return (
      <div key={id} className="mmd-reaction-cell flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={() => handleReact(id)}
          aria-label={label}
          aria-pressed={isSelected}
          title={label}
          data-selected={isSelected}
          className="mmd-reaction relative flex h-20 w-20 items-center justify-center rounded-full bg-neutral-900 transition-transform active:scale-95"
        >
          <ReactionRing active={isSelected} tracing={tracing === id} />
          <img src={image} alt="" aria-hidden="true" loading="lazy" decoding="async" className="relative h-11 w-11 object-contain" />
        </button>
        <span className={`mmd-anta text-xl leading-4 tabular-nums ${isSelected ? 'text-[#FF008C]' : 'text-white'}`}>{counts[id] ?? 0}</span>
      </div>
    );
  };

  return (
    <section aria-label="Reacciones" className="mmd-reactions mx-auto w-[87.3%]">
      {/* El degradado del aro se define una vez para los seis emojis. */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="mmd-reaction-ring" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#FF008C" />
            <stop offset="1" stopColor="#B000AD" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mmd-reactions-panel rounded-[20px] border-[0.5px] border-zinc-400/60 px-3 py-4">
        {error && <p role="alert" className="mmd-montserrat mb-3 text-center text-[11px] text-red-400">{error}</p>}
        <div className="mmd-reaction-row flex items-start justify-center gap-2.5">{MOBILE_REACTIONS.slice(0, 4).map(renderReaction)}</div>
        <div className="mmd-reaction-row mmd-reaction-row-last flex items-start justify-center gap-2.5">{MOBILE_REACTIONS.slice(4).map(renderReaction)}</div>
      </div>
    </section>
  );
};
