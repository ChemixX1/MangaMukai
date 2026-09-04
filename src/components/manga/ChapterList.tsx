import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, BookOpen, ChevronDown, ChevronUp, Clock, Flame, Heart, LockKeyhole, MessageCircle } from "lucide-react";
import { CoinMarketModal, PurchaseModal } from "../modals";
import { DetailCoin3DIcon } from "../common";
import { buyChapter, getStoredToken } from "../../services/authService";
import { getChapterPreviewImage } from "../../services/mangaService";

export interface Chapter {
  id: number | string;
  chapter_number: number;
  title: string;
  created_at: string;
  is_paid: boolean;
  price_coins: number;
  free_at: string | null;
}

interface ChapterListProps {
  chapters: Chapter[];
  purchasedChapterIds: Set<string>;
  userCoins: number;
  userInfo: { id: string; username: string };
  onPurchaseSuccess: () => void;
  isLight?: boolean;
  sortOrder?: 'asc' | 'desc';
}

const formatChapterAge = (createdAt: string): string => {
  const published = new Date(createdAt).getTime();
  if (!Number.isFinite(published)) return '';

  const elapsedDays = Math.max(0, Math.floor((Date.now() - published) / 86_400_000));
  if (elapsedDays === 0) return 'Hoy';
  if (elapsedDays === 1) return '1 día';
  if (elapsedDays >= 365) {
    const elapsedYears = Math.floor(elapsedDays / 365);
    return `${elapsedYears} ${elapsedYears === 1 ? 'año' : 'años'}`;
  }
  if (elapsedDays > 30) {
    const elapsedMonths = Math.floor(elapsedDays / 30);
    return `${elapsedMonths} ${elapsedMonths === 1 ? 'mes' : 'meses'}`;
  }
  return `${elapsedDays} días`;
};

const isRecentChapter = (createdAt: string): boolean => {
  const published = new Date(createdAt).getTime();
  if (!Number.isFinite(published)) return false;
  const elapsedDays = Math.max(0, Math.floor((Date.now() - published) / 86_400_000));
  return elapsedDays <= 14;
};

