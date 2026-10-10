import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { PurchaseModal } from '../modals';
import { getChapterPreviewImage, type SeriesChapter } from '../../services/mangaService';
import { getChapterEngagement, setEntityReaction } from '../../services/communityService';
import { buyChapter, getStoredToken } from '../../services/authService';
import {
  ChapterCommentIcon,
  ChapterLikeHeartIcon,
  CoinStackIcon,
  LikeHeartIcon,
  PurchasedIcon,
  ShowAllIcon,
} from './designIcons';

const VISIBLE_CHAPTERS = 6;

/** "Hoy", "3 días", "3 meses"… */
const formatChapterAge = (createdAt: string): string => {
  const published = new Date(createdAt).getTime();
  if (!Number.isFinite(published)) return '';
  const elapsedDays = Math.max(0, Math.floor((Date.now() - published) / 86_400_000));
  if (elapsedDays === 0) return 'Hoy';
  if (elapsedDays === 1) return '1 día';
  if (elapsedDays >= 365) {
    const years = Math.floor(elapsedDays / 365);
    return `${years} ${years === 1 ? 'año' : 'años'}`;
  }
  if (elapsedDays > 30) {
    const months = Math.floor(elapsedDays / 30);
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  return `${elapsedDays} días`;
};

const formatUnlockTime = (remainingMilliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMilliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');

  if (days > 0) return `${days}d ${pad(hours)}h`;
  if (hours > 0) return `${pad(hours)}h ${pad(minutes)}m`;
  return `${pad(minutes)}m ${pad(seconds)}s`;
};

/**
 * Cuenta atrás de los capítulos de pago que se liberan solos: "¡Gratis En!" y el
 * tiempo que falta se turnan junto al precio. Solo se ve en escritorio, donde la
 * fila tiene sitio; en móvil sigue contando para desbloquear el capítulo a tiempo.
 */
function FreeCountdown({ chapterId, targetDate, onExpire }: {
  chapterId: number;
  targetDate: string;
  onExpire: (chapterId: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [showLabel, setShowLabel] = useState(true);
  const targetTime = new Date(targetDate).getTime();
  const hasExpired = Number.isFinite(targetTime) && targetTime <= now;
  const countdown = formatUnlockTime(Math.max(0, targetTime - now));

  // Cada aviso se programa al filo del segundo siguiente para no desfasarse del reloj.
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setNow(Date.now());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [targetDate]);

  useEffect(() => {
    setShowLabel(true);
    if (reduceMotion) return;
    const timer = window.setInterval(() => setShowLabel((current) => !current), 2200);
    return () => window.clearInterval(timer);
  }, [reduceMotion, targetDate]);

  useEffect(() => {
    if (hasExpired) onExpire(chapterId);
  }, [chapterId, hasExpired, onExpire]);

  const label = <span className="manga-free-holo">¡Gratis En!</span>;

  return (
    <span
      role="timer"
      aria-label={`¡Gratis en! ${countdown}`}
      title={`¡Gratis en! ${countdown}`}
      className="hidden h-8 min-w-[104px] shrink-0 items-center justify-center overflow-hidden whitespace-nowrap font-montserrat text-xs font-semibold text-ink tabular-nums lg:inline-flex"
    >
      {reduceMotion ? (
        <span aria-hidden="true" className="flex items-center gap-1">{label} {countdown}</span>
      ) : (
        <span aria-hidden="true" className="relative inline-grid h-5 w-full items-center overflow-hidden">
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={showLabel ? 'label' : 'countdown'}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -7 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {showLabel ? label : countdown}
            </motion.span>
          </AnimatePresence>
        </span>
      )}
    </span>
  );
}

type FocusPoint = { x: number; y: number };

/** Zonas donde suele haber una cara en una página suelta del capítulo. */
const FOCUS_POINTS: readonly FocusPoint[] = [
  { x: 32, y: 28 },
  { x: 68, y: 28 },
  { x: 50, y: 36 },
  { x: 28, y: 50 },
  { x: 72, y: 50 },
  { x: 50, y: 60 },
];

const seededFocus = (chapter: SeriesChapter, imageUrl: string) => {
  const seed = Array.from(`${chapter.id}:${chapter.chapter_number}:${imageUrl}`)
    .reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
  return FOCUS_POINTS[seed % FOCUS_POINTS.length];
};

/** Elige la zona con más color y detalle de la página para encuadrar la miniatura. */
const detectFocus = (image: HTMLImageElement, fallback: FocusPoint): FocusPoint => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = Math.max(96, Math.min(160, Math.round(96 * (image.naturalHeight / Math.max(1, image.naturalWidth)))));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return fallback;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const luminanceAt = (x: number, y: number) => {
      const offset = ((y * canvas.width) + x) * 4;
      return (pixels[offset] * 0.299) + (pixels[offset + 1] * 0.587) + (pixels[offset + 2] * 0.114);
    };

    let best = fallback;
    let bestScore = Number.NEGATIVE_INFINITY;
    FOCUS_POINTS.forEach((point) => {
      const centerX = Math.round((point.x / 100) * (canvas.width - 1));
      const centerY = Math.round((point.y / 100) * (canvas.height - 1));
      const radiusX = Math.max(8, Math.round(canvas.width * 0.14));
      const radiusY = Math.max(8, Math.round(canvas.height * 0.1));
      let score = 0;
      let samples = 0;

      for (let y = Math.max(1, centerY - radiusY); y < Math.min(canvas.height - 1, centerY + radiusY); y += 2) {
        for (let x = Math.max(1, centerX - radiusX); x < Math.min(canvas.width - 1, centerX + radiusX); x += 2) {
          const offset = ((y * canvas.width) + x) * 4;
          const [red, green, blue] = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
          const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
          const edge = Math.abs(luminanceAt(x, y) - luminanceAt(x + 1, y)) + Math.abs(luminanceAt(x, y) - luminanceAt(x, y + 1));
          const skinLike = red > 90 && green > 35 && blue > 20 && red > green && red > blue ? 18 : 0;
          score += (saturation * 1.25) + (edge * 0.72) + skinLike;
          samples += 1;
        }
      }

      const average = samples > 0 ? score / samples : 0;
      if (average > bestScore) {
        bestScore = average;
        best = point;
      }
    });
    return best;
  } catch {
    // Las imágenes de otro dominio pueden bloquear la lectura del canvas: queda el encuadre fijo.
    return fallback;
  }
};

