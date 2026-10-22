interface ScrollEntry {
  left: number;
  top: number;
}

/** Scroll coordinates belong to history entries, independently of page data. */
export function createRouteScrollManager() {
  const positions = new Map<string, ScrollEntry>();

  return (key: string, restore: boolean, hash: string) => {
    const saved = restore ? positions.get(key) : undefined;
    let pending = true;
    let resizeObserver: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;
    let timeout: ReturnType<typeof window.setTimeout> | undefined;
    let anchor = hash.slice(1);
    try { anchor = decodeURIComponent(anchor); } catch { /* Keep a literal malformed anchor. */ }

    const remember = () => {
      if (!pending) positions.set(key, { left: window.scrollX, top: window.scrollY });
    };
    const disconnect = () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.clearTimeout(timeout);
    };
    const finish = () => {
      pending = false;
      disconnect();
      remember();
    };
    const apply = () => {
      if (!pending) return;
      if (saved) {
        window.scrollTo({ ...saved, behavior: 'instant' });
        if (Math.abs(window.scrollY - saved.top) < 2 && Math.abs(window.scrollX - saved.left) < 2) finish();
      } else if (anchor) {
        const target = document.getElementById(anchor);
        if (target) {
          target.scrollIntoView({ block: 'start', behavior: 'instant' });
          finish();
        }
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        finish();
      }
    };

    apply();
    // Some destinations mount before their content reaches the saved height.
    if (pending) {
      const root = document.getElementById('root') ?? document.body;
      resizeObserver = new ResizeObserver(apply);
      resizeObserver.observe(root);
      mutationObserver = new MutationObserver(apply);
      mutationObserver.observe(root, { childList: true, subtree: true });
      timeout = window.setTimeout(finish, 10000);
    }

    // User input takes precedence over a delayed restoration.
    const onInput = () => { if (pending) finish(); else remember(); };
    window.addEventListener('scroll', remember, { passive: true });
    window.addEventListener('popstate', remember);
    window.addEventListener('pagehide', remember);
    window.addEventListener('click', remember, true);
    const inputEvents = ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const;
    inputEvents.forEach(event => window.addEventListener(event, onInput, { passive: true, capture: true }));
    return () => {
      disconnect();
      window.removeEventListener('scroll', remember);
      window.removeEventListener('popstate', remember);
      window.removeEventListener('pagehide', remember);
      window.removeEventListener('click', remember, true);
      inputEvents.forEach(event => window.removeEventListener(event, onInput, true));
      // Do not read scrollY here: the destination may already have shortened the document.
    };
  };
}
