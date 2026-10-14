import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, ShoppingBag, X } from 'lucide-react';
import { calculateMangaRewardProgress, getCompletedRewardChapterIds, subscribeMangaRewardProgress } from '../../services/mangaRewardProgress';
import { lockPageScroll } from '../../utils/scrollLock';
import { RewardTreasure } from './RewardTreasure';
import { RewardCoinIcon } from './RewardCoin';
import { MangaProgressMeter } from './MangaProgressMeter';
import '../../styles/manga-rewards.css';

interface MangaRewardProgressProps {
  mangaId: string;
  chapterIds: number[];
  purchasedIds: Set<string>;
  userId: string;
  cover: string;
  loading?: boolean;
  forceDark?: boolean;
}

const pointsFormat = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });

export const MangaRewardProgress = ({ mangaId, chapterIds, purchasedIds, userId, cover, loading = false, forceDark = false }: MangaRewardProgressProps) => {
  const [open, setOpen] = useState(false);
  const [, setRevision] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reducedMotion = useReducedMotion();

  useEffect(() => subscribeMangaRewardProgress(() => setRevision(value => value + 1)), []);

  const seriesIds = new Set(chapterIds.map(String));
  const completed = userId ? getCompletedRewardChapterIds(userId, mangaId) : new Set<string>();
  const progress = calculateMangaRewardProgress(
    userId ? [...purchasedIds].filter(id => seriesIds.has(id)) : [],
    [...completed].filter(id => seriesIds.has(id)),
  );

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    dialog.showModal();
    const unlock = lockPageScroll();
    return () => { dialog.close(); unlock(); };
  }, [open]);

  const label = loading ? 'Cargando avance…' : `${pointsFormat.format(progress.points)} / ${progress.target} puntos`;

  return (
    <>
      <button
        type="button"
        className="manga-reward-banner"
        aria-haspopup="dialog"
        aria-label={`Ver Recompensas Mukai. ${label}`}
        onClick={() => setOpen(true)}
      >
        <span className="manga-reward-summary">
          <span className="manga-reward-heading">Recompensas Mukai</span>
          <MangaProgressMeter className="manga-reward-meter" percent={progress.percent} loading={loading} />
        </span>
        <span className="manga-reward-art"><RewardTreasure cycling={!open} /></span>
      </button>

      {createPortal(
        <dialog ref={dialogRef} className={`manga-reward-dialog${forceDark ? ' theme-dark' : ''}`} aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          {open && <motion.div className="manga-reward-modal" initial={reducedMotion ? false : { opacity: 0, y: 16, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .3, ease: 'easeOut' }}>
            <button type="button" className="manga-reward-close" aria-label="Cerrar recompensas" onClick={() => setOpen(false)} autoFocus><X size={20} /></button>
            <div className="manga-reward-modal-hero">
              <div className="manga-reward-hero-art"><RewardTreasure coupon={false} open /></div>
              <h2 id={titleId}>Recompensas Mukai</h2>
              <p>Compra capítulos, lee y disfruta de beneficios.</p>
            </div>
            <div className="manga-reward-modal-progress">
              <div><strong>{label}</strong>{!loading && userId && <span>{progress.percent === 100 ? 'Meta alcanzada' : `${Math.round(progress.percent)}%`}</span>}</div>
              <MangaProgressMeter className="manga-reward-meter" percent={progress.percent} loading={loading} label="Avance hacia el cofre" />
              <div className="manga-reward-contributions"><span title={`${progress.purchasedCount} capítulos comprados`}><ShoppingBag size={15} />Compra <b>+1</b></span><span title={`${progress.completedCount} capítulos terminados`}><BookOpen size={15} />Lectura completa <b>+0,5</b></span></div>
            </div>
            <p className="manga-reward-prizes-title">Un vistazo a los premios</p>
            <div className="manga-reward-prizes">
              <article><div className="manga-reward-ticket">−50%<span>CAPÍTULOS</span></div><h3>Descuentos</h3></article>
              <article><div className="manga-reward-bonus"><RewardCoinIcon /></div><h3>Monedas</h3></article>
              <article><div className="manga-reward-collectible"><span /><img src={cover} alt="" /></div><h3>Coleccionables</h3></article>
            </div>
            <p className="manga-reward-preview-note">Premios de muestra · Canje aún no disponible.</p>
            <details className="manga-reward-rules"><summary>Cómo se guarda mi avance</summary><p>Cada compra y lectura completa cuenta una vez por capítulo. Las lecturas se guardan en este dispositivo.</p></details>
          </motion.div>}
        </dialog>, document.body,
      )}
    </>
  );
};
