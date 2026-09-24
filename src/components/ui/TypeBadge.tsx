import { typeBadgeColor, type Accent } from './accent';

interface TypeBadgeProps {
  type: string;
  accent: Accent;
  /** Tamaño y posición (alto, cuerpo de letra, márgenes). */
  className?: string;
}

/** Etiqueta del tipo de obra (MANGA, MANHWA…): siempre en blanco sobre su color. */
export const TypeBadge = ({ type, accent, className = '' }: TypeBadgeProps) => (
  <span
    className={`inline-flex items-center justify-center whitespace-nowrap font-montserrat font-black uppercase leading-none text-white ${className}`}
    style={{ backgroundColor: typeBadgeColor(type, accent) }}
  >
    {type}
  </span>
);
