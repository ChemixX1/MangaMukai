import { useLayoutEffect, useRef } from 'react';

/**
 * Encoge (con `transform: scale`) el contenido de una fila cuando pide más
 * ancho del que hay, de modo que "Cap 100 · GRATIS · 2 Meses" siga entrando en
 * su sitio sin descuadrar nada. Con espacio de sobra no toca nada: el tamaño
 * actual se conserva.
 */
export const useFitScale = <Outer extends HTMLElement, Inner extends HTMLElement>() => {
  const outerRef = useRef<Outer>(null);
  const innerRef = useRef<Inner>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    let frame = 0;
    const fit = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const outerStyles = window.getComputedStyle(outer);
        const available = outer.clientWidth
          - Number.parseFloat(outerStyles.paddingLeft)
          - Number.parseFloat(outerStyles.paddingRight);
        const needed = inner.scrollWidth;
        // Margen de 1,5 px: los redondeos de layout no deben provocar escalas
        // casi imperceptibles que dejen los separadores de 1 px borrosos.
        const scale = available > 0 && needed > available + 1.5 ? available / needed : 1;
        inner.style.transform = scale < 1 ? `scale(${scale.toFixed(4)})` : '';
        inner.style.transformOrigin = 'center center';
      });
    };

    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    observer.observe(inner);
    fit();
    void document.fonts?.ready.then(fit);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });

  return { outerRef, innerRef };
};
