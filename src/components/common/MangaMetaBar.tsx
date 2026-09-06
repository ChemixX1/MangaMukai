import { useLayoutEffect, useRef } from 'react';
import { BookOpen, CalendarDays, Flame } from 'lucide-react';
import { DetailCoin3DIcon, DetailTicket3DIcon } from './MangaDetailIcons';

interface MangaMetaBarProps {
  chapter: number | string;
  isFree: boolean;
  date: string;
  accentClassName?: string;
  className?: string;
  // Cuando es true, todos los datos (CH, Gratis/Pago y fecha) usan el color de acento.
  accentAll?: boolean;
  /** Color del ticket de "Gratis": rosa por defecto o celeste para las secciones de hombres. */
  ticketTone?: 'pink' | 'blue';
}

export const MangaMetaBar = ({
  chapter,
  isFree,
  date,
  accentClassName = 'text-[#FF4D88]',
  className = '',
  accentAll = false,
  ticketTone = 'pink',
}: MangaMetaBarProps) => {
  const blueTicket = accentAll || ticketTone === 'blue';
  const isNew = date.trim().toLowerCase() === 'new';
  const rowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const content = contentRef.current;
    if (!row || !content) return;

    let frame = 0;
    const fitContent = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rowStyles = window.getComputedStyle(row);
        const preferredSize = Math.min(12, Math.max(10, row.clientWidth / 15.5));
        const minimumSize = 7.5;
        const rightLimit = row.getBoundingClientRect().right
          - Number.parseFloat(rowStyles.paddingRight)
          + 0.5;
        const leftLimit = row.getBoundingClientRect().left
          + Number.parseFloat(rowStyles.paddingLeft)
          - 0.5;
        const firstGroup = content.firstElementChild as HTMLElement | null;
        const lastGroup = content.lastElementChild as HTMLElement | null;

        content.style.letterSpacing = '0.04em';
        const fitsAt = (fontSize: number) => {
          content.style.fontSize = `${fontSize}px`;
          return (!firstGroup || firstGroup.getBoundingClientRect().left >= leftLimit)
            && (!lastGroup || lastGroup.getBoundingClientRect().right <= rightLimit);
        };
        const findLargestSize = () => {
          if (fitsAt(preferredSize)) return preferredSize;

          let lower = minimumSize;
          let upper = preferredSize;
          for (let iteration = 0; iteration < 7; iteration += 1) {
            const candidate = (lower + upper) / 2;
            if (fitsAt(candidate)) lower = candidate;
            else upper = candidate;
          }
          return lower;
        };

        let fittedSize = findLargestSize();
        if (!fitsAt(fittedSize) && fittedSize <= minimumSize) {
          content.style.letterSpacing = '0';
          fittedSize = findLargestSize();
        }
        content.style.fontSize = `${fittedSize.toFixed(2)}px`;
      });
    };

    const observer = new ResizeObserver(fitContent);
    observer.observe(row);
    fitContent();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [chapter, date, isFree]);

  return (
    <div
      ref={rowRef}
      className={`home-card-slot-row home-theme-surface-alt flex min-h-9 min-w-0 items-center justify-center overflow-hidden border-t border-white/5 bg-[#1a1a1a] px-1.5 py-2 font-[900] uppercase md:px-2 ${className}`}
    >
      <div ref={contentRef} className="flex w-max max-w-full items-center justify-center gap-[0.45em] whitespace-nowrap leading-none">
        <div className={`flex shrink-0 items-center gap-[0.3em] ${accentClassName}`}>
          <BookOpen className="h-[1.05em] w-[1.05em] shrink-0" strokeWidth={3} />
          <span>CH {chapter}</span>
        </div>

        <div className="home-card-slot-divider h-[1em] w-px shrink-0 bg-white/20" />

        <div className={`flex shrink-0 items-center gap-[0.3em] ${accentAll ? accentClassName : isFree ? (ticketTone === 'blue' ? 'text-[#00C2FF]' : 'text-white') : 'text-yellow-400'}`}>
          {isFree ? (
            <DetailTicket3DIcon
              size={21}
              className={`-my-1 h-[21px] w-[21px] shrink-0 scale-110 object-contain ${blueTicket ? 'hue-rotate-[215deg] saturate-[1.15] drop-shadow-[0_4px_5px_rgba(6,140,190,0.3)]' : 'drop-shadow-[0_4px_5px_rgba(180,83,9,0.22)]'}`}
            />
          ) : (
            <DetailCoin3DIcon
              size={21}
              className="-my-1 h-[21px] w-[21px] shrink-0 scale-110 object-contain drop-shadow-[0_4px_5px_rgba(180,83,9,0.3)]"
            />
          )}
          <span>{isFree ? 'Gratis' : 'Pago'}</span>
        </div>

        <div className="home-card-slot-divider h-[1em] w-px shrink-0 bg-white/20" />

        <div className={`flex shrink-0 items-center gap-[0.3em] ${accentAll || isNew ? accentClassName : 'text-gray-300'}`}>
          {isNew ? (
            <Flame className="h-[1.05em] w-[1.05em] shrink-0" fill="currentColor" />
          ) : (
            <CalendarDays className="h-[1.05em] w-[1.05em] shrink-0" />
          )}
          <span>{isNew ? 'New' : date}</span>
        </div>
      </div>
    </div>
  );
};