/** Miniatura: la portada subida del capítulo y, si no hay o falla, su primera página encuadrada. */
function ChapterThumbnail({ chapter }: { chapter: SeriesChapter }) {
  const uploadedCover = chapter.cover_url?.trim() || '';
  const [coverFailed, setCoverFailed] = useState(false);
  const useUploadedCover = Boolean(uploadedCover) && !coverFailed;
  const [imageUrl, setImageUrl] = useState(useUploadedCover ? uploadedCover : '');
  const [detectedFocus, setDetectedFocus] = useState<FocusPoint | null>(null);
  const fallbackFocus = seededFocus(chapter, imageUrl);
  // La portada subida ya viene encuadrada; el recorte solo se calcula para la página provisional.
  const focus = useUploadedCover ? { x: 50, y: 50 } : detectedFocus ?? fallbackFocus;

  useEffect(() => {
    setCoverFailed(false);
  }, [uploadedCover]);

  useEffect(() => {
    setDetectedFocus(null);
    if (useUploadedCover) {
      setImageUrl(uploadedCover);
      return;
    }
    setImageUrl('');
    let active = true;
    void getChapterPreviewImage(chapter.id, chapter.chapter_number, getStoredToken()).then((preview) => {
      if (active && preview) setImageUrl(preview);
    });
    return () => { active = false; };
  }, [chapter.chapter_number, chapter.id, uploadedCover, useUploadedCover]);

  return (
    <span className="h-[76px] w-[87px] shrink-0 overflow-hidden rounded-lg border border-ink bg-ink/10 max-[400px]:w-16">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onLoad={(event) => { if (!useUploadedCover) setDetectedFocus(detectFocus(event.currentTarget, fallbackFocus)); }}
          onError={() => {
            setDetectedFocus(null);
            setImageUrl('');
            if (useUploadedCover) setCoverFailed(true);
          }}
          className="h-full w-full object-cover"
          style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
        />
      )}
    </span>
  );
}

/**
 * Lista de capítulos de la ficha (móvil y escritorio): cinco filas y el botón
 * "Mostrar Todos". Cada fila lleva la miniatura, el número, la antigüedad y, a
 * la derecha, el precio en monedas (o el sello verde si ya es suyo), los
 * comentarios y los me gusta.
 */
