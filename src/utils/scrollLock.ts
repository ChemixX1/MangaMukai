let activeScrollLocks = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

export const lockPageScroll = () => {
  if (activeScrollLocks === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
  }

  activeScrollLocks += 1;
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeScrollLocks = Math.max(0, activeScrollLocks - 1);

    if (activeScrollLocks === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    }
  };
};
