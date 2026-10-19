let pending: Promise<typeof import('../components/ui/GradientASCII')> | undefined;

/** Share the same download between idle preloading and the subscription page. */
export function loadSubscriptionBackground() {
  pending ??= import('../components/ui/GradientASCII').catch(error => {
    pending = undefined;
    throw error;
  });
  return pending;
}

/** Wait for page load, visible images, a quiet resource window and idle CPU. */
export function scheduleSubscriptionBackground() {
  let stopped = false;
  let timer = 0;
  let idle: number | undefined;
  let lastActivity = performance.now();
  const observer = typeof PerformanceObserver === 'undefined' ? null : new PerformanceObserver(() => {
    lastActivity = performance.now();
  });
  observer?.observe({ type: 'resource' });
  const stop = () => {
    stopped = true;
    window.clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback(idle);
    observer?.disconnect();
  };
  const ready = () => document.readyState === 'complete' && !document.hidden &&
    performance.now() - lastActivity >= 1500 &&
    !Array.from(document.images).some(image => {
      if (image.complete || !image.currentSrc) return false;
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
  const check = () => {
    if (stopped) return;
    if (!ready()) { timer = window.setTimeout(check, 500); return; }
    const warm = () => {
      idle = undefined;
      if (stopped) return;
      if (!ready()) { timer = window.setTimeout(check, 500); return; }
      stop();
      void loadSubscriptionBackground().catch(() => {});
    };
    if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(warm);
    else timer = window.setTimeout(warm, 200);
  };
  timer = window.setTimeout(check, 1500);
  return stop;
}
