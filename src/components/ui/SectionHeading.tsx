import type { ReactNode } from 'react';

import { ACCENT_COLOR, type Accent } from './accent';

interface SectionHeadingProps {
  icon: ReactNode;
  /** Primera parte del título, en la tinta del tema. */
  lead: string;
  /** Palabra final, en el color de la sección ("Tendencia *Ahora*"). */
  highlight: string;
  accent: Accent;
  id?: string;
  className?: string;
}

/** Titular de sección de escritorio: el del diseño móvil (Dela Gothic One) a tamaño de PC. */
export const SectionHeading = ({ icon, lead, highlight, accent, id, className = '' }: SectionHeadingProps) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <span aria-hidden="true" className="grid shrink-0 place-items-center" style={{ color: ACCENT_COLOR[accent] }}>{icon}</span>
    <h2 id={id} className="font-dela text-[28px] font-normal leading-10 text-ink xl:text-[32px]">
      {lead} <span style={{ color: ACCENT_COLOR[accent] }}>{highlight}</span>
    </h2>
  </div>
);
