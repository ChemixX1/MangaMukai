import { useEffect, useRef, useState } from 'react';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import { MobileReactions } from './mobile/MobileReactions';
import { getStoredToken } from '../../services/authService';
import { getEntityReactions, setEntityReaction } from '../../services/communityService';
import { MANGA_REACTIONS, ReactionButton, ReactionRingGradient, createReactionCounts, type MangaReactionId } from './reactions';

export const ReaderReactions = ({ chapterId }: { chapterId: string }) => {
  const isMobile = useIsMobileViewport();
  const [counts, setCounts] = useState(createReactionCounts);
  const [selected, setSelected] = useState<MangaReactionId | null>(null);
  const [error, setError] = useState('');
  const [tracing, setTracing] = useState<MangaReactionId | null>(null);
  const traceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef(Promise.resolve());
  const confirmed = useRef({ counts: createReactionCounts(), selected: null as MangaReactionId | null });
  const guestSelection = useRef<MangaReactionId | null>(null);
  const revision = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const initialRevision = revision.current;
    const guest = !getStoredToken();
    if (guest) {
      try {
        const saved = localStorage.getItem(`mm_chapter_guest_reaction:${chapterId}`);
        guestSelection.current = MANGA_REACTIONS.find(item => item.id === saved)?.id ?? null;
      } catch {                            }
      setSelected(guestSelection.current);
      const initial = createReactionCounts();
      if (guestSelection.current) initial[guestSelection.current]++;
      setCounts(initial);
    }
    void getEntityReactions('chapter', chapterId).then(result => {
      if (!active || (!guest && revision.current !== initialRevision)) return;
      const loaded = { ...createReactionCounts(), ...result.reactions };
      const selection = guest ? guestSelection.current : (result.my_reaction || null) as MangaReactionId | null;
      if (guest && selection) loaded[selection]++;
      confirmed.current = { counts: loaded, selected: selection };
      setCounts(loaded);
      setSelected(selection);
    }).catch(() => { if (active) setError('No se pudieron cargar las reacciones.'); });
    return () => { active = false; mounted.current = false; if (traceTimer.current) clearTimeout(traceTimer.current); };
  }, [chapterId]);

  const react = (id: MangaReactionId) => {
    const currentRevision = ++revision.current;
    const nextSelection = selected === id ? null : id;
    const optimistic = { ...counts };
    if (selected) optimistic[selected] = Math.max(0, optimistic[selected] - 1);
    if (nextSelection) optimistic[nextSelection]++;
    setCounts(optimistic);
    setSelected(nextSelection);
    setTracing(id);
    if (traceTimer.current) clearTimeout(traceTimer.current);
    traceTimer.current = setTimeout(() => setTracing(null), 700);
    setError('');
    if (!getStoredToken()) {
      guestSelection.current = nextSelection;
      try {
        if (nextSelection) localStorage.setItem(`mm_chapter_guest_reaction:${chapterId}`, nextSelection);
        else localStorage.removeItem(`mm_chapter_guest_reaction:${chapterId}`);
      } catch {                                                                   }
      return;
    }

    queue.current = queue.current.then(async () => {
      try {
        const result = await setEntityReaction('chapter', chapterId, nextSelection || '');
        if (!mounted.current) return;
        confirmed.current = {
          counts: { ...createReactionCounts(), ...result.reactions },
          selected: (result.my_reaction || null) as MangaReactionId | null,
        };
        if (revision.current !== currentRevision) return;
        setCounts(confirmed.current.counts);
        setSelected(confirmed.current.selected);
      } catch {
        if (mounted.current && revision.current === currentRevision) {
          setCounts(confirmed.current.counts);
          setSelected(confirmed.current.selected);
          setError('No se pudo guardar la reacción. Inténtalo de nuevo.');
        }
      }
    });
  };

  if (isMobile) return (
    <div className="manga-detail-mobile reader-reactions-mobile">
      <MobileReactions counts={counts} selected={selected} error={error} onReact={id => void react(id)} />
    </div>
  );

  return (
    <div className="manga-detail-desktop">
    <section className="manga-detail-reactions" aria-label="Reacciones del capítulo">
      <ReactionRingGradient />
      {error && <p role="alert" className="mb-3 text-center text-xs text-red-500">{error}</p>}
      <div className="grid grid-cols-6 items-start gap-2.5">
        {MANGA_REACTIONS.map(reaction => (
          <div key={reaction.id} className="flex flex-col items-center gap-[7px]">
            <ReactionButton reaction={reaction} count={counts[reaction.id]} selected={selected === reaction.id} tracing={tracing === reaction.id} onReact={() => void react(reaction.id)} className="aspect-square w-full max-w-[76px]" />
          </div>
        ))}
      </div>
    </section>
    </div>
  );
};
