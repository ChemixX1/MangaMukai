import { useEffect } from 'react';
import { lockPageScroll } from '../../utils/scrollLock';

/** Símbolo de MangaMukai (tres trazos en diagonal). */
const MukaiMark = ({ size = 90 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 90 90" fill="none" aria-hidden="true">
    <path d="M13.1137 52.665L39.4462 26.3362C41.1979 24.6086 42.5886 22.5499 43.5375 20.28C44.4864 18.01 44.9746 15.5741 44.9737 13.1137C44.9701 8.2094 43.045 3.5017 39.6112 0L13.275 26.34C11.5245 28.0676 10.1347 30.1257 9.18645 32.395C8.23819 34.6643 7.75034 37.0993 7.75123 39.5587C7.75123 44.7075 9.81373 49.3088 13.1137 52.6688V52.665ZM76.89 37.2787L50.5537 63.6112C48.8032 65.3388 47.4135 67.397 46.4652 69.6663C45.5169 71.9355 45.0291 74.3706 45.03 76.83C45.03 81.93 47.0925 86.5838 50.3925 89.9438L76.725 63.6112C78.4783 61.8848 79.8701 59.8264 80.8192 57.5562C81.7682 55.2859 82.2555 52.8494 82.2525 50.3888C82.2525 45.24 80.19 40.6388 76.89 37.2787ZM76.725 26.3888C78.4779 24.6628 79.8694 22.605 80.8184 20.3354C81.7675 18.0658 82.255 15.63 82.2525 13.17C82.2525 8.07 80.19 3.42 76.89 0.05625L13.275 63.6188C9.76564 67.1013 7.77849 71.8321 7.74827 76.7761C7.71806 81.7201 9.64722 86.4748 13.1137 90L76.725 26.3888Z" fill="currentColor" />
  </svg>
);

/**
 * Pantalla "Volveremos pronto" (diseño de Figma sobre un marco de 384×956):
 * banda rosa arriba y negra abajo separadas por una diagonal a 30° (en ese
 * marco baja de 343 px a la derecha a 565 px a la izquierda), con el símbolo,
 * el logo y el texto en blanco montados sobre la diagonal. Tapa toda la
 * página. La muestran la portada cuando el servidor no responde y el
 * interruptor manual de `mantenimiento.json`.
 */
export const EmergencyScreen = ({ message = 'Volveremos pronto...' }: { message?: string }) => {
  useEffect(() => lockPageScroll(), []);

  // Los puntos suspensivos del mensaje se pintan aparte para animarlos (ver .emergency-dots en index.css).
  const text = message.replace(/[.…]+$/, '');
  const dots = text !== message;

  // La diagonal pasa por el centro horizontal al 47,5 % de alto y cae tan 30° ≈ 0,577 px por px de ancho.
  const edge = (side: 'left' | 'right') => `calc(47.5% ${side === 'left' ? '+' : '-'} 28.87vw)`;

  return (
    <div role="alert" aria-live="assertive" className="fixed inset-0 z-[150] overflow-hidden bg-white text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-pink-600" style={{ clipPath: `polygon(0 0, 100% 0, 100% ${edge('right')}, 0 ${edge('left')})` }} />
      {/* La banda negra arranca justo donde acaba la rosa: sin línea entre las dos. */}
      <div aria-hidden="true" className="absolute inset-0 bg-black" style={{ clipPath: `polygon(0 ${edge('left')}, 100% ${edge('right')}, 100% 100%, 0 100%)` }} />

      {/* Símbolo (334 px), logo (438 px) y texto (483 px) en el marco de 956 px de alto. */}
      <div className="absolute inset-x-0 top-[35%] flex flex-col items-center px-6">
        <MukaiMark size={90} />
        {/* Logo como en la cabecera: MANGA en blanco y MUKAI en el rosa de la marca (cae sobre la banda negra). */}
        <span className="mt-2 select-none whitespace-nowrap text-[46px] font-[1000] uppercase italic leading-none tracking-tighter">MANGA<span className="text-[#db2777]">MUKAI</span></span>
        <p className="font-[Montserrat] text-sm font-medium leading-4 tracking-tight">
          {text}
          {dots && <span className="emergency-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>}
        </p>
      </div>
    </div>
  );
};
