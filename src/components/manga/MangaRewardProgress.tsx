import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Check, ShoppingBag, X } from 'lucide-react';
import rewardLock from '../../assets/manga/reward-lock.svg';
import rewardClaimed from '../../assets/manga/reward-claimed.svg';
import rewardCoins from '../../assets/manga/reward-coins.svg';
import rewardDiscount from '../../assets/manga/reward-discount.svg';
import rewardCover from '../../assets/manga/reward-cover.svg';
import collectionCardBack from '../../assets/profile/collection-card-back.svg';
import profileBanner from '../../assets/banners/illustration-anime-character-rain.jpg';
import HoloCard from './HoloCard';
import { getUltimosCapitulos } from '../../services/mangaService';
import { calculateMangaRewardProgress, getAccountCompletedRewardChapterIds, subscribeMangaRewardProgress } from '../../services/mangaRewardProgress';
import { lockPageScroll } from '../../utils/scrollLock';
import '../../styles/manga-rewards.css';

interface MangaRewardProgressProps {
  purchasedIds: Set<string>;
  userId: string;

  claimedLevels?: ReadonlySet<number>;
  loading?: boolean;
  forceDark?: boolean;
}

const pointsFormat = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
const prizes = [
  {
    title: '200 Coins',
    revealTitle: '200 Coins',
    revealNote: 'Sigue disfrutando de capítulos de pago y leyendo nuestro contenido para seguir ganando premios.',
    caption: '',
    kind: 'coins',
  },
  {
    title: 'Descuento',
    revealTitle: 'Descuento del 50%',
    revealNote: 'Disfruta de tus capítulos de pago con un descuento exclusivo por 24 Horas y sigue disfrutando del mejor contenido para ti',
    caption: '',
    kind: 'discount',
  },
  {
    title: 'Portada',
    revealTitle: 'Portada',
    revealNote: 'Sigue disfrutando de capítulos de pago y leyendo nuestro contenido para seguir ganando premios.',
    caption: '',
    kind: 'cover',
  },
] as const;

const revealSparkles = [
  { angle: -82, distance: 138, size: 15, delay: 0.14, duration: 1.35, star: true },
  { angle: -52, distance: 162, size: 9, delay: 0.2, duration: 1.5, star: false },
  { angle: -24, distance: 148, size: 17, delay: 0.12, duration: 1.4, star: true },
  { angle: 8, distance: 154, size: 10, delay: 0.24, duration: 1.45, star: false },
  { angle: 36, distance: 136, size: 14, delay: 0.17, duration: 1.3, star: true },
  { angle: 68, distance: 120, size: 8, delay: 0.28, duration: 1.5, star: false },
  { angle: 112, distance: 124, size: 13, delay: 0.22, duration: 1.4, star: true },
  { angle: 146, distance: 146, size: 9, delay: 0.16, duration: 1.35, star: false },
  { angle: 174, distance: 158, size: 16, delay: 0.13, duration: 1.45, star: true },
  { angle: -154, distance: 150, size: 10, delay: 0.26, duration: 1.5, star: false },
  { angle: -126, distance: 166, size: 14, delay: 0.18, duration: 1.38, star: true },
  { angle: -102, distance: 128, size: 8, delay: 0.3, duration: 1.42, star: false },
].map(sparkle => {
  const rad = (sparkle.angle * Math.PI) / 180;
  return {
    ...sparkle,
    x: `${Math.round(Math.cos(rad) * sparkle.distance)}px`,
    y: `${Math.round(Math.sin(rad) * sparkle.distance)}px`,
  };
});

