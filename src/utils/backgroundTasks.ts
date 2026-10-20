type Priority = 'intent' | 'idle';
type Connection = Partial<Pick<EventTarget, 'addEventListener' | 'removeEventListener'>> & {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};
type DeviceNavigator = Navigator & { connection?: Connection; deviceMemory?: number };
type Job = {
  key: string;
  task: () => unknown | Promise<unknown>;
  priority: Priority;
  queuedAt: number;
  subscribers: Set<symbol>;
};

const queue = new Map<string, Job>();
let active: Job | undefined;
let holds = 0;
let timer: number | undefined;
let idle: number | undefined;
let stopMonitoring: (() => void) | undefined;
let lastResourceActivity = 0;
let lastInputActivity = 0;

// Resource timing reports completed downloads. Callers loading visible data must
// hold the queue explicitly; quiet resource timing alone is only a heuristic.
const now = () => performance.now();
const device = () => navigator as DeviceNavigator;
const canWarmOnIntent = () => {
  const connection = device().connection;
  return navigator.onLine !== false && !connection?.saveData &&
    connection?.effectiveType !== 'slow-2g' && connection?.effectiveType !== '2g';
};

export function getBackgroundPolicy(): { allowSpeculation: boolean; constrained: boolean } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { allowSpeculation: false, constrained: false };
  }
  const { connection, deviceMemory, hardwareConcurrency } = device();
  return {
    allowSpeculation: canWarmOnIntent() && connection?.effectiveType !== '3g' &&
      !(connection?.downlink && connection.downlink <= 1.5),
    constrained: !!((deviceMemory && deviceMemory <= 4) ||
      (hardwareConcurrency && hardwareConcurrency <= 4)),
  };
}

const cancelScheduledCheck = () => {
  if (timer !== undefined) window.clearTimeout(timer);
  if (idle !== undefined) window.cancelIdleCallback?.(idle);
  timer = undefined;
  idle = undefined;
};

const cleanupIfEmpty = () => {
  if (queue.size || active) return;
  cancelScheduledCheck();
  stopMonitoring?.();
  stopMonitoring = undefined;
};

const visibleImagesPending = () => Array.from(document.images).some(image => {
  if (image.complete || !(image.currentSrc || image.src)) return false;
  const rect = image.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
    rect.top < window.innerHeight && rect.left < window.innerWidth;
});

const nextJob = () => {
  if (!canWarmOnIntent()) return undefined;
  const jobs = [...queue.values()];
  return jobs.find(job => job.priority === 'intent') ??
    (getBackgroundPolicy().allowSpeculation ? jobs[0] : undefined);
};

const waitRemaining = (job: Job) => {
  const constrained = getBackgroundPolicy().constrained;
  const resourceQuiet = job.priority === 'intent' ? 150 : constrained ? 2200 : 1500;
  const inputQuiet = job.priority === 'intent' ? 150 : constrained ? 1200 : 800;
  return Math.max(
    0,
    job.queuedAt + (job.priority === 'intent' ? 150 : resourceQuiet) - now(),
    lastResourceActivity + resourceQuiet - now(),
    lastInputActivity + inputQuiet - now(),
  );
};

const deferCheck = (delay: number) => {
  timer = window.setTimeout(() => {
    timer = undefined;
    check();
  }, delay);
};

const startJob = (job: Job) => {
  queue.delete(job.key);
  active = job;
  // Imports already in flight cannot be aborted. Cancellation only removes queued work.
  void Promise.resolve().then(job.task).catch(() => {}).finally(() => {
    active = undefined;
    lastResourceActivity = now();
    wake();
  });
};

function check() {
  if (active) return;
  cleanupIfEmpty();
  if (!queue.size || holds || document.hidden || document.readyState !== 'complete') return;
  const job = nextJob();
  if (!job) return; // Connection/visibility/load/release events resume the queue.
  const wait = waitRemaining(job);
  if (wait > 0) { deferCheck(wait); return; }
  // Layout is read only after the quiet window, never in scroll/input handlers.
  if (visibleImagesPending()) { deferCheck(500); return; }
  const run = () => {
    idle = undefined;
    timer = undefined;
    if (active || holds || document.hidden || document.readyState !== 'complete') return;
    const current = nextJob();
    if (!current) return;
    if (waitRemaining(current) > 0 || visibleImagesPending()) { check(); return; }
    startJob(current);
  };
  if (typeof window.requestIdleCallback === 'function') {
    // No timeout: background work must never be forced into a busy main thread.
    idle = window.requestIdleCallback(deadline => {
      idle = undefined;
      if (deadline.timeRemaining() < 5) { deferCheck(250); return; }
      run();
    });
  } else {
    timer = window.setTimeout(run, 250);
  }
}

function wake() {
  cancelScheduledCheck();
  check();
}

const monitor = () => {
  if (stopMonitoring) return;
  lastResourceActivity = lastInputActivity = now();
  const onInput = () => { lastInputActivity = now(); wake(); };
  const onStateChange = () => {
    lastResourceActivity = lastInputActivity = now();
    wake();
  };
  const connection = device().connection;
  const inputEvents = ['scroll', 'pointerdown', 'touchstart', 'keydown'] as const;
  for (const event of inputEvents) window.addEventListener(event, onInput, { passive: true, capture: true });
  window.addEventListener('load', onStateChange);
  window.addEventListener('online', onStateChange);
  window.addEventListener('offline', onStateChange);
  document.addEventListener('visibilitychange', onStateChange);
  document.addEventListener('readystatechange', onStateChange);
  connection?.addEventListener?.('change', onStateChange);
  let observer: PerformanceObserver | undefined;
  try {
    if (typeof PerformanceObserver !== 'undefined') {
      observer = new PerformanceObserver(() => {
        lastResourceActivity = now();
        wake();
      });
      observer.observe({ type: 'resource' });
    }
  } catch {
    observer?.disconnect();
    observer = undefined;
  }
  stopMonitoring = () => {
    observer?.disconnect();
    for (const event of inputEvents) window.removeEventListener(event, onInput, true);
    window.removeEventListener('load', onStateChange);
    window.removeEventListener('online', onStateChange);
    window.removeEventListener('offline', onStateChange);
    document.removeEventListener('visibilitychange', onStateChange);
    document.removeEventListener('readystatechange', onStateChange);
    connection?.removeEventListener?.('change', onStateChange);
  };
};

export function scheduleBackgroundTask(
  key: string,
  task: () => unknown | Promise<unknown>,
  options: { priority?: Priority } = {},
): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  const subscriber = Symbol(key);
  let job = active?.key === key ? active : queue.get(key);
  if (!job) {
    job = { key, task, priority: options.priority ?? 'idle', queuedAt: now(), subscribers: new Set() };
    queue.set(key, job);
  } else if (options.priority === 'intent') {
    job.priority = 'intent';
  }
  job.subscribers.add(subscriber);
  monitor();
  wake();
  return () => {
    job.subscribers.delete(subscriber);
    if (!job.subscribers.size && queue.get(key) === job) queue.delete(key);
    wake();
  };
}

/** Hold speculative work while visible page data or a route is still loading. */
export function blockBackgroundTasks(): () => void {
  holds++;
  if (typeof window !== 'undefined') cancelScheduledCheck();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds--;
    if (typeof window !== 'undefined') {
      lastResourceActivity = now();
      wake();
    }
  };
}
