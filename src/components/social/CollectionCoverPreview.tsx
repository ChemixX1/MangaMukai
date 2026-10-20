import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { lockPageScroll } from '../../utils/scrollLock';
import collectionCardBack from '../../assets/profile/collection-card-back.svg';
import collectionCardBackGold from '../../assets/profile/collection-card-back-gold.svg';

const HoloCard = lazy(() => import('../manga/HoloCard'));

export function CollectionCoverPreview({ cover, title, purchased = false }: { cover: string; title: string; purchased?: boolean }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const opener = trigger.current;
    if (!element) return;
    const unlock = lockPageScroll({ preservePosition: true });
    element.showModal();
    element.focus({ preventScroll: true });
    return () => {
      element.close();
      opener?.focus({ preventScroll: true });
      unlock();
    };
  }, [open]);

  useEffect(() => {
    if (!closing) return;

    const timeout = window.setTimeout(() => setOpen(false), 260);
    return () => window.clearTimeout(timeout);
  }, [closing]);

  return <>
    <button ref={trigger} type="button" className="profile-collection-preview" data-purchased={purchased || undefined} onClick={() => { setClosing(false); setOpen(true); }} aria-haspopup="dialog" aria-label={`Ampliar portada: ${title}`}>
      <span className="profile-collection-frame">
        <span className="profile-collection-art">
          <img src={cover} alt="" loading="eager" decoding="async" />
          <span className="profile-collection-preview-title">{title}</span>
        </span>
      </span>
    </button>
    <dialog ref={dialog} className="profile-cover-dialog" tabIndex={-1} data-closing={closing || undefined} data-purchased={purchased || undefined} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); setClosing(true); }} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setClosing(true); }}>
      {open && <section className="profile-cover-dialog-content" onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (closing) setOpen(false);
      }}>
        <Suspense fallback={<img src={cover} alt={title} className="profile-cover-dialog-art" style={{ width: '100%', aspectRatio: '63 / 88', objectFit: 'cover' }} />}>
        <HoloCard image={cover} imageFit="cover" backImage={purchased ? collectionCardBackGold : collectionCardBack}
          backContent={<div className="profile-collection-back-brand" aria-hidden="true">
            <span className="profile-collection-back-logo">MANGA<span className="text-mukai-magenta">MUKAI</span></span>
            <span className="profile-collection-back-signature" />
          </div>}
          alt={`Girar portada: ${title}`} preset={purchased ? 'gold' : 'rainbow'} intensity={0.65} tiltMax={20} hoverScale={1.04} frame={0} radius={0} className="profile-cover-dialog-art" />
        </Suspense>

        <h2 id={titleId}>{title}</h2>
      </section>}
    </dialog>
  </>;
}
