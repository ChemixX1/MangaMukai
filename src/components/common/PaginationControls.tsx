import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  accent: 'pink' | 'blue';
  scrollTargetId: string;
  theme?: 'light' | 'dark';
}

const accentStyles = {
  pink: {
    lightActive: 'border-[#FF4D88] bg-[#FF4D88] text-black',
    lightHover: 'hover:border-[#FF4D88]/70 hover:bg-[#fff3f7]',
    darkActive: 'border-[#FF4D88] bg-[#18181b] text-white shadow-[0_0_0_1px_rgba(255,77,136,.2)]',
    darkHover: 'hover:border-[#FF4D88]/70 hover:bg-[#201319]',
  },
  blue: {
    lightActive: 'border-[#00C2FF] bg-[#00C2FF] text-black',
    lightHover: 'hover:border-[#00C2FF]/70 hover:bg-[#effbff]',
    darkActive: 'border-[#00C2FF] bg-[#18181b] text-white shadow-[0_0_0_1px_rgba(0,194,255,.2)]',
    darkHover: 'hover:border-[#00C2FF]/70 hover:bg-[#102027]',
  },
};

export const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  accent,
  scrollTargetId,
  theme = 'light',
}: PaginationControlsProps) => {
  const styles = accentStyles[accent];
  const isDark = theme === 'dark';
  const hoverStyles = isDark ? styles.darkHover : styles.lightHover;
  const groupStart = Math.floor((currentPage - 1) / 3) * 3 + 1;
  const visiblePages = Array.from(
    { length: Math.min(3, Math.max(0, totalPages - groupStart + 1)) },
    (_, index) => groupStart + index,
  );

  const selectPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    window.requestAnimationFrame(() => {
      document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const navigationClass = `home-pagination-control home-pagination-nav group flex h-11 -skew-x-12 items-center justify-center border px-3 text-[9px] font-black uppercase tracking-[0.1em] transition-all disabled:cursor-not-allowed disabled:opacity-25 sm:px-5 sm:text-[10px] sm:tracking-[0.16em] ${isDark ? 'border-white/15 bg-[#151518] text-white' : 'border-black/10 bg-white text-black'} ${hoverStyles}`;

  return (
    <nav className="home-pagination mt-12 flex items-center justify-center gap-2 sm:gap-3" aria-label="Paginación de actualizaciones" data-accent={accent}>
      <button
        type="button"
        onClick={() => selectPage(currentPage - 1)}
        disabled={currentPage === 1}
        className={navigationClass}
        aria-label="Página anterior"
      >
        <span className="flex skew-x-12 items-center gap-1.5">
          <ChevronLeft size={14} strokeWidth={3} />
          <span>Atrás</span>
        </span>
      </button>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {visiblePages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => selectPage(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={`Página ${page}`}
            data-active={page === currentPage}
            className={`home-pagination-control home-pagination-page grid h-10 w-10 -skew-x-12 place-items-center border text-[11px] font-black text-black transition-all ${
              page === currentPage
                ? (isDark ? styles.darkActive : styles.lightActive)
                : `${isDark ? 'border-white/15 bg-[#151518] text-white' : 'border-black/10 bg-white text-black'} ${hoverStyles}`
            }`}
          >
            <span className="skew-x-12">{page}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => selectPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={navigationClass}
        aria-label="Página siguiente"
      >
        <span className="flex skew-x-12 items-center gap-1.5">
          <span>Siguiente</span>
          <ChevronRight size={14} strokeWidth={3} />
        </span>
      </button>
    </nav>
  );
};