export const ChapterList = ({ chapters, purchasedChapterIds, userCoins, userInfo, onPurchaseSuccess, sortOrder = 'desc', loading = false, loadError = '' }: {
  loading?: boolean;
  loadError?: string;
  chapters: SeriesChapter[];
  purchasedChapterIds: Set<string>;
  userCoins: number;
  userInfo: { id: string; username: string };
  onPurchaseSuccess: () => void;
  sortOrder?: 'asc' | 'desc';
}) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<SeriesChapter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localUnlocked, setLocalUnlocked] = useState<Set<string>>(new Set());
  const [timedUnlocked, setTimedUnlocked] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [chapterLikes, setChapterLikes] = useState<Record<string, number>>({});
  const [likedChapterIds, setLikedChapterIds] = useState<Set<string>>(new Set());
  const [likeBusy, setLikeBusy] = useState(false);

  const chapterIds = chapters.map((chapter) => String(chapter.id)).join(',');
  useEffect(() => {
    let active = true;
    const load = () => {
      if (!chapterIds) return;
      void getChapterEngagement(chapterIds.split(',')).then(({ counts, engagement }) => {
        if (!active) return;
        setCommentCounts(counts);
        setChapterLikes(Object.fromEntries(Object.entries(engagement).map(([id, state]) => [id, state.reactions.like || 0])));
        setLikedChapterIds(new Set(Object.entries(engagement).filter(([, state]) => state.my_reaction === 'like').map(([id]) => id)));
      }).catch(() => undefined);
    };
    load();
    window.addEventListener('focus', load);
    window.addEventListener('mm_chapter_comments_changed', load);
    return () => { active = false; window.removeEventListener('focus', load); window.removeEventListener('mm_chapter_comments_changed', load); };
  }, [chapterIds]);

  const returnTo = () => `${window.location.pathname}${window.location.search}`;
  const goToLogin = () => navigate('/auth/login', { state: { returnTo: returnTo() } });

  const handleTimedUnlock = useCallback((chapterId: number) => {
    const id = String(chapterId);
    setTimedUnlocked((current) => (current.has(id) ? current : new Set(current).add(id)));
  }, []);

  const isPurchased = (chapter: SeriesChapter) => purchasedChapterIds.has(String(chapter.id)) || localUnlocked.has(String(chapter.id));
  const isLocked = (chapter: SeriesChapter) => {
    if (!chapter.is_paid) return false;
    if (timedUnlocked.has(String(chapter.id))) return false;
    if (chapter.free_at && new Date(chapter.free_at) <= new Date()) return false;
    return !isPurchased(chapter);
  };

  const openChapter = (chapter: SeriesChapter) => {
    if (!isLocked(chapter)) { navigate(`/read/${chapter.id}`); return; }
    if (!userInfo.id) { goToLogin(); return; }
    setSelectedChapter(chapter);
    setIsModalOpen(true);
  };

  const toggleLike = async (chapterId: number) => {
    if (likeBusy) return;
    if (!getStoredToken()) { goToLogin(); return; }
    const id = String(chapterId);
    setLikeBusy(true);
    try {
      const result = await setEntityReaction('chapter', id, likedChapterIds.has(id) ? '' : 'like');
      setChapterLikes((current) => ({ ...current, [id]: result.reactions.like || 0 }));
      setLikedChapterIds((current) => {
        const next = new Set(current);
        if (result.my_reaction === 'like') next.add(id); else next.delete(id);
        return next;
      });
    } catch { /* Un me gusta perdido no interrumpe la lectura. */ }
    finally { setLikeBusy(false); }
  };

  const confirmPurchase = async () => {
    if (!selectedChapter) return;
    setIsProcessing(true);
    try {
      const result = await buyChapter(selectedChapter.id);
      if (result.success) {
        setLocalUnlocked((current) => new Set(current).add(String(selectedChapter.id)));
        onPurchaseSuccess();
        setIsModalOpen(false);
        navigate(`/read/${selectedChapter.id}`);
      } else {
        window.alert(result.message || 'No se pudo comprar el capítulo.');
        setIsModalOpen(false);
      }
    } catch {
      window.alert('Error técnico al procesar la compra.');
    } finally {
      setIsProcessing(false);
    }
  };

  const ordered = [...chapters].sort((a, b) => {
    const byNumber = sortOrder === 'asc' ? a.chapter_number - b.chapter_number : b.chapter_number - a.chapter_number;
    if (byNumber !== 0) return byNumber;
    const byDate = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortOrder === 'asc' ? byDate : -byDate;
  });
  const visible = showAll ? ordered : ordered.slice(0, VISIBLE_CHAPTERS);

  if (loading) return <div role="status" aria-label="Cargando capítulos" className="space-y-2"><span className="sr-only">Cargando capítulos…</span>{Array.from({ length: VISIBLE_CHAPTERS }, (_, i) => <div key={i} aria-hidden="true" className="h-20 rounded-lg bg-ink/5 animate-pulse motion-reduce:animate-none" />)}</div>;
  if (loadError) return <p role="alert" className="py-14 text-center text-sm text-red-500">{loadError}</p>;
  if (chapters.length === 0) {
    return <p className="rounded-lg border border-zinc-400/25 py-14 text-center font-montserrat text-[15px] font-bold italic text-ink/60">Próximamente</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {visible.map((chapter) => {
          const id = String(chapter.id);
          const locked = isLocked(chapter);
          const liked = likedChapterIds.has(id);
          const comments = commentCounts[id] || 0;
          const freesLater = locked && Boolean(chapter.free_at) && new Date(chapter.free_at as string) > new Date();
          return (
            <li key={id}>
              <div className="flex h-24 items-center gap-2 rounded-lg border border-zinc-400/25 pl-[5px] pr-2.5 transition-colors max-[400px]:gap-[5px] max-[400px]:pr-[5px] lg:gap-3 lg:pr-4 lg:hover:border-mukai-magenta/60">
                <button type="button" onClick={() => openChapter(chapter)} className="flex min-w-0 flex-1 items-center gap-2 text-left max-[400px]:gap-1.5 lg:gap-3" aria-label={`Leer capítulo ${chapter.chapter_number}`}>
                  <ChapterThumbnail chapter={chapter} />
                  <span className="flex min-w-0 flex-col gap-2">
                    <span className="truncate font-montserrat text-xs font-semibold leading-3 text-ink lg:text-sm lg:leading-4">Capítulo {chapter.chapter_number}</span>
                    <span className="truncate font-montserrat text-xs font-light leading-3 text-ink/80 lg:leading-4">{formatChapterAge(chapter.created_at)}</span>
                  </span>
                </button>

                <span className="flex shrink-0 items-center gap-2 max-[400px]:gap-[5px] max-[400px]:[&_:is(button,span)]:gap-0.5 max-[400px]:[&_:is(button,span)]:text-xs max-[400px]:[&_svg]:w-4 lg:gap-3">
                  {freesLater && <FreeCountdown chapterId={chapter.id} targetDate={chapter.free_at as string} onExpire={handleTimedUnlock} />}

                  {/* Precio mientras esté bloqueado; si lo compró, el sello verde. */}
                  {locked ? (
                    <span title={`${chapter.price_coins} monedas`} className="flex items-center gap-1 font-anta text-sm font-normal text-mukai-orange">
                      <CoinStackIcon size={20} />
                      {chapter.price_coins}
                    </span>
                  ) : isPurchased(chapter) ? (
                    <span role="img" aria-label="Comprado" title="Comprado" className="flex text-green-500">
                      <PurchasedIcon size={30} />
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => navigate(`/read/${chapter.id}#comentarios`)}
                    aria-label={`${comments} comentarios del capítulo ${chapter.chapter_number}`}
                    title="Comentarios"
                    className="flex items-center gap-1 font-anta text-base font-normal text-ink"
                  >
                    <ChapterCommentIcon size={20} className={comments ? 'text-mukai-magenta' : 'text-ink'} />
                    <span className={comments ? 'text-mukai-magenta' : ''}>{comments}</span>
                  </button>

                  <button type="button" onClick={() => void toggleLike(chapter.id)} disabled={likeBusy} aria-label={liked ? 'Quitar me gusta' : 'Me gusta'} aria-pressed={liked} className="flex items-center gap-1 font-anta text-base font-normal text-ink disabled:opacity-60">
                    {liked ? <ChapterLikeHeartIcon size={16} /> : <LikeHeartIcon size={18} className="text-ink" />}
                    <span className={liked ? 'text-mukai-magenta' : ''}>{chapterLikes[id] || 0}</span>
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {ordered.length > VISIBLE_CHAPTERS && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mx-auto mt-2.5 flex h-12 w-48 items-center justify-center gap-2 rounded-[20px] border-[0.5px] border-zinc-400/25 font-montserrat text-sm text-ink/75 transition-colors lg:hover:border-mukai-magenta/60 lg:hover:text-ink"
        >
          {showAll ? 'Mostrar Menos' : 'Mostrar Todos'}
          <ShowAllIcon size={20} className={showAll ? 'rotate-180' : ''} />
        </button>
      )}

      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmPurchase}
        onRecharge={() => { setIsModalOpen(false); navigate('/recargar', { state: { returnTo: returnTo() } }); }}
        chapterNumber={selectedChapter?.chapter_number ?? ''}
        price={selectedChapter?.price_coins || 0}
        userBalance={userCoins}
        loading={isProcessing}
        freeAt={selectedChapter?.free_at || null}
      />
    </>
  );
};