const formatUnlockTime = (remainingMilliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMilliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours.toString().padStart(2, '0')}h`;
  if (hours > 0) return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
  return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
};

function PremiumUnlockTimer({
  chapterId,
  targetDate,
  isLight,
  onExpire,
}: {
  chapterId: number | string;
  targetDate: string;
  isLight: boolean;
  onExpire: (chapterId: number | string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [showCountdown, setShowCountdown] = useState(false);
  const targetTime = new Date(targetDate).getTime();
  const remainingMilliseconds = Math.max(0, targetTime - now);
  const hasExpired = Number.isFinite(targetTime) && targetTime <= now;
  const countdownCopy = formatUnlockTime(remainingMilliseconds);

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
    if (reduceMotion) {
      setShowCountdown(false);
      return;
    }

    setShowCountdown(false);
    const timer = window.setInterval(() => setShowCountdown((current) => !current), 2200);
    return () => window.clearInterval(timer);
  }, [reduceMotion, targetDate]);

  useEffect(() => {
    if (hasExpired) onExpire(chapterId);
  }, [chapterId, hasExpired, onExpire]);

  const visibleCopy = reduceMotion
    ? `Gratis en ${countdownCopy}`
    : showCountdown
      ? countdownCopy
      : 'Gratis en';

  return (
    <span
      className={`inline-flex h-7 w-[112px] shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap font-[Montserrat] text-[10px] font-semibold leading-none tracking-[-0.01em] ${isLight ? 'text-black' : 'text-white'}`}
      role="timer"
      aria-label={`Gratis en ${countdownCopy}`}
      title={`Gratis en ${countdownCopy}`}
    >
      <Clock className="h-3 w-3 shrink-0" strokeWidth={2.2} aria-hidden="true" />
      <span className={`relative inline-grid h-4 items-center overflow-hidden ${reduceMotion ? 'min-w-0' : 'w-[68px]'}`} aria-hidden="true">
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={reduceMotion ? 'reduced' : showCountdown ? 'countdown' : 'label'}
            initial={reduceMotion ? false : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -7 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className={`${reduceMotion ? 'relative' : 'absolute inset-0'} flex items-center justify-center whitespace-nowrap tabular-nums`}
          >
            {visibleCopy}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

const CHAPTER_FACE_FOCUS_POINTS = [
  { x: 32, y: 28 },
  { x: 68, y: 28 },
  { x: 50, y: 36 },
  { x: 28, y: 50 },
  { x: 72, y: 50 },
  { x: 50, y: 60 },
] as const;

const getChapterFocusPoint = (chapter: Chapter, imageUrl: string) => {
  const seedSource = `${chapter.id}:${chapter.chapter_number}:${imageUrl}`;
  const seed = Array.from(seedSource).reduce(
    (total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0,
    0,
  );
  return CHAPTER_FACE_FOCUS_POINTS[seed % CHAPTER_FACE_FOCUS_POINTS.length];
};

const findDetailedColorFocus = (
  image: HTMLImageElement,
  fallback: (typeof CHAPTER_FACE_FOCUS_POINTS)[number],
) => {
  try {
    const canvas = document.createElement('canvas');
    const aspect = image.naturalHeight / Math.max(1, image.naturalWidth);
    canvas.width = 96;
    canvas.height = Math.max(96, Math.min(160, Math.round(96 * aspect)));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return fallback;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const luminanceAt = (x: number, y: number) => {
      const offset = ((y * canvas.width) + x) * 4;
      return (pixels[offset] * 0.299) + (pixels[offset + 1] * 0.587) + (pixels[offset + 2] * 0.114);
    };

    let bestPoint = fallback;
    let bestScore = Number.NEGATIVE_INFINITY;

    CHAPTER_FACE_FOCUS_POINTS.forEach((point) => {
      const centerX = Math.round((point.x / 100) * (canvas.width - 1));
      const centerY = Math.round((point.y / 100) * (canvas.height - 1));
      const radiusX = Math.max(8, Math.round(canvas.width * 0.14));
      const radiusY = Math.max(8, Math.round(canvas.height * 0.1));
      let score = 0;
      let samples = 0;

      for (let y = Math.max(1, centerY - radiusY); y < Math.min(canvas.height - 1, centerY + radiusY); y += 2) {
        for (let x = Math.max(1, centerX - radiusX); x < Math.min(canvas.width - 1, centerX + radiusX); x += 2) {
          const offset = ((y * canvas.width) + x) * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
          const edge = Math.abs(luminanceAt(x, y) - luminanceAt(x + 1, y))
            + Math.abs(luminanceAt(x, y) - luminanceAt(x, y + 1));
          const skinLike = red > 90 && green > 35 && blue > 20 && red > green && red > blue
            ? 18
            : 0;
          score += (saturation * 1.25) + (edge * 0.72) + skinLike;
          samples += 1;
        }
      }

      const averageScore = samples > 0 ? score / samples : 0;
      if (averageScore > bestScore) {
        bestScore = averageScore;
        bestPoint = point;
      }
    });

    return bestPoint;
  } catch {
    // En desarrollo las imágenes remotas pueden bloquear la lectura del canvas.
    // El encuadre determinista sigue funcionando como alternativa ligera.
    return fallback;
  }
};

function ChapterThumbnail({ chapter }: { chapter: Chapter }) {
  const [imageUrl, setImageUrl] = useState('');
  const [detectedFocus, setDetectedFocus] = useState<(typeof CHAPTER_FACE_FOCUS_POINTS)[number] | null>(null);
  const fallbackFocus = getChapterFocusPoint(chapter, imageUrl);
  const focusPoint = detectedFocus ?? fallbackFocus;

  useEffect(() => {
    setImageUrl('');
    setDetectedFocus(null);
    let active = true;
    void getChapterPreviewImage(chapter.id, chapter.chapter_number, getStoredToken()).then((preview) => {
      if (active && preview) setImageUrl(preview);
    });
    return () => {
      active = false;
    };
  }, [chapter.chapter_number, chapter.id]);

  return (
    <div className="relative flex h-[52px] w-[68px] items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/[0.04] shadow-[0_7px_16px_rgba(0,0,0,.18)] md:h-[58px] md:w-[74px]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onLoad={(event) => setDetectedFocus(findDetailedColorFocus(event.currentTarget, fallbackFocus))}
          onError={() => {
            setDetectedFocus(null);
            setImageUrl('');
          }}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          style={{ objectPosition: `${focusPoint.x}% ${focusPoint.y}%` }}
        />
      ) : (
        <span className="h-full w-full animate-pulse bg-gradient-to-br from-[#FF4D88]/15 via-white/[0.04] to-violet-500/15" aria-hidden="true" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/[0.04]" aria-hidden="true" />
    </div>
  );
}

function ChapterEngagement({
  commentActive,
  liked,
  onToggleComment,
  onToggleLike,
}: {
  commentActive: boolean;
  liked: boolean;
  onToggleComment: () => void;
  onToggleLike: () => void;
}) {
  const handleAction = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.stopPropagation();
    action();
  };

  return (
    <span className="manga-chapter-engagement" aria-label={`0 comentarios y ${liked ? 1 : 0} me gusta`}>
      <button
        type="button"
        className={`manga-chapter-engagement-item ${commentActive ? 'is-active' : ''}`}
        title="Comentarios"
        aria-label="Comentarios del capítulo"
        aria-pressed={commentActive}
        onClick={(event) => handleAction(event, onToggleComment)}
      >
        <MessageCircle className="manga-chapter-engagement-icon" strokeWidth={2.5} aria-hidden="true" />
        <span className="tabular-nums">0</span>
      </button>
      <button
        type="button"
        className={`manga-chapter-engagement-item manga-chapter-like-action ${liked ? 'is-active' : ''}`}
        title="Me gusta"
        aria-label="Me gusta este capítulo"
        aria-pressed={liked}
        onClick={(event) => handleAction(event, onToggleLike)}
      >
        <Heart className="manga-chapter-engagement-icon manga-chapter-like-icon" strokeWidth={2.5} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
        <span className="tabular-nums">{liked ? 1 : 0}</span>
      </button>
    </span>
  );
}

export const ChapterList = ({ chapters, purchasedChapterIds, userCoins, userInfo, onPurchaseSuccess, isLight = false, sortOrder = 'desc' }: ChapterListProps) => {
  const navigate = useNavigate();

  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [localUnlocked, setLocalUnlocked] = useState<Set<string>>(new Set());
  const [timedUnlocked, setTimedUnlocked] = useState<Set<string>>(new Set());
  const [activeCommentChapterIds, setActiveCommentChapterIds] = useState<Set<string>>(new Set());
  const [likedChapterIds, setLikedChapterIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleChapterAction = (
    chapterId: number | string,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) => {
    const id = String(chapterId);
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isChapterPurchased = (chapter: Chapter) => {
    const idStr = String(chapter.id);
    return purchasedChapterIds.has(idStr) || localUnlocked.has(idStr);
  };

  const handleTimedUnlock = useCallback((chapterId: number | string) => {
    const id = String(chapterId);
    setTimedUnlocked((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const totalChapters = chapters.length;

  const orderedChapters = [...chapters].sort((a, b) => {
    const chapterDifference = sortOrder === 'asc'
      ? Number(a.chapter_number) - Number(b.chapter_number)
      : Number(b.chapter_number) - Number(a.chapter_number);
    if (chapterDifference !== 0) return chapterDifference;
    return sortOrder === 'asc'
      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const visibleChapters = showAll ? orderedChapters : orderedChapters.slice(0, 5);

  const isChapterLocked = (chapter: Chapter) => {
    if (!chapter.is_paid) return false;
    if (timedUnlocked.has(String(chapter.id))) return false;
    if (chapter.free_at && new Date(chapter.free_at) <= new Date()) return false;

    if (isChapterPurchased(chapter)) {
      return false;
    }
    return true;
  };

  // --- LÓGICA DE CLIC ---
  const handleChapterClick = (chapter: Chapter) => {
    const locked = isChapterLocked(chapter);

    // Si el capítulo es GRATUITO → entrar directamente, sin login
    if (!locked) {
      navigate(`/read/${chapter.id}`);
      return;
    }

    // El capítulo es de PAGO → necesita sesión
    if (!userInfo.id) {
      // Sin sesión → llevar a la página de acceso y regresar después al manga.
      navigate('/auth/login', {
        state: { returnTo: `${window.location.pathname}${window.location.search}` },
      });
      return;
    }

    // Con sesión y capítulo bloqueado → mostrar modal de compra
    setSelectedChapter(chapter);
    setIsModalOpen(true);
  };


  const handleConfirmPurchase = async () => {
    if (!selectedChapter) return;
    setIsProcessing(true);
    try {
      const result = await buyChapter(selectedChapter.id);
      if (result.success) {
        setLocalUnlocked(prev => new Set(prev).add(String(selectedChapter.id)));
        onPurchaseSuccess();
        setIsModalOpen(false);
        navigate(`/read/${selectedChapter.id}`);
      } else if (result.message.includes("saldo") || result.message.includes("insuficiente")) {
        alert("Saldo insuficiente. Recarga tus monedas en mangamukai.com");
        setIsModalOpen(false);
      } else {
        alert("Error: " + (result.message || "No se pudo comprar"));
      }
    } catch (err: unknown) {
      console.error("Error comprando:", err);
      alert("Error técnico al procesar la compra.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className={`manga-chapter-list relative z-20 w-full ${isLight ? 'is-light' : 'is-dark'}`}>

        {/* LISTA */}
        <div className="manga-chapter-surface">
          <div className="flex flex-col gap-2">
            {totalChapters === 0 ? (
              <div className="manga-chapter-empty flex flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.07] bg-black/30 px-5 py-16 text-center">
                <BookOpen size={42} className="text-[#FF4D88]/45" strokeWidth={1.8} />
                <p className="text-xs font-semibold text-white/35">Sin capítulos disponibles</p>
              </div>
            ) : visibleChapters.map((chapter) => {
              const locked = isChapterLocked(chapter);
              const isPurchased = isChapterPurchased(chapter);
              const isFutureFree = !!chapter.free_at && new Date(chapter.free_at) > new Date();
              const isNewChapter = isRecentChapter(chapter.created_at);
              const chapterId = String(chapter.id);
              const commentActive = activeCommentChapterIds.has(chapterId);
              const liked = likedChapterIds.has(chapterId);

              return (
                <div
                  key={chapter.id}
                  className={`manga-chapter-row group relative grid w-full grid-cols-[68px_minmax(0,1fr)] items-center gap-x-3 overflow-hidden rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-left text-sm transition-all duration-200 md:grid-cols-[84px_minmax(0,1fr)_minmax(300px,auto)] md:gap-x-4 md:px-5 ${locked ? 'opacity-90 hover:opacity-100' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleChapterClick(chapter)}
                    className="manga-chapter-row-action absolute inset-0 z-0 h-full w-full"
                    aria-label={`Abrir capítulo ${chapter.chapter_number}`}
                  />

                  <div className="pointer-events-none relative z-[1]">
                    <ChapterThumbnail chapter={chapter} />
                  </div>

                  <div className="manga-chapter-row-title pointer-events-none relative z-[1] min-h-[40px] min-w-0 text-left transition-colors group-hover:text-white md:min-h-0 md:pr-4">
                    <strong className="manga-chapter-title-copy absolute inset-x-0 top-0 block truncate text-[13px] font-semibold leading-tight md:static md:text-[14px]">
                      Capítulo {chapter.chapter_number}
                    </strong>
                    <span className="manga-chapter-date absolute inset-x-0 bottom-0 flex min-h-[16px] items-center text-[13px] font-normal md:static md:mt-1.5">
                      {isNewChapter ? (
                        <span className="manga-chapter-new inline-flex items-center gap-1 text-[11px] font-medium uppercase text-[#FF4D88]">
                          <Flame className="manga-chapter-new-flame" size={15} fill="currentColor" strokeWidth={1.8} aria-hidden="true" /> New
                        </span>
                      ) : (
                        <span>{formatChapterAge(chapter.created_at)}</span>
                      )}
                    </span>
                    <div className="absolute inset-y-0 right-0 flex min-w-0 items-center justify-end gap-3 md:hidden">
                      {locked ? (
                        <span className="manga-chapter-coin-value flex shrink-0 items-center gap-1 text-yellow-500">
                          <DetailCoin3DIcon size={17} className="h-[17px] w-[17px] object-contain" /> {chapter.price_coins}
                        </span>
                      ) : isPurchased ? (
                        <span className="manga-chapter-purchased-status inline-flex shrink-0 items-center justify-center" aria-label="Comprado" title="Comprado">
                          <BadgeCheck className="manga-chapter-purchased-icon" strokeWidth={2.3} />
                        </span>
                      ) : (
                        <span className="manga-chapter-free-access shrink-0">Gratis</span>
                      )}
                      <ChapterEngagement
                        commentActive={commentActive}
                        liked={liked}
                        onToggleComment={() => toggleChapterAction(chapter.id, setActiveCommentChapterIds)}
                        onToggleLike={() => toggleChapterAction(chapter.id, setLikedChapterIds)}
                      />
                    </div>
                  </div>

                  <div className="pointer-events-none relative z-[1] hidden flex-nowrap items-center justify-end gap-4 whitespace-nowrap text-right md:flex">
                    {locked ? (
                      <span className="flex shrink-0 flex-nowrap items-center gap-3 whitespace-nowrap">
                        <span className="manga-chapter-coin-value flex items-center gap-1.5 text-yellow-400">
                          <DetailCoin3DIcon size={18} className="h-[18px] w-[18px] object-contain" /> {chapter.price_coins}
                        </span>
                        {isFutureFree ? (
                          <PremiumUnlockTimer
                            chapterId={chapter.id}
                            targetDate={chapter.free_at!}
                            isLight={isLight}
                            onExpire={handleTimedUnlock}
                          />
                        ) : (
                          <span className="rounded border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                            Premium
                          </span>
                        )}
                        <LockKeyhole size={17} strokeWidth={1.8} className="manga-chapter-access-icon shrink-0" />
                      </span>
                    ) : (
                      <span className="shrink-0">
                        {isPurchased ? (
                          <span className="manga-chapter-purchased-status inline-flex items-center justify-center gap-1.5" aria-label="Comprado" title="Comprado">
                            <BadgeCheck className="manga-chapter-purchased-icon" strokeWidth={2.3} />
                            <span className="font-[Montserrat] text-[11px] font-semibold">Comprado</span>
                          </span>
                        ) : (
                          <span className="manga-chapter-free-access">Gratis</span>
                        )}
                      </span>
                    )}
                    <ChapterEngagement
                      commentActive={commentActive}
                      liked={liked}
                      onToggleComment={() => toggleChapterAction(chapter.id, setActiveCommentChapterIds)}
                      onToggleLike={() => toggleChapterAction(chapter.id, setLikedChapterIds)}
                    />
                  </div>

                </div>
              );
            })}
          </div>

          {totalChapters > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="manga-chapter-toggle mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-black/35 py-4 text-xs font-semibold text-white/40 transition-colors duration-300 hover:bg-black/50 hover:text-white/65"
            >
              {showAll ? (<> <ChevronUp size={14} /> Mostrar menos </>) : (<> <ChevronDown size={14} /> Mostrar todos </>)}
            </button>
          )}
        </div>
      </div>

      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmPurchase}
        onRecharge={() => {
          setIsModalOpen(false);
          setIsCoinModalOpen(true);
        }}
        chapterNumber={selectedChapter?.chapter_number ?? ''}
        price={selectedChapter?.price_coins || 0}
        userBalance={userCoins}
        loading={isProcessing}
        freeAt={selectedChapter?.free_at || null}
      />

      <CoinMarketModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        username={userInfo?.username || ''}
        userId={userInfo?.id || ''}
      />
    </>
  );
};
