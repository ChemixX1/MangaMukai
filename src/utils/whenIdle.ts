

export const whenIdle = (task: () => void, timeout = 2000): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = globalThis.setTimeout(task, 200);
  return () => globalThis.clearTimeout(handle);
};
