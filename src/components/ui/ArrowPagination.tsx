import { useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';

import { ACCENT_HEX, type Accent } from './accent';
import { ChevronIcon } from './icons';

const HEIGHT = 48;
const TIP = 16;
const CAP_RADIUS = HEIGHT / 2;
const SEGMENT_WIDTH = 64;
/** El hexágono central se abre hasta este ancho cuando su página es la seleccionada. */
const CENTER_OPEN_WIDTH = 96;
const OPEN_TRANSITION = { type: 'spring', stiffness: 260, damping: 26 } as const;

/**
 * Siluetas de la cadena, de izquierda a derecha:
 *  capLeft   ( atrás )   extremo izquierdo redondeado, muesca a la derecha
 *  arrowLeft (  1  )     punta a la izquierda, muesca a la derecha
 *  hexagon   (  2  )     punta a ambos lados
 *  arrowRight(  3  )     muesca a la izquierda, punta a la derecha
 *  capRight  (siguiente) muesca a la izquierda, extremo derecho redondeado
 * Cada muesca abraza la punta del tramo vecino.
 */
type Shape = 'capLeft' | 'arrowLeft' | 'hexagon' | 'arrowRight' | 'capRight';

const segmentPath = (width: number, shape: Shape) => {
  const w = width;
  const h = HEIGHT;
  const m = h / 2;
  const t = TIP;
  const r = CAP_RADIUS;
  switch (shape) {
    case 'capLeft':
      return `M${r},0 H${w} L${w - t},${m} L${w},${h} H${r} A${r},${r} 0 0 1 ${r},0 Z`;
    case 'arrowLeft':
      return `M${t},0 H${w} L${w - t},${m} L${w},${h} H${t} L0,${m} Z`;
    case 'hexagon':
      return `M${t},0 H${w - t} L${w},${m} L${w - t},${h} H${t} L0,${m} Z`;
    case 'arrowRight':
      return `M0,0 H${w - t} L${w},${m} L${w - t},${h} H0 L${t},${m} Z`;
    case 'capRight':
      return `M0,0 H${w - r} A${r},${r} 0 0 1 ${w - r},${h} H0 L${t},${m} Z`;
  }
};

interface SegmentProps {
  children: ReactNode;
  shape: Shape;
  disabled?: boolean;
  accentHex: string;
  gradientId: string;
  label: string;
  /** Página seleccionada: borde del color de la sección (y el hexágono se abre). */
  active?: boolean;
  onClick: () => void;
}

const Segment = ({ children, shape, disabled = false, accentHex, gradientId, label, active = false, onClick }: SegmentProps) => {
  const isCenter = shape === 'hexagon';
  const width = isCenter && active ? CENTER_OPEN_WIDTH : SEGMENT_WIDTH;
  const d = segmentPath(width, shape);
  return (
    <motion.button
      type="button"
      className="tap-transparent relative grid h-12 flex-none cursor-pointer place-items-center border-0 bg-transparent p-0 text-ink disabled:cursor-default disabled:opacity-45 data-[center=true]:z-[2] data-[center=true]:disabled:opacity-70 [&+&]:-ml-[9px] [&>span]:relative [&>span]:z-[1] [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:left-0 [&>svg]:top-0 [&>svg]:overflow-visible"
      data-center={isCenter}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      initial={false}
      animate={{ width }}
      transition={OPEN_TRANSITION}
    >
      {/* Lienzo fijo del ancho máximo: la silueta se dibuja en píxeles y se anima
          a la vez que el ancho del botón, sin deformarse. */}
      <svg viewBox={`0 0 ${CENTER_OPEN_WIDTH} ${HEIGHT}`} width={CENTER_OPEN_WIDTH} height={HEIGHT} aria-hidden="true">
        <motion.path
          className="[transition:stroke_0.3s_ease,stroke-width_0.3s_ease]"
          fill={`url(#${gradientId})`}
          stroke={active ? accentHex : 'var(--mm-pagination-edge)'}
          strokeWidth={active ? 2 : 1}
          strokeLinejoin="round"
          initial={false}
          animate={{ d }}
          transition={OPEN_TRANSITION}
        />
      </svg>
      <span>{children}</span>
    </motion.button>
  );
};

const SLOT_SHAPES: Shape[] = ['arrowLeft', 'hexagon', 'arrowRight'];

interface ArrowPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  accent: Accent;
  /** Bloque al que se vuelve al cambiar de página. */
  scrollTargetId: string;
  className?: string;
}

/**
 * Paginación del diseño: siempre cinco tramos encadenados (atrás · 1 · 2 · 3 ·
 * siguiente) con los extremos redondeados. La página seleccionada lleva el
 * borde del color de la sección y el número en negrita; el hexágono central va
 * pequeño y se abre cuando su página es la seleccionada. Con una sola página se
 * muestra igual, todo bloqueado.
 */
export const ArrowPagination = ({ currentPage, totalPages, onPageChange, accent, scrollTargetId, className = '' }: ArrowPaginationProps) => {
  const gradientId = `pagination-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const accentHex = ACCENT_HEX[accent];
  const pageCount = Math.max(1, totalPages);

  // Ventana fija de tres huecos alrededor de la actual (1-2-3, 4-5-6, …); los
  // huecos sin página quedan bloqueados para que el bloque no cambie de forma.
  const groupStart = Math.floor((currentPage - 1) / 3) * 3 + 1;
  const slots = [0, 1, 2].map((offset) => groupStart + offset);

  const selectPage = (page: number) => {
    if (page < 1 || page > pageCount || page === currentPage) return;
    onPageChange(page);
    window.requestAnimationFrame(() => {
      document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <nav className={`mx-auto flex h-24 w-80 max-w-full items-center justify-center ${className}`} aria-label="Paginación">
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--mm-pagination-start)" />
            <stop offset="0.48" stopColor="var(--mm-pagination-middle)" />
            <stop offset="1" stopColor="var(--mm-pagination-start)" />
          </linearGradient>
        </defs>
      </svg>

      <Segment shape="capLeft" accentHex={accentHex} gradientId={gradientId} label="Página anterior" disabled={currentPage <= 1} onClick={() => selectPage(currentPage - 1)}>
        <ChevronIcon size={22} />
      </Segment>

      {slots.map((page, index) => {
        const exists = page <= pageCount;
        const active = page === currentPage;
        return (
          <Segment
            key={page}
            shape={SLOT_SHAPES[index]}
            accentHex={accentHex}
            gradientId={gradientId}
            label={exists ? `Página ${page}` : 'Sin más páginas'}
            disabled={!exists}
            active={active}
            onClick={() => selectPage(page)}
          >
            {/* El número entra con un pequeño rebote al cambiar de página. */}
            <motion.span
              key={`${page}-${active}`}
              className={`block font-montserrat text-base leading-none text-ink ${active ? 'font-extrabold' : 'font-semibold'}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            >
              {page}
            </motion.span>
          </Segment>
        );
      })}

      <Segment shape="capRight" accentHex={accentHex} gradientId={gradientId} label="Página siguiente" disabled={currentPage >= pageCount} onClick={() => selectPage(currentPage + 1)}>
        <ChevronIcon size={22} className="rotate-180" />
      </Segment>
    </nav>
  );
};
