import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowRight, BookOpen, ShoppingBag, X } from 'lucide-react';
import rewardLock from '../../assets/manga/reward-lock.svg';
import rewardClaimed from '../../assets/manga/reward-claimed.svg';
import rewardCoins from '../../assets/manga/reward-coins.svg';
import rewardDiscount from '../../assets/manga/reward-discount.svg';
import rewardCover from '../../assets/manga/reward-cover.svg';
import { calculateMangaRewardProgress, getCompletedRewardChapterIds, subscribeMangaRewardProgress } from '../../services/mangaRewardProgress';
import { lockPageScroll } from '../../utils/scrollLock';
import '../../styles/manga-rewards.css';

interface MangaRewardProgressProps {
  mangaId: string;
  chapterIds: number[];
  purchasedIds: Set<string>;
  userId: string;
  cover: string;
  /** Confirmed claims for this user and manga; reaching a level does not imply a claim. */
  claimedLevels?: ReadonlySet<number>;
  loading?: boolean;
  forceDark?: boolean;
}

const pointsFormat = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
const prizes = [
  { title: '200 Coins', caption: '', kind: 'coins' },
  { title: 'Descuento', caption: '', kind: 'discount' },
  { title: 'Portada', caption: '', kind: 'cover' },
] as const;

const revealEase = [.22, 1, .36, 1] as const;
const revealItemMotion: Variants = {
  hidden: { opacity: 0, y: 14 },
  enter: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: .6, delay, ease: revealEase } }),
  exit: { opacity: 0, y: -6, transition: { duration: .18, ease: 'easeIn' } },
};
const reducedRevealMotion: Variants = {
  hidden: { opacity: 1 },
  enter: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};
// Fixed trajectories keep the celebration stable through progress updates.
const revealParticles = Array.from({ length: 14 }, (_, index) => {
  const angle = index * Math.PI * 2 / 14;
  const radius = 106 + index % 3 * 24;
  return {
    '--particle-x': `${Math.cos(angle) * radius}px`,
    '--particle-y': `${Math.sin(angle) * radius * .78}px`,
    '--particle-delay': `${.18 + index % 5 * .045}s`,
    '--particle-turn': `${index % 2 ? 110 : -80}deg`,
  } as CSSProperties;
});

function RewardRoad({ points, target, loading, claimedLevels, onSelect }: { points: number; target: number; loading: boolean; claimedLevels?: ReadonlySet<number>; onSelect: (level: number, reached: boolean) => void }) {
  // Keep the current level in view, revealing one new reward as the reader advances.
  const firstLevel = Math.max(1, Math.floor(points / target));
  const startPoints = (firstLevel - 1) * target;
  const percent = Math.min(100, Math.max(0, (points - startPoints) / (target * 3) * 100));
  return <span className="reward-road" aria-busy={loading}>
    <span className="reward-road-prizes">
      {Array.from({ length: 3 }, (_, index) => {
        const level = firstLevel + index;
        const prize = prizes[(level - 1) % prizes.length];
        const claimed = !loading && claimedLevels?.has(level) === true;
        const reached = !loading && (claimed || points >= level * target);
        const current = !loading && !reached && points >= (level - 1) * target;
        const status = loading ? 'Cargando avance' : claimed ? 'Recompensa cobrada' : reached ? 'Recompensa desbloqueada, pendiente de cobro' : 'Nivel bloqueado. Ver progreso';
        return <span key={level} className={`reward-road-stop${current ? ' is-current' : ''}${reached ? ' is-reached' : ''}${claimed ? ' is-claimed' : ''}`}>
          <button type="button" className={`reward-road-card reward-road-card--${prize.kind}`} disabled={loading} aria-label={`${prize.title}, nivel ${level}. ${status}`} aria-haspopup="dialog" onClick={() => onSelect(level, reached)}>
            <span className="reward-road-card-back" aria-hidden="true" />
            <span className="reward-road-card-base" aria-hidden="true" />
            {!loading && !reached && <span className="reward-road-status" aria-hidden="true"><img src={rewardLock} alt="" draggable={false} /></span>}
            {claimed && <span className="reward-road-status reward-road-status--claimed" aria-hidden="true"><img src={rewardClaimed} alt="" draggable={false} /></span>}
            <span className={`reward-road-art reward-road-art--${prize.kind}`}>
              {prize.kind === 'coins' && <img src={rewardCoins} alt="" draggable={false} />}
              {prize.kind === 'discount' && <img src={rewardDiscount} alt="" draggable={false} />}
              {prize.kind === 'cover' && <img src={rewardCover} alt="" draggable={false} />}
            </span>
            <span className="reward-road-name"><strong className={prize.kind === 'coins' ? 'reward-road-amount' : prize.kind === 'discount' ? 'reward-road-discount-name' : undefined} aria-label={prize.kind === 'coins' ? '200 monedas' : undefined}>{prize.title}</strong>{prize.caption && <small>{prize.caption}</small>}</span>
          </button>
          <span className="reward-road-level">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <path d="M2 19.2L3.8 21M4.7 13.8L5.6 17.4M5.6 17.4L9.2 18.3M5.6 17.4L2.9 20.1M16.4 3.9L7.4 12.9L7.85 15.15L10.1 15.6L19.1 6.6L20 3L16.4 3.9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 19.2L20.2 21M19.3 13.8L18.4 17.4M18.4 17.4L21.1 20.1M18.4 17.4L16.6 17.85L14.8 18.3M9.3 11L4.9 6.6L4 3L7.6 3.9L12 8.3M12.1 13.8L13.9 15.6L16.15 15.15L16.6 12.9L14.8 11.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="reward-road-level-label">Nivel {level}</span>
          </span>
        </span>;
      })}
    </span>
    <span className="reward-road-meter-area">
      <span className="reward-road-meter" role="progressbar" aria-label="Progreso de los niveles de recompensa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loading ? undefined : percent} aria-busy={loading}>
        <span className="reward-road-meter-fill" style={{ width: `${percent}%`, opacity: loading ? .45 : 1 }} />
      </span>
    </span>
  </span>;
}

