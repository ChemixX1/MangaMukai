import { useEffect, useState } from 'react';

export const useHideOnScrollDown = () => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;
      if (Math.abs(delta) < 6) return;
      lastY = currentY;
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      setHidden(currentY > 90 && delta > 0 && currentY < maxY - 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
};
