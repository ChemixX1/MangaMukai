import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import navbarCoins from '../../assets/recharge/icon-2.svg';

import { ChapterNewBadge, ChapterCommentedIcon } from './ChapterStateIcons';
import { isRecentChapter } from '../../utils/chapterFreshness';
import { PurchaseModal } from '../modals';
import PulseHeart from '../common/PulseHeart';
import { readGuestChapterLike, setGuestChapterLike } from '../../utils/guestChapterLikes';
import { createQueuedLike } from '../../utils/queuedLike';
import { getChapterPreviewImage, type SeriesChapter } from '../../services/mangaService';
import { getChapterEngagement, getMangaComments, setEntityReaction } from '../../services/communityService';
import { buyChapter, getStoredToken } from '../../services/authService';
import {
  ChapterCommentIcon,
  PurchasedIcon,
  ShowAllIcon,
} from './designIcons';

const VISIBLE_CHAPTERS = 6;

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

  const label = <span>¡Gratis!</span>;

  return (
    <span
      role="timer"
      aria-label={`¡Gratis en! ${countdown}`}
      title={`¡Gratis en! ${countdown}`}
      className="manga-chapter-countdown"
    >
      {reduceMotion ? (
        <span aria-hidden="true" className="flex flex-col items-center leading-3">{label} {countdown}</span>
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

    return fallback;
  }
};

function ChapterThumbnail({ chapter }: { chapter: SeriesChapter }) {
  const uploadedCover = chapter.cover_url?.trim() || '';
  const [coverFailed, setCoverFailed] = useState(false);
  const useUploadedCover = Boolean(uploadedCover) && !coverFailed;
  const [imageUrl, setImageUrl] = useState(useUploadedCover ? uploadedCover : '');
  const [detectedFocus, setDetectedFocus] = useState<FocusPoint | null>(null);
  const fallbackFocus = seededFocus(chapter, imageUrl);

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
    <span className="manga-chapter-thumbnail">
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

export const ChapterList = ({ mangaId, chapters, purchasedChapterIds, userCoins, userInfo, onPurchaseSuccess, sortOrder = 'desc', loading = false, loadError = '' }: {
  mangaId: string;
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
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [localUnlocked, setLocalUnlocked] = useState<Set<string>>(new Set());
  const [timedUnlocked, setTimedUnlocked] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [chapterLikes, setChapterLikes] = useState<Record<string, number>>({});
  const [likedChapterIds, setLikedChapterIds] = useState<Set<string>>(new Set());
  const [commentedIds, setCommentedIds] = useState<Set<string>>(new Set());
  const likeQueues = useRef(new Map<string, ReturnType<typeof createQueuedLike>>());
  useEffect(() => {
    const queues = likeQueues.current;
    return () => { queues.forEach(queue => queue.dispose()); queues.clear(); };
  }, [mangaId, userInfo.id]);

  const chapterIds = chapters.map((chapter) => String(chapter.id)).join(',');
  useEffect(() => {
    let active = true;
    const load = () => {
      if (!chapterIds) return;
      void getChapterEngagement(chapterIds.split(',')).then(({ counts, engagement }) => {
        if (!active) return;
        setCommentCounts(counts);
        const guest = !getStoredToken();
        setChapterLikes(current => ({ ...current, ...Object.fromEntries(chapterIds.split(',').filter(id => !likeQueues.current.has(id)).map(id => [id, (engagement[id]?.reactions.like || 0) + Number(guest && readGuestChapterLike(id))])) }));
        setLikedChapterIds(current => {
          const next = new Set(current);
          chapterIds.split(',').forEach(id => {
            if (likeQueues.current.has(id)) return;
            if (guest ? readGuestChapterLike(id) : engagement[id]?.my_reaction === 'like') next.add(id);
            else next.delete(id);
          });
          return next;
        });
      }).catch(() => undefined);
    };
    load();
    window.addEventListener('focus', load);
    window.addEventListener('mm_chapter_comments_changed', load);
    return () => { active = false; window.removeEventListener('focus', load); window.removeEventListener('mm_chapter_comments_changed', load); };
  }, [chapterIds, userInfo.id]);

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
    setPurchaseComplete(false);
    setIsModalOpen(true);
  };

  const toggleLike = (chapterId: number) => {
    const id = String(chapterId);
    let queue = likeQueues.current.get(id);
    if (!queue) {
      const guest = !getStoredToken();
      let confirmed = guest ? readGuestChapterLike(id) : likedChapterIds.has(id);
      const publicCount = Math.max(0, (chapterLikes[id] || 0) - Number(confirmed));
      queue = createQueuedLike(
        { liked: confirmed, count: chapterLikes[id] || 0 },
        async () => {
          if (guest) {
            setGuestChapterLike(id, !confirmed);
            confirmed = !confirmed;
            return { action: confirmed ? 'added' : 'removed', total: publicCount + Number(confirmed) };
          }
          const result = await setEntityReaction('chapter', id, confirmed ? '' : 'like');
          confirmed = result.my_reaction === 'like';
          return { action: confirmed ? 'added' : 'removed', total: result.reactions.like || 0 };
        },
        ({ liked, count }) => {
          setChapterLikes(current => ({ ...current, [id]: count }));
          setLikedChapterIds(current => {
            const next = new Set(current);
            if (liked) next.add(id); else next.delete(id);
            return next;
          });
        },
      );
      likeQueues.current.set(id, queue);
    }
    queue.click();
  };

  const confirmPurchase = async () => {
    if (!selectedChapter || isProcessing || purchaseComplete) return;
    setIsProcessing(true);
    try {
      const result = await buyChapter(selectedChapter.id);
      if (result.success) {
        setLocalUnlocked((current) => new Set(current).add(String(selectedChapter.id)));
        onPurchaseSuccess();
        setPurchaseComplete(true);
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

  const visibleCommentIds = visible.filter(chapter => (commentCounts[String(chapter.id)] || 0) > 0).map(chapter => String(chapter.id)).join(',');
  useEffect(() => {
    const controller = new AbortController();
    setCommentedIds(new Set());
    if (!userInfo.id || !visibleCommentIds) return () => controller.abort();
    const load = async () => {
      const ids = visibleCommentIds.split(',');
      const mine = new Set<string>();

      for (let start = 0; start < ids.length && !controller.signal.aborted; start += 6) {
        await Promise.all(ids.slice(start, start + 6).map(async id => {
          const comments = await getMangaComments(mangaId, id, controller.signal);
          if (comments.some(comment => String(comment.user_id) === String(userInfo.id))) mine.add(id);
        }));
        if (!controller.signal.aborted) setCommentedIds(new Set(mine));
      }
    };
    void load();
    return () => controller.abort();
  }, [mangaId, userInfo.id, visibleCommentIds, commentCounts]);

  if (loading) return <div role="status" aria-label="Cargando capítulos" className="space-y-2"><span className="sr-only">Cargando capítulos…</span>{Array.from({ length: VISIBLE_CHAPTERS }, (_, i) => <div key={i} aria-hidden="true" className="h-20 rounded-lg bg-ink/5 animate-pulse motion-reduce:animate-none" />)}</div>;
  if (loadError) return <p role="alert" className="py-14 text-center text-sm text-red-500">{loadError}</p>;
  if (chapters.length === 0) {
    return <p className="rounded-lg border border-zinc-400/25 py-14 text-center font-montserrat text-[15px] font-bold italic text-ink/60">Próximamente</p>;
  }

  return (
    <>
      <ul className="manga-chapter-list">
        {visible.map((chapter) => {
          const id = String(chapter.id);
          const locked = isLocked(chapter);
          const liked = likedChapterIds.has(id);
          const comments = commentCounts[id] || 0;
          const freesLater = locked && Boolean(chapter.free_at) && new Date(chapter.free_at as string) > new Date();
          return (
            <li key={id}>
              <div className="manga-chapter-row">
                <Link to={`/read/${chapter.id}`} onClick={(event) => {
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  if (locked) { event.preventDefault(); openChapter(chapter); }
                }} className="manga-chapter-open" aria-label={`Leer capítulo ${chapter.chapter_number}`}>
                  <ChapterThumbnail chapter={chapter} />
                  <span className="manga-chapter-info">
                    <span className="manga-chapter-title">Capítulo {chapter.chapter_number}</span>
                    <span className="manga-chapter-age">{isRecentChapter(chapter.created_at) ? <ChapterNewBadge /> : formatChapterAge(chapter.created_at)}</span>
                  </span>
                </Link>

                <span className="manga-chapter-stats">
                  {freesLater && <FreeCountdown chapterId={chapter.id} targetDate={chapter.free_at as string} onExpire={handleTimedUnlock} />}


                  {locked ? (
                    <span title={`${chapter.price_coins} monedas`} className="manga-chapter-price">
                      <img src={navbarCoins} alt="" aria-hidden="true" width={25} height={22} className="shrink-0 object-contain" />
                      {chapter.price_coins}
                    </span>
                  ) : isPurchased(chapter) ? (
                    <span role="img" aria-label="Comprado" title="Comprado" className="manga-chapter-purchased">
                      <PurchasedIcon size={21} /><span>Comprado</span>
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => navigate(`/read/${chapter.id}#comentarios`)}
                    aria-label={`${comments} comentarios del capítulo ${chapter.chapter_number}`}
                    title="Comentarios"
                    className="flex items-center gap-1 font-montserrat text-base font-normal text-ink"
                  >
                    <span className="manga-chapter-comment-icon">{commentedIds.has(id) ? <ChapterCommentedIcon size={19} /> : <ChapterCommentIcon size={19} className="text-ink" />}</span>
                    <span className={commentedIds.has(id) ? 'manga-commented-count' : ''}>{comments}</span>
                  </button>

                  <PulseHeart
                    bare
                    liked={liked}
                    count={chapterLikes[id] || 0}
                    onChange={() => { void toggleLike(chapter.id); }}
                    interruptible
                    label={liked ? 'Quitar me gusta' : 'Me gusta'}
                    className="manga-chapter-like font-montserrat"
                    size={19}
                    icon="heart"
                    idleOutline
                    idleColor="rgb(var(--mm-ink))"
                    likedColor="#ff008c"
                    textColor={liked ? '#ff008c' : 'rgb(var(--mm-ink))'}
                    duration={560}
                    dotSize={0.3}
                    overshoot={1.7}
                    beat={0}
                  />
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
          className="manga-show-all"
        >
          {showAll ? 'Mostrar Menos' : 'Mostrar Todos'}
          <ShowAllIcon size={20} className={showAll ? 'rotate-180' : ''} />
        </button>
      )}

      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmPurchase}
        purchaseComplete={purchaseComplete}
        onReadChapter={() => { if (selectedChapter) navigate(`/read/${selectedChapter.id}`); }}
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
