import { ChevronIcon } from '../ui';

interface HomePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scrollTargetId: string;
}

/** Cinco casillas estables, con la página activa en negro como en el diseño de PC. */
export const HomePagination = ({ currentPage, totalPages, onPageChange, scrollTargetId }: HomePaginationProps) => {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const selectPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    requestAnimationFrame(() => document.getElementById(scrollTargetId)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    }));
  };

  return (
    <nav className="home-pagination" aria-label="Paginación">
      <button type="button" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => selectPage(currentPage - 1)}>
        <ChevronIcon size={31} strokeWidth={2} />
      </button>
      {Array.from({ length: 5 }, (_, index) => start + index).map((page) => (
        <button
          key={page}
          type="button"
          className="home-pagination-number"
          aria-label={page <= totalPages ? `Página ${page}` : `Página ${page} no disponible`}
          aria-current={page === currentPage ? 'page' : undefined}
          disabled={page > totalPages}
          onClick={() => selectPage(page)}
        >{page}</button>
      ))}
      <button type="button" aria-label="Página siguiente" disabled={currentPage >= totalPages} onClick={() => selectPage(currentPage + 1)}>
        <ChevronIcon size={31} strokeWidth={2} className="rotate-180" />
      </button>
    </nav>
  );
};
