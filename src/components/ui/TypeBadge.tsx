import { typeBadgeColor, type Accent } from './accent';

interface TypeBadgeProps {
  type: string;
  accent: Accent;

  className?: string;
}

export const TypeBadge = ({ type, accent, className = '' }: TypeBadgeProps) => (
  <span
    className={`inline-flex items-center justify-center whitespace-nowrap font-montserrat font-black uppercase leading-none text-white ${className}`}
    style={{ backgroundColor: typeBadgeColor(type, accent) }}
  >
    {type}
  </span>
);
