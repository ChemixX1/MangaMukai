import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { lockPageScroll } from '../../utils/scrollLock';

const CLOSE_DURATION = 420;

export const SlidePanel = ({ open, from, size = 'full', scrollable = true, blurBackdrop = false, animateOnOpen = false, isLight, label, onClose, children }: {
  open: boolean;
  from: 'left' | 'right';
  size?: 'full' | 'half' | 'wide' | 'compact' | 'profile';
  scrollable?: boolean;
  blurBackdrop?: boolean;
  animateOnOpen?: boolean;
  isLight: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  const location = useLocation();
  const [rendered, setRendered] = useState(open);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      const unlockScroll = lockPageScroll();
      let frame = 0;
      if (animateOnOpen) {
        // Paint the mounted panel off-screen before starting the opening transition.
        frame = window.requestAnimationFrame(() => {
          frame = window.requestAnimationFrame(() => setEntered(true));
        });
      }
      return () => {
        window.cancelAnimationFrame(frame);
        unlockScroll();
      };
    }
    setEntered(false);
    const timer = window.setTimeout(() => setRendered(false), CLOSE_DURATION);
    return () => window.clearTimeout(timer);
  }, [animateOnOpen, open]);

  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (pathnameRef.current !== location.pathname) {
      pathnameRef.current = location.pathname;
      if (open) onClose();
    }
  }, [location.pathname, onClose, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  const hidden = from === 'left' ? '-translate-x-full' : 'translate-x-full';
  const visible = open && (!animateOnOpen || entered);
  const shadow = from === 'left' ? 'shadow-[16px_0_40px_rgba(0,0,0,0.25)]' : 'shadow-[-16px_0_40px_rgba(0,0,0,0.25)]';
  const frame = size === 'full' ? 'inset-0' : `inset-y-0 ${size === 'compact' ? 'w-[440px] max-w-full' : size === 'profile' ? 'w-[62vw] lg:w-[320px]' : size === 'wide' ? 'w-[62vw]' : 'w-[50vw]'} ${from === 'left' ? 'left-0' : 'right-0'}`;

  if (!open && !rendered) return null;

  return (
    <>

      <div aria-hidden="true" onClick={onClose} className={`fixed inset-0 z-[119] bg-black/40 transition-[opacity,backdrop-filter] duration-[400ms] ${visible ? `opacity-100 ${blurBackdrop ? 'backdrop-blur-[5px]' : ''}` : 'pointer-events-none opacity-0 backdrop-blur-none'}`} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={!open}
        className={`fixed ${frame} z-[120] flex flex-col ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'} overscroll-contain will-change-transform transition-transform duration-[400ms] ease-[cubic-bezier(.22,.9,.3,1)] ${shadow} ${isLight ? 'bg-white text-black' : 'bg-black text-white'} ${visible ? 'translate-x-0' : `pointer-events-none ${hidden}`}`}
      >
        {rendered && children}
      </div>
    </>
  );
};