function RewardRoad({ points, target, loading, claimedLevels, onSelect }: { points: number; target: number; loading: boolean; claimedLevels?: ReadonlySet<number>; onSelect: (level: number, reached: boolean) => void }) {

  const firstLevel = Math.max(1, Math.floor(points / target));
  const startPoints = (firstLevel - 1) * target;
  const percent = Math.min(100, Math.max(0, (points - startPoints) / (target * 3) * 100));
  return <span className="reward-road" aria-busy={loading}>
    <span className="reward-road-prizes">
      {Array.from({ length: 3 }, (_, index) => {
        const level = firstLevel + index;
        const prize = prizes[(level - 1) % prizes.length];
        const claimed = !loading && claimedLevels?.has(level) === true;
        const reached = !loading && (claimed || prize.kind === 'discount' || prize.kind === 'cover' || points >= level * target);
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

export const MangaRewardProgress = ({ purchasedIds, userId, claimedLevels, loading = false, forceDark = false }: MangaRewardProgressProps) => {
  const [open, setOpen] = useState(false);
  const [revealLevel, setRevealLevel] = useState<number | null>(null);
  const [previewCover, setPreviewCover] = useState(profileBanner);
  const [previewTitle, setPreviewTitle] = useState('Portada de colección');
  const [, setRevision] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  useEffect(() => subscribeMangaRewardProgress(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    let active = true;
    void getUltimosCapitulos().then(catalog => {
      if (!active || !catalog.length) return;
      const previewManga = catalog.find(manga => String(manga.id) === '55005') || catalog[0];
      if (previewManga?.portada) setPreviewCover(previewManga.portada);
      if (previewManga?.titulo) setPreviewTitle(previewManga.titulo);
    });
    return () => { active = false; };
  }, []);
  const completed = userId ? getAccountCompletedRewardChapterIds(userId) : new Set<string>();
  const progress = calculateMangaRewardProgress(
    userId ? purchasedIds : [],
    completed,
  );
  useLayoutEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const { scrollX, scrollY } = window;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockPageScroll();
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('.manga-reward-close')?.focus({ preventScroll: true });

    window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    return () => {
      dialog.close();
      unlock();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    };
  }, [open]);
  const label = loading ? 'Cargando avance…' : `${pointsFormat.format(progress.points)} puntos`;
  const roadProps = { points: progress.points, target: progress.target, loading, claimedLevels, onSelect: (level: number, reached: boolean) => {
    setRevealLevel(reached ? level : null);
    setOpen(true);
  } };
  const revealedPrize = revealLevel === null ? null : prizes[(revealLevel - 1) % prizes.length];
  const revealedClaimed = revealLevel !== null && claimedLevels?.has(revealLevel) === true;
  const revealedImage = revealedPrize?.kind === 'coins' ? rewardCoins : revealedPrize?.kind === 'discount' ? rewardDiscount : rewardCover;
  return <>
    <div className="manga-reward-banner" role="group" aria-label={`Premios de tu cuenta por nivel. ${label}`}>
      <RewardRoad {...roadProps} />
    </div>
    {createPortal(
      <dialog ref={dialogRef} className={`manga-reward-dialog${forceDark ? ' theme-dark' : ''}${revealedPrize ? ' is-revealing' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); setOpen(false); }} onClose={event => { if (!event.currentTarget.open) { setOpen(false); setRevealLevel(null); } }} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        {open && revealedPrize && <div className={`reward-reveal reward-reveal--${revealedPrize.kind}`} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="reward-reveal-flash" aria-hidden="true" />
          <button type="button" className="manga-reward-close" aria-label="Cerrar recompensa" onClick={() => setOpen(false)}><X size={20} /></button>
          <div className="reward-reveal-content">
            <motion.p
              className="reward-reveal-eyebrow"
              initial={reducedMotion ? false : { opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={reducedMotion ? { duration: 0 } : { delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.span
                className="reward-reveal-check"
                aria-hidden="true"
                initial={reducedMotion ? false : { scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={reducedMotion ? { duration: 0 } : { delay: 0.32, duration: 0.48, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Check size={22} strokeWidth={3.2} />
              </motion.span>
              <span>Premio Nivel {revealLevel} {revealedClaimed ? 'Cobrado' : 'Desbloqueado'}</span>
            </motion.p>
            <div className="reward-reveal-main">
              <div className="reward-reveal-stage">
                <div className="reward-reveal-beam" aria-hidden="true" />
                <div className="reward-reveal-halo" aria-hidden="true" />
                <div className="reward-reveal-ring" aria-hidden="true" />
                <div className="reward-reveal-sparkles" aria-hidden="true">
                  {revealSparkles.map((sparkle, index) => (
                    <span
                      key={index}
                      className={`reward-reveal-sparkle${sparkle.star ? ' is-star' : ''}`}
                      style={{
                        '--sparkle-x': sparkle.x,
                        '--sparkle-y': sparkle.y,
                        '--sparkle-size': `${sparkle.size}px`,
                        '--sparkle-delay': `${sparkle.delay}s`,
                        '--sparkle-duration': `${sparkle.duration}s`,
                      } as CSSProperties}
                    />
                  ))}
                </div>
                <motion.div
                  className="reward-reveal-prize-wrap"
                  initial={reducedMotion ? false : { opacity: 0, y: 36, scale: 0.35, rotate: -6 }}
                  animate={reducedMotion ? { opacity: 1, y: 0, scale: 1, rotate: 0 } : {
                    opacity: [0, 1, 1, 1],
                    y: [36, -10, 3, 0],
                    scale: [0.35, 1.12, 0.97, 1],
                    rotate: [-6, 2.5, -1, 0],
                  }}
                  transition={reducedMotion ? { duration: 0 } : {
                    delay: 0.08,
                    duration: 0.72,
                    times: [0, 0.6, 0.84, 1],
                    ease: ['easeOut', 'easeInOut', 'easeOut'],
                  }}
                >
                  {revealedPrize.kind === 'cover' ? (
                    <HoloCard
                      image={previewCover}
                      imageFit="cover"
                      backImage={collectionCardBack}
                      backContent={
                        <div className="profile-collection-back-brand" aria-hidden="true">
                          <span className="profile-collection-back-logo">MANGA<span className="text-mukai-magenta">MUKAI</span></span>
                          <span className="profile-collection-back-signature" />
                        </div>
                      }
                      alt={`Girar portada: ${previewTitle}`}
                      preset="rainbow"
                      intensity={0.65}
                      tiltMax={20}
                      hoverScale={1.04}
                      frame={0}
                      radius={0}
                      className="profile-cover-dialog-art reward-reveal-cover-card"
                    />
                  ) : (
                    <img className="reward-reveal-prize" src={revealedImage} alt="" draggable={false} />
                  )}
                </motion.div>
              </div>
              <motion.h2
                id={titleId}
                initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.88 }}
                animate={reducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0, scale: [0.88, 1.04, 1] }}
                transition={reducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
              >
                {revealedPrize.revealTitle}
              </motion.h2>
              <motion.p
                className="reward-reveal-note"
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reducedMotion ? { duration: 0 } : { delay: 0.38, duration: 0.46, ease: 'easeOut' }}
              >
                {revealedPrize.revealNote}
              </motion.p>
            </div>
            <motion.button
              type="button"
              className="reward-reveal-continue"
              onClick={() => setOpen(false)}
              initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={reducedMotion ? { duration: 0 } : { delay: 0.46, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            >
              Continuar
            </motion.button>
          </div>
        </div>}
        {open && !revealedPrize && <motion.div className="manga-reward-modal" initial={reducedMotion ? false : { opacity: 0, y: 16, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .3, ease: 'easeOut' }}>
          <button type="button" className="manga-reward-close" aria-label="Cerrar recompensas" onClick={() => setOpen(false)}><X size={20} /></button>
          <h2 id={titleId}>Recompensas Mukai</h2>
          <RewardRoad {...roadProps} />
          <div className="manga-reward-progress-copy"><strong>{label}</strong><span>{progress.target} puntos por nivel</span></div>
          <div className="manga-reward-contributions"><span title={`${progress.purchasedCount} capítulos comprados`}><ShoppingBag size={19} />Compra <b>+1</b></span><span title={`${progress.completedCount} capítulos terminados`}><BookOpen size={19} />Lectura completa <b>+0,5</b></span></div>
        </motion.div>}
      </dialog>, document.body,
    )}
  </>;
};
