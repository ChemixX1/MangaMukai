import { useEffect, useState } from 'react';

export const useHideOnScrollDown = () => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const scrollY = () => Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight - window.innerHeight));
    let lastY = scrollY();
    const onScroll = () => {
      const currentY = scrollY();
      const delta = currentY - lastY;
      if (Math.abs(delta) < 6) return;
      lastY = currentY;
      setHidden(currentY > 90 && delta > 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
};
