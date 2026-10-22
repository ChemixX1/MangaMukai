import { useEffect, useState } from 'react';

/** Visual feedback only: never controls requests, image batches or prefetch. */
export function ReaderLoadingSkeleton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 350);
    return () => window.clearTimeout(timer);
  }, []);
  return <div className="min-h-60 w-full" role="status" aria-label="Cargando páginas" aria-busy="true">
    {visible && <div aria-hidden="true" className="mx-auto w-full space-y-4 p-4 motion-safe:animate-pulse">
      <div className="h-4 w-1/3 rounded bg-zinc-400/20" />
      <div className="h-[55vh] min-h-60 w-full rounded-lg bg-zinc-400/15" />
      <div className="h-3 w-2/3 rounded bg-zinc-400/20" />
    </div>}
  </div>;
}
