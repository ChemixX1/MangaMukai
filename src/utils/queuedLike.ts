type LikeState = { liked: boolean; count: number };

export const createQueuedLike = (
  initial: LikeState,
  toggle: () => Promise<{ action: string; total: number } | null>,
  publish: (state: LikeState) => void,
) => {
  let confirmed = initial;
  let desired = initial.liked;
  let running = false;
  let disposed = false;
  const emit = () => {
    if (!disposed) publish({ liked: desired, count: Math.max(0, confirmed.count + Number(desired) - Number(confirmed.liked)) });
  };
  const flush = async () => {
    if (running) return;
    running = true;
    try {
      while (desired !== confirmed.liked) {
        const result = await toggle();
        if (!result) throw new Error('Like no confirmado');
        confirmed = { liked: result.action === 'added', count: result.total };
        emit();
      }
    } catch {
      desired = confirmed.liked;
      emit();
    } finally {
      running = false;
    }
  };
  return {
    click: () => { desired = !desired; emit(); void flush(); },
    dispose: () => { disposed = true; },
  };
};
