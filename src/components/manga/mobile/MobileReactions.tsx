import { useState } from 'react';

import { MANGA_REACTIONS, ReactionButton, ReactionRingGradient, type MangaReactionId } from '../reactions';

/**
 * Panel de reacciones móvil: los seis emojis del diseño en dos filas (cuatro y
 * dos), cada uno en su círculo con el contador debajo.
 */
export const MobileReactions = ({ counts, selected, error, onReact }: {
  counts: Record<MangaReactionId, number>;
  selected: MangaReactionId | null;
  error?: string;
  onReact: (id: MangaReactionId) => void;
}) => {
  const [tracing, setTracing] = useState<MangaReactionId | null>(null);

  const handleReact = (id: MangaReactionId) => {
    setTracing(id);
    window.setTimeout(() => setTracing((current) => (current === id ? null : current)), 700);
    onReact(id);
  };

  const renderReaction = (reaction: (typeof MANGA_REACTIONS)[number]) => (
    <div key={reaction.id} className="flex w-[calc((100%-27px)/4)] shrink-0 flex-col items-center gap-[7px]">
      <ReactionButton
        reaction={reaction}
        count={counts[reaction.id] ?? 0}
        selected={selected === reaction.id}
        tracing={tracing === reaction.id}
        onReact={() => handleReact(reaction.id)}
      />
    </div>
  );

  return (
    <section aria-label="Reacciones" className="manga-mobile-reactions">
      <ReactionRingGradient />
      <div className="rounded-[20px] border-[0.5px] border-zinc-400/60 px-[18px] py-[17px] max-[400px]:px-3">
        {error && <p role="alert" className="mb-3 text-center font-montserrat text-[11px] text-red-400">{error}</p>}
        <div className="flex items-start justify-center gap-[9px]">{MANGA_REACTIONS.slice(0, 4).map(renderReaction)}</div>
        <div className="mt-[17px] flex items-start justify-center gap-[9px]">{MANGA_REACTIONS.slice(4).map(renderReaction)}</div>
      </div>
    </section>
  );
};
