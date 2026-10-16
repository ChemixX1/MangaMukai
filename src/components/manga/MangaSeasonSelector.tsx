import { useLayoutEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockPageScroll } from '../../utils/scrollLock';
import '../../styles/manga-seasons.css';

const SeasonIcon = () => (
  <svg width="41" height="41" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20.5007 6.83334L6.83398 13.6667L20.5007 20.5L34.1673 13.6667L20.5007 6.83334Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.6673 23.9167L6.83398 27.3334L20.5007 34.1667L34.1673 27.3334L27.334 23.9167" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.6673 17.0833L6.83398 20.5L20.5007 27.3333L34.1673 20.5L27.334 17.0833" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MangaSeasonSelector = ({ cover, title, likeAction }: { cover: string; title: string; likeAction: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(1);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const labelClipId = useId();
  // Prototipo: ambas temporadas usan la portada actual hasta conectar WordPress.
  const seasons = [{ number: 1, cover, tone: 'orange' }, { number: 2, cover, tone: 'gold' }];
  const selectedTone = seasons.find(season => season.number === selected)!.tone;

  useLayoutEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const { scrollX, scrollY } = window;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockPageScroll();
    const restorePosition = () => window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    dialog.showModal();
    restorePosition();
    return () => {
      dialog.close();
      unlock();
      previousFocus?.focus({ preventScroll: true });
      restorePosition();
    };
  }, [open]);

  return <>
    <div className="manga-season-actions">
      <button type="button" className={`manga-season-trigger manga-season-tone--${selectedTone}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <SeasonIcon /><span>Temporada {selected}</span>
      </button>
      {likeAction}
    </div>
    {createPortal(
      <dialog ref={dialogRef} className={`manga-season-dialog manga-season-tone--${selectedTone}`} aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        {open && <section className="manga-season-panel">
          <svg width="0" height="0" aria-hidden="true" className="absolute">
            <defs>
              <clipPath id={labelClipId} clipPathUnits="objectBoundingBox">
                <path d="M .06 0 H .975 Q 1 0 1 .14 V .64 Q 1 .70 .99 .75 L .96 .95 Q .95 1 .93 1 H .025 Q 0 1 0 .86 V .36 Q 0 .30 .01 .25 L .04 .05 Q .05 0 .06 0 Z" />
              </clipPath>
            </defs>
          </svg>
          <button type="button" className="manga-season-close" aria-label="Cerrar temporadas" onClick={() => setOpen(false)}><X size={22} /></button>
          <h2 id={titleId} className="sr-only">Portadas por temporada</h2>

          <div className="manga-season-covers">
            {seasons.map(season => <button key={season.number} type="button" className={`manga-season-card manga-season-tone--${season.tone}`} aria-pressed={selected === season.number} onClick={() => { setSelected(season.number); setOpen(false); }}>
              <span className="manga-season-art"><img src={season.cover} alt={`Portada de ${title}, temporada ${season.number}`} /></span>
              <span className="manga-season-label" style={{ clipPath: `url(#${labelClipId})` }}>Temporada {season.number}</span>
            </button>)}
          </div>
        </section>}
      </dialog>, document.body,
    )}
  </>;
};
