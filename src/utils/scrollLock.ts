let activeScrollLocks = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';
let savedPosition: { left: number; top: number } | null = null;
export const PAGE_SCROLL_LOCK_CHANGED_EVENT = 'mm_page_scroll_lock_changed';
export const isPageScrollLocked = () => activeScrollLocks > 0;

export const lockPageScroll = ({ preservePosition = false } = {}) => {
  if (activeScrollLocks === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    savedPosition = preservePosition ? { left: window.scrollX, top: window.scrollY } : null;
  }

  activeScrollLocks += 1;

  document.body.style.overflow = 'clip';
  document.documentElement.style.overflow = 'hidden';
  window.dispatchEvent(new Event(PAGE_SCROLL_LOCK_CHANGED_EVENT));

  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeScrollLocks = Math.max(0, activeScrollLocks - 1);

    if (activeScrollLocks === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      if (savedPosition) window.scrollTo({ ...savedPosition, behavior: 'instant' });
      savedPosition = null;
      window.dispatchEvent(new Event(PAGE_SCROLL_LOCK_CHANGED_EVENT));
    }
  };
};
