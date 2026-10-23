export type PollResult = 'changed' | 'unchanged' | 'error';

type PollingOptions = {
  activeMs: number;
  idleMs: number;
  quietMs: number;
  activeForMs?: number;
  idleForMs?: number;
  maxRetryMs?: number;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => () => void;
};

// Wait after completion, so a slow request never overlaps the next poll.
export function createAdaptivePoller(load: () => Promise<PollResult>, options: PollingOptions) {
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? ((callback, delay) => {
    const timer = window.setTimeout(callback, delay);
    return () => window.clearTimeout(timer);
  });
  let enabled = false;
  let stopped = false;
  let running = false;
  let refreshPending = false;
  let failures = 0;
  let lastActivity = now();
  let nextAt = Infinity;
  let cancelTimer: (() => void) | undefined;

  const clear = () => {
    cancelTimer?.();
    cancelTimer = undefined;
    nextAt = Infinity;
  };
  const delay = () => {
    if (failures) return Math.min(options.maxRetryMs ?? 120_000, options.activeMs * 2 ** Math.min(failures, 10));
    const idle = now() - lastActivity;
    if (idle < (options.activeForMs ?? 60_000)) return options.activeMs;
    return idle < (options.idleForMs ?? 180_000) ? options.idleMs : options.quietMs;
  };
  const queue = (ms: number) => {
    clear();
    if (!enabled || stopped) return;
    nextAt = now() + ms;
    cancelTimer = schedule(() => { void run(); }, ms);
  };
  const run = async () => {
    if (!enabled || stopped || running) return;
    clear();
    running = true;
    let result: PollResult;
    try { result = await load(); }
    catch { result = 'error'; }
    running = false;
    if (stopped) return;
    if (result === 'error') failures++;
    else {
      failures = 0;
      if (result === 'changed') lastActivity = now();
    }
    if (refreshPending && enabled) {
      refreshPending = false;
      void run();
    } else queue(delay());
  };
  const refresh = () => {
    if (stopped) return;
    lastActivity = now();
    clear();
    if (!enabled) return;
    if (running) refreshPending = true;
    else void run();
  };

  return {
    setEnabled(value: boolean) {
      if (stopped || value === enabled) return;
      enabled = value;
      if (enabled) refresh();
      else { clear(); refreshPending = false; }
    },
    activity() {
      if (stopped) return;
      lastActivity = now();
      // Typing restores a fast cadence without one request per keystroke or
      // shortening an error backoff. Repeated input cannot postpone a poll.
      if (enabled && !running && !failures && nextAt > now() + options.activeMs) queue(options.activeMs);
    },
    refresh,
    stop() { stopped = true; enabled = false; refreshPending = false; clear(); },
  };
}

export type AdaptivePoller = ReturnType<typeof createAdaptivePoller>;

export function observePollingVisibility(poller: AdaptivePoller) {
  const sync = () => poller.setEnabled(!document.hidden && navigator.onLine !== false);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
  return () => {
    poller.stop();
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('online', sync);
    window.removeEventListener('offline', sync);
  };
}
