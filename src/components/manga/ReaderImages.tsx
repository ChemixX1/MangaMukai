import { ReaderLoadingSkeleton } from './ReaderLoadingSkeleton';
import { useEffect, useRef, useState } from 'react';
import { READER_IMAGE_BATCH } from '../../services/readerPrefetchSession';

type Page = { id: string; image_url: string; page_number: number };
type SizedPage = Page & { width: number; height: number; failed: boolean };

export function ReaderImages({ images, title, onComplete }: {
  images: Page[];
  title?: string;
  onComplete: () => void;
}) {
  const [pages, setPages] = useState<SizedPage[]>([]);
  const completeRef = useRef(onComplete);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  const manifest = JSON.stringify(images);
  useEffect(() => {
    const source: Page[] = JSON.parse(manifest);
    let active = true;
    const pending = new Set<() => void>();
    setPages([]);
    const load = (page: Page) => new Promise<SizedPage>(resolve => {
      const image = new Image();
      let settled = false;
      const finish = (failed: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        pending.delete(cancel);
        resolve({ ...page, width: image.naturalWidth || 800, height: image.naturalHeight || 240, failed });
      };
      const cancel = () => { finish(true); image.removeAttribute('src'); };
      const timer = window.setTimeout(cancel, 30000);
      pending.add(cancel);
      image.onload = () => { void image.decode().catch(() => undefined).then(() => finish(false)); };
      image.onerror = () => finish(true);
      image.src = page.image_url;
    });
    void (async () => {
      for (let start = 0; start < source.length && active; start += READER_IMAGE_BATCH) {
        const batch = await Promise.all(source.slice(start, start + READER_IMAGE_BATCH).map(load));
        if (!active) return;
        setPages(current => [...current, ...batch]);
      }
      if (active) completeRef.current();
    })();
    return () => { active = false; pending.forEach(cancel => cancel()); };
  }, [manifest]);

  return <div className="reader-strip">
    {pages.map((page) => page.failed ? (
      <div key={page.id} className="grid min-h-60 w-full place-items-center text-sm text-ink/60" role="status">No se pudo cargar la página {page.page_number}.</div>
    ) : (
      <img key={page.id} src={page.image_url}
        alt={title ? `${title} — página ${page.page_number}` : `Página ${page.page_number}`}
        width={page.width} height={page.height}
        className="m-0 block h-auto w-full shrink-0 select-none p-0"
        decoding="sync" draggable={false} />
    ))}
    {pages.length < images.length && <ReaderLoadingSkeleton />}
  </div>;
}
