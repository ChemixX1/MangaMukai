import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 1023px)';

/** Por debajo de lg (móvil/tablet) las páginas con diseño propio usan su versión móvil. */
export const useIsMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return isMobile;
};