export const MangaRewardProgress = ({ mangaId, chapterIds, purchasedIds, userId, claimedLevels, loading = false, forceDark = false }: MangaRewardProgressProps) => {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [revealLevel, setRevealLevel] = useState<number | null>(null);
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
  useLayoutEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const { scrollX, scrollY } = window;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockPageScroll();
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('.manga-reward-close')?.focus({ preventScroll: true });
    // Native dialog focus and scroll locking can move the underlying page.
    window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    return () => {
      dialog.close();
      unlock();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    };
  }, [open]);
  useLayoutEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLButtonElement>('.manga-reward-close')?.focus({ preventScroll: true });
  }, [open, revealLevel]);
  // Keep the native focus trap and scroll lock until the exit has finished.
  const requestClose = () => setClosing(true);
  const finishClose = (animation: unknown) => {
    if (animation === 'exit') setOpen(false);
  };
  const itemMotion = reducedMotion ? reducedRevealMotion : revealItemMotion;
  const label = loading ? 'Cargando avance…' : `${pointsFormat.format(progress.points)} puntos`;
  const roadProps = { points: progress.points, target: progress.target, loading, claimedLevels, onSelect: (level: number, reached: boolean) => {
    if (closing && open) return;
    setClosing(false);
    setRevealLevel(reached ? level : null);
    setOpen(true);
  } };
  const revealedPrize = revealLevel === null ? null : prizes[(revealLevel - 1) % prizes.length];
  const revealedClaimed = revealLevel !== null && claimedLevels?.has(revealLevel) === true;
  const revealedImage = revealedPrize?.kind === 'coins' ? rewardCoins : revealedPrize?.kind === 'discount' ? rewardDiscount : rewardCover;
  return <>
    <div className="manga-reward-banner" role="group" aria-label={`Premios por nivel. ${label}`}>
      <RewardRoad {...roadProps} />
    </div>
    {createPortal(
      <dialog ref={dialogRef} className={`manga-reward-dialog${forceDark ? ' theme-dark' : ''}${revealedPrize ? ' is-revealing' : ''}${closing ? ' is-closing' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); requestClose(); }} onClose={event => { if (!event.currentTarget.open) { setOpen(false); setRevealLevel(null); } }} onClick={event => { if (event.target === event.currentTarget) requestClose(); }}>
        {open && revealedPrize && <motion.div
          className="reward-reveal"
          initial="hidden"
          animate={closing ? 'exit' : 'enter'}
          variants={reducedMotion ? reducedRevealMotion : {
            hidden: { opacity: 0 },
            enter: { opacity: 1, transition: { duration: .32, ease: revealEase } },
            exit: { opacity: 0, transition: { duration: .24, ease: 'easeInOut' } },
          }}
          onAnimationComplete={finishClose}
          onClick={event => { if (event.target === event.currentTarget) requestClose(); }}
        >
          <div className="reward-reveal-ambience" aria-hidden="true" />
          <button type="button" className="manga-reward-close" aria-label="Cerrar recompensa" onClick={requestClose}><X size={20} /></button>
          <div className="reward-reveal-content">
            <motion.p className="reward-reveal-eyebrow" variants={itemMotion} custom={.22}>
              <span className="reward-reveal-check" aria-hidden="true">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                  <motion.path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" variants={reducedMotion ? {} : {
                    hidden: { pathLength: 0 },
                    enter: { pathLength: 1, transition: { delay: .48, duration: .4, ease: 'easeOut' } },
                  }} />
                </svg>
              </span>
              <span><small>Recompensa · Nivel {revealLevel}</small><strong>Premio {revealedClaimed ? 'cobrado' : 'desbloqueado'}</strong></span>
            </motion.p>
            <div className="reward-reveal-main">
              <div className="reward-reveal-stage">
                <div className="reward-reveal-halo" aria-hidden="true" />
                <div className="reward-reveal-ring" aria-hidden="true" />
                <div className="reward-reveal-particles" aria-hidden="true">
                  {revealParticles.map((style, index) => <span key={index} style={style} />)}
                </div>
                <motion.div className="reward-reveal-prize-wrap" variants={reducedMotion ? reducedRevealMotion : {
                  hidden: { opacity: 0, y: 42, scale: .78, rotate: -6 },
                  enter: { opacity: 1, y: 0, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 150, damping: 19, mass: .85, delay: .1, opacity: { duration: .3, delay: .1 } } },
                  exit: { opacity: 0, y: -10, scale: .96, transition: { duration: .2 } },
                }}>
                  <img className="reward-reveal-prize" src={revealedImage} alt="" draggable={false} />
                </motion.div>
              </div>
              <motion.h2 id={titleId} variants={itemMotion} custom={.36}>{revealedPrize.title}</motion.h2>
              <motion.p className="reward-reveal-note" variants={itemMotion} custom={.44}>Disfruta de tus capítulos favoritos y sigue sumando puntos para desbloquear más recompensas.</motion.p>
            </div>
            <motion.div className="reward-reveal-action" variants={itemMotion} custom={.54}>
              <motion.button type="button" className="reward-reveal-continue" onClick={requestClose} whileHover={reducedMotion ? undefined : { y: -2 }} whileTap={reducedMotion ? undefined : { scale: .97 }} transition={{ duration: .18 }}>
                Continuar <ArrowRight size={17} aria-hidden="true" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>}
        {open && !revealedPrize && <motion.div className="manga-reward-modal" initial="hidden" animate={closing ? 'exit' : 'enter'} variants={reducedMotion ? reducedRevealMotion : {
          hidden: { opacity: 0, y: 16, scale: .96 },
          enter: { opacity: 1, y: 0, scale: 1, transition: { duration: .3, ease: revealEase } },
          exit: { opacity: 0, y: 8, scale: .98, transition: { duration: .2 } },
        }} onAnimationComplete={finishClose}>
          <button type="button" className="manga-reward-close" aria-label="Cerrar recompensas" onClick={requestClose}><X size={20} /></button>
          <h2 id={titleId}>Recompensas Mukai</h2>
          <RewardRoad {...roadProps} />
          <div className="manga-reward-progress-copy"><strong>{label}</strong><span>{progress.target} puntos por nivel</span></div>
          <div className="manga-reward-contributions"><span title={`${progress.purchasedCount} capítulos comprados`}><ShoppingBag size={19} />Compra <b>+1</b></span><span title={`${progress.completedCount} capítulos terminados`}><BookOpen size={19} />Lectura completa <b>+0,5</b></span></div>
        </motion.div>}
      </dialog>, document.body,
    )}
  </>;
};
