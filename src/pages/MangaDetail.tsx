import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Bookmark,
  BookMarked,
  BookOpen,
  ChevronDown,
  Flame,
  Heart,
  Loader2,
  Share2,
  Star,
} from 'lucide-react';

import {
  getChaptersBySeries,
  getMangaById,
  getRelatedMangas,
  trackChapterView,
  type RelatedManga,
  type SeriesChapter,
} from '../services/mangaService';
import {
  getInteractions,
  toggleBookmarkWithTotal,
  toggleMangaLike,
  trackMangaShare,
} from '../services/interactionsService';
import {
  getStoredToken,
  getStoredUser,
  getUnlockedChapters,
  refreshUser,
} from '../services/authService';
import type { MangaCapitulo } from '../types/manga';
import {
  DetailCalendarIcon,
  DetailCollectionIcon,
  DetailOpenBook3DIcon,
  DetailPlatformIcon,
  DetailPublicationIcon,
  DetailStudioIcon,
  MangaDetailClock,
} from '../components/common';
import { ChapterList, MangaComments, MangaMusicCard } from '../components/manga';
import { Footer } from '../components/layout';
import { FOOTER_SOCIALS } from '../components/layout/Footer';
import { useTheme } from '../hooks/useTheme';
import { finishGlobalLoading, startGlobalLoading, updateGlobalLoading } from '../utils/globalLoading';
import { preloadImages } from '../utils/preloadImages';

const MANGA_DETAIL_REFERENCE_TIME = Date.now();

const formatCompactNumber = (value: number) => new Intl.NumberFormat('es-PE', {
  notation: value >= 1000 ? 'compact' : 'standard',
  maximumFractionDigits: 1,
}).format(value);

const formatDate = (value?: string, fallback = 'N/A') => {
  if (!value) return fallback;
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const cleanSynopsis = (title: string, synopsis?: string) => {
  const trimmed = synopsis?.trim() || '';
  if (!trimmed) return '';
  if (trimmed.toLocaleLowerCase('es').startsWith(title.trim().toLocaleLowerCase('es'))) {
    return trimmed.slice(title.trim().length).trim();
  }
  return trimmed;
};

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="manga-detail-meta-item group flex min-h-[72px] min-w-0 items-center gap-4 border-b border-white/10 px-5 py-4 last:border-b-0">
      <span className="manga-detail-meta-icon shrink-0 text-white/55 transition-colors group-hover:text-[#FF4D88] [&>svg]:h-7 [&>svg]:w-7">{icon}</span>
      <div className="min-w-0">
        <p className="manga-detail-meta-label manga-detail-ui-label text-[10px] uppercase text-white/50">{label}</p>
        <p className="manga-detail-meta-value manga-detail-ui-label mt-1 truncate text-[13px] text-white/85">{value || 'N/A'}</p>
      </div>
    </div>
  );
}

function EngagementCard({
  icon,
  label,
  value,
  active = false,
  onClick,
  progressClassName = 'from-[#FF4D88] to-[#ff8bb1]',
  progressDelay = 0.2,
  accentColor = '#FF4D88',
}: {
  icon: ReactNode;
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
  progressClassName?: string;
  progressDelay?: number;
  accentColor?: string;
}) {
  const progressPercent = value > 0
    ? Math.min(94, 18 + Math.log10(value + 1) * 48)
    : 0;

  const content = (
    <>
      <div className="min-w-0 flex-1 pr-3">
        <p className="manga-detail-engagement-label text-[10px] uppercase text-white/55">{label}</p>
        <p className="manga-detail-engagement-value mt-1.5 font-mono text-xl font-black text-white">{formatCompactNumber(value)}</p>
        <div className="manga-detail-engagement-progress mt-2.5 h-3.5 w-full overflow-hidden rounded-full p-[2px]">
          <motion.span
            key={`${label}-${value}`}
            aria-hidden="true"
            className={`relative block h-full overflow-hidden rounded-full bg-gradient-to-r ${progressClassName}`}
            initial={{ opacity: 0.35, width: 0 }}
            animate={{ opacity: 1, width: `${progressPercent}%` }}
            transition={{ delay: progressDelay, duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-18deg] bg-white/55 blur-[1px]"
              initial={{ x: '0%' }}
              animate={{ x: '320%' }}
              transition={{ delay: progressDelay + 0.35, duration: 0.9, ease: 'easeOut' }}
            />
          </motion.span>
        </div>
      </div>
      <span className="manga-detail-engagement-icon flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/30 transition-all">
        {icon}
      </span>
    </>
  );

  const className = 'manga-detail-engagement group flex min-h-[96px] w-full items-center justify-between rounded-xl border border-white/[0.07] bg-black/50 px-3 py-4 text-left shadow-[0_14px_35px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#FF4D88]/20 hover:bg-black';

  return onClick ? (
    <button type="button" onClick={onClick} className={className} aria-pressed={active} style={{ '--engagement-accent': accentColor } as CSSProperties}>{content}</button>
  ) : (
    <div className={className} style={{ '--engagement-accent': accentColor } as CSSProperties}>{content}</div>
  );
}

function RelatedCard({ manga, isLight, isClone = false }: { manga: RelatedManga; isLight: boolean; isClone?: boolean }) {
  return (
    <article
      className="biblioteca-cover-card group min-w-0"
      style={{ '--card-accent': '#FF4D88' } as CSSProperties}
    >
      <Link to={`/manga/${manga.id}`} tabIndex={isClone ? -1 : undefined} className="block">
        <div className={`biblioteca-cover-card-surface relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-[0_14px_34px_rgba(0,0,0,0.18)] ${isLight ? 'biblioteca-cover-card-light' : 'biblioteca-cover-card-dark'}`}>
          <img
            src={manga.portada}
            alt={manga.titulo}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
          <div className={isLight ? 'absolute inset-x-0 bottom-0 h-[36%] bg-gradient-to-t from-white via-white/85 to-transparent' : 'absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent opacity-90 transition-opacity duration-300'} />
          <div className={`biblioteca-cover-top-shade ${isLight ? 'biblioteca-cover-top-shade-light' : 'biblioteca-cover-top-shade-dark'}`} />

          <span className={`absolute left-2 top-2 flex items-center gap-1 rounded-md border px-1.5 py-1 text-[8px] font-black shadow-lg backdrop-blur-md sm:left-2.5 sm:top-2.5 sm:text-[9px] ${isLight ? 'border-black/10 bg-white/85 text-zinc-950' : 'border-white/15 bg-black/70 text-white'}`}>
            <Star size={10} className="shrink-0 fill-[#FF4D88] text-[#FF4D88]" />
            10
          </span>
          {manga.tipo && (
            <span className={`absolute right-2 top-2 max-w-[34%] truncate rounded-md border px-1.5 py-1 text-[8px] font-black uppercase shadow-lg backdrop-blur-md sm:right-2.5 sm:top-2.5 sm:text-[9px] ${isLight ? 'border-black/10 bg-white/85 text-zinc-950' : 'border-white/15 bg-black/70 text-white'}`}>
              {manga.tipo}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-12 sm:px-4 sm:pb-4">
            <h3 className={`line-clamp-2 text-center text-[11px] font-[900] uppercase leading-snug tracking-tight transition-colors group-hover:text-[var(--card-accent)] sm:text-xs ${isLight ? 'text-zinc-950 [text-shadow:0_1px_10px_rgba(255,255,255,.95)]' : 'text-white [text-shadow:0_2px_12px_rgba(0,0,0,.95)]'}`}>
              {manga.titulo}
            </h3>
          </div>
        </div>
      </Link>
    </article>
  );
}

function RelatedSection({ related, currentId, isLight }: { related: RelatedManga[]; currentId: number | string; isLight: boolean }) {
  const [isTouchPaused, setIsTouchPaused] = useState(false);
  const items = related.filter((item) => String(item.id) !== String(currentId));
  const marqueeItems = items.length === 0
    ? []
    : Array.from({ length: Math.max(12, items.length) }, (_, index) => items[index % items.length]);
  if (items.length === 0) return null;

  return (
    <section className="relative left-1/2 w-[calc(100%+2rem)] -translate-x-1/2 py-12 md:w-[calc(100%+4rem)] md:py-16 xl:w-[calc(100%+6.5rem)]" aria-labelledby="related-title">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-[#FF4D88] shadow-[0_0_18px_rgba(255,77,136,0.65)]" />
          <Flame size={21} className="text-[#FF4D88]" fill="currentColor" />
          <h2 id="related-title" className={`text-xl font-black uppercase italic tracking-tight md:text-2xl ${isLight ? 'text-black' : 'text-white'}`}>
            Lecturas relacionadas
          </h2>
        </div>
      </div>

      <div
        className="-mx-2 touch-pan-y overflow-hidden py-4"
        aria-label="Lecturas relacionadas en movimiento continuo"
        onTouchStart={() => setIsTouchPaused(true)}
        onTouchEnd={() => setIsTouchPaused(false)}
        onTouchCancel={() => setIsTouchPaused(false)}
      >
        <div className="home-popular-marquee-track" style={isTouchPaused ? { animationPlayState: 'paused' } : undefined}>
          {[0, 1].map((copyIndex) => (
            <div key={`related-sequence-${copyIndex}`} className="home-popular-marquee-sequence" aria-hidden={copyIndex === 1 ? true : undefined}>
              {marqueeItems.map((manga, index) => (
                <div key={`${copyIndex}-${manga.id}-${index}`} className="home-popular-marquee-card">
                  <RelatedCard manga={manga} isLight={isLight} isClone={copyIndex === 1} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLightMode = theme === 'light';

  const [manga, setManga] = useState<MangaCapitulo | null>(null);
  const [chapters, setChapters] = useState<SeriesChapter[]>([]);
  const [related, setRelated] = useState<RelatedManga[]>([]);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [userCoins, setUserCoins] = useState(0);
  const [userInfo, setUserInfo] = useState<{ id: string; username: string }>({ id: '', username: '' });
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [interactionBusy, setInteractionBusy] = useState<'bookmark' | 'like' | ''>('');
  const [shareFeedback, setShareFeedback] = useState('');
  const [engagement, setEngagement] = useState({ online: 0, bookmarks: 0, likes: 0, shares: 0 });

  const loadUser = useCallback(async () => {
    const stored = getStoredUser();
    const token = getStoredToken();
    if (stored && token) {
      setUserInfo({ id: String(stored.id), username: stored.username });
      setUserCoins(stored.coins || 0);
    } else {
      setUserInfo({ id: '', username: '' });
      setUserCoins(0);
    }

    if (!token) {
      setPurchasedIds(new Set());
      return;
    }

    const [fresh, unlocked] = await Promise.all([refreshUser(), getUnlockedChapters()]);
    if (fresh) {
      setUserInfo({ id: String(fresh.id), username: fresh.username });
      setUserCoins(fresh.coins || 0);
    } else if (!getStoredToken()) {
      setUserInfo({ id: '', username: '' });
      setUserCoins(0);
      setPurchasedIds(new Set());
      return;
    }
    setPurchasedIds(unlocked);
  }, []);

  const loadInteractions = useCallback(async (mangaId: string) => {
    const interactions = await getInteractions(mangaId);
    if (!interactions) return;

    setIsBookmarked(interactions.bookmarks?.some((item) => String(item) === mangaId) || false);
    setIsLiked(interactions.likes?.some((item) => String(item) === mangaId) || false);
    setEngagement({
      online: Number(interactions.online_readers || 0),
      bookmarks: Number(interactions.manga_bookmarks || 0),
      likes: Number(interactions.manga_likes || 0),
      shares: Number(interactions.manga_shares || 0),
    });
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    startGlobalLoading(10);
    setLoading(true);
    setError(null);
    setManga(null);
    setChapters([]);
    setRelated([]);
    setSynopsisExpanded(false);
    setChaptersLoading(true);
    setEngagement({ online: 0, bookmarks: 0, likes: 0, shares: 0 });

    const fetchData = async () => {
      try {
        const mangaData = await getMangaById(id);
        if (!active) return;
        if (!mangaData) {
          setError('Manga no encontrado.');
          setLoading(false);
          setChaptersLoading(false);
          finishGlobalLoading();
          return;
        }

        setManga(mangaData);
        updateGlobalLoading(36);
        const mangaPostId = mangaData.eroSeri || mangaData.id;

        const [chapterData, relatedData] = await Promise.all([
          getChaptersBySeries(mangaPostId),
          getRelatedMangas(mangaPostId, 18),
          loadInteractions(String(mangaData.id)),
        ]);
        if (!active) return;
        updateGlobalLoading(74);
        await preloadImages([
          mangaData.portada,
          ...relatedData.slice(0, 10).map((item) => item.portada),
        ]);
        if (!active) return;
        setChapters(chapterData);
        setRelated(relatedData);
        setLoading(false);
        setChaptersLoading(false);
        finishGlobalLoading();
      } catch (requestError) {
        console.error('Error MangaDetail:', requestError);
        if (active) {
          setError('No se pudo cargar el manga.');
          setLoading(false);
          setChaptersLoading(false);
          finishGlobalLoading();
        }
      }
    };

    void fetchData();
    return () => {
      active = false;
      finishGlobalLoading();
    };
  }, [id, loadInteractions]);

  const firstChapter = useMemo(() => [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)[0], [chapters]);

  const goToLogin = () => {
    navigate('/auth/login', {
      state: { returnTo: `${window.location.pathname}${window.location.search}` },
    });
  };

  const handleReadFirst = () => {
    if (!manga || !firstChapter) return;
    void trackChapterView(firstChapter.id, manga.id);
    navigate(`/read/${firstChapter.id}`);
  };

  const handleBookmark = async () => {
    if (!manga || interactionBusy) return;
    if (!getStoredToken()) {
      goToLogin();
      return;
    }

    setInteractionBusy('bookmark');
    const result = await toggleBookmarkWithTotal(String(manga.id));
    if (result) {
      setIsBookmarked(result.action === 'added');
      setEngagement((current) => ({ ...current, bookmarks: result.total }));
    }
    setInteractionBusy('');
  };

  const handleLike = async () => {
    if (!manga || interactionBusy) return;
    if (!getStoredToken()) {
      goToLogin();
      return;
    }

    setInteractionBusy('like');
    const result = await toggleMangaLike(String(manga.id));
    if (result) {
      setIsLiked(result.action === 'added');
      setEngagement((current) => ({ ...current, likes: result.total }));
    }
    setInteractionBusy('');
  };

  const handleShare = async () => {
    if (!manga) return;
    const shareData = {
      title: manga.titulo,
      text: `Lee ${manga.titulo} en MangaMukai`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback('Compartido');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareFeedback('Enlace copiado');
      }
      const total = await trackMangaShare(String(manga.id));
      if (total !== null) setEngagement((current) => ({ ...current, shares: total }));
      window.setTimeout(() => setShareFeedback(''), 2400);
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setShareFeedback('No se pudo copiar');
      window.setTimeout(() => setShareFeedback(''), 2400);
    }
  };

  const handlePurchaseSuccess = useCallback(() => {
    void loadUser();
  }, [loadUser]);

  if (loading) {
    return <div className="min-h-screen bg-[#02040a]" />;
  }

  if (error || !manga) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#02040a] px-4 text-center text-white">
        <BookOpen size={52} className="text-white/15" />
        <div>
          <h1 className="text-2xl font-black uppercase italic">Historia no disponible</h1>
          <p className="mt-2 text-sm text-white/45">{error || 'Manga no encontrado.'}</p>
        </div>
        <button onClick={() => navigate(-1)} className="rounded-xl bg-[#FF4D88] px-6 py-3 text-xs font-black uppercase tracking-wider text-white">
          Volver
        </button>
      </div>
    );
  }

  const genres = manga.genres || [];
  const synopsis = cleanSynopsis(manga.titulo, manga.descripcion);
  const publishedDate = manga.publishedAt || manga.rawFecha;
  const releaseDate = manga.fechaManga || formatDate(manga.rawFecha, manga.fecha);
  const releaseTime = manga.rawFecha ? new Date(manga.rawFecha.replace(' ', 'T')).getTime() : 0;
  const isNewRelease = releaseTime > 0 && MANGA_DETAIL_REFERENCE_TIME - releaseTime < 1000 * 60 * 60 * 24 * 45;

  return (
    <main className={`manga-detail-page min-h-screen overflow-hidden transition-colors duration-500 ${isLightMode ? 'manga-detail-theme-light home-theme-light bg-white text-black' : 'manga-detail-theme-dark home-theme-dark bg-black text-white'}`}>
      <section className="manga-detail-hero relative isolate overflow-hidden border-b border-white/[0.06] pb-20 pt-24 transition-colors duration-700 md:pb-28 md:pt-32">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={manga.portada}
            alt=""
            aria-hidden="true"
            className="manga-detail-backdrop-image home-theme-backdrop-image absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="home-hero-theme-scrim absolute inset-0" />
        </div>

        <div className="desktop-content-shell relative z-10 mx-auto w-full max-w-[1400px] px-4 md:px-8">
          <div className="manga-detail-hero-utilities mb-7 flex flex-col gap-5 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between lg:mb-9">
            <div className="mx-auto w-full max-w-[278px] sm:mx-0 lg:max-w-[250px] xl:max-w-[278px]">
              <MangaDetailClock isLight={isLightMode} />
            </div>
            <div className="flex flex-col items-center sm:max-w-[360px]">
              <p className="manga-detail-social-prompt mb-1 text-[13px] text-white/75">¡No olvides seguirnos!</p>
              <div className="flex flex-wrap items-center justify-center gap-1" aria-label="Redes sociales de MangaMukai">
                {FOOTER_SOCIALS.map(({ name, href, icon: SocialIcon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name}
                    title={name}
                    className="manga-detail-social-link flex h-10 w-8 items-center justify-center bg-transparent text-white transition-all hover:-translate-y-0.5 hover:text-[#FF4D88]"
                  >
                    <SocialIcon size={22} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="manga-detail-layout relative grid gap-7 md:gap-9 lg:min-h-[800px] lg:content-start lg:grid-cols-[minmax(0,1fr)_270px] lg:grid-rows-[auto_auto_auto] lg:items-start lg:gap-x-7 lg:gap-y-4 lg:pl-[277px] xl:grid-cols-[minmax(0,1fr)_310px] xl:gap-x-10 xl:pl-[318px]">
            <motion.header
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04, duration: 0.5 }}
              className="manga-detail-info-header order-1 min-w-0 border-b border-white/10 pb-5 lg:col-[1/3] lg:row-start-1 lg:self-start"
            >
              <h1 className="manga-detail-title line-clamp-2 max-w-5xl text-[clamp(1.5rem,3.2vw,3.2rem)] font-black uppercase italic leading-[0.95] tracking-[-0.04em] text-white [text-wrap:balance]">
                {manga.titulo}
              </h1>
              {genres.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span aria-hidden="true" className="manga-detail-genre-hash -mr-1 text-lg font-black leading-none text-[#FF4D88]">#</span>
                  {genres.slice(0, 10).map((genre) => (
                    <Link
                      key={genre}
                      to={`/biblioteca?genre=${encodeURIComponent(genre)}`}
                      className="manga-detail-genre rounded-md border border-white/[0.08] bg-black/30 px-2.5 py-1.5 text-[9px] font-bold uppercase text-white backdrop-blur-sm transition-all hover:border-[#FF4D88]/35 hover:bg-[#FF4D88]/10 hover:text-[#FF4D88]"
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              )}

              <div className="manga-detail-original-slot mt-4 w-full max-w-5xl rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 backdrop-blur-sm">
                <p className="manga-detail-original-slot-label text-[11px] font-semibold text-white/65">Título Original</p>
                <div aria-hidden="true" className="mt-2 min-h-5" />
              </div>
            </motion.header>

            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="order-2 mx-auto w-full max-w-[278px] lg:absolute lg:left-0 lg:top-0 lg:mx-0 lg:w-[250px] xl:w-[278px]"
            >
              <div className="manga-detail-cover relative aspect-[3/4.38] overflow-hidden rounded-2xl">
                <img src={manga.portada} alt={`Portada de ${manga.titulo}`} className="h-full w-full object-cover" />
                <div className="manga-detail-cover-shadow absolute inset-x-0 bottom-0 h-28" />
                <div className="manga-detail-ui-label absolute left-0 top-1/2 flex -translate-y-1/2 flex-col items-start gap-1.5 text-xs uppercase text-white">
                  <span className="rotate-180 rounded-l-md bg-violet-600 px-2.5 py-3 shadow-lg [text-orientation:mixed] [writing-mode:vertical-rl]">Color</span>
                  <span className="rotate-180 rounded-l-md bg-[#FF4D88] px-2.5 py-3 shadow-lg [text-orientation:mixed] [writing-mode:vertical-rl]">{manga.tipo || 'Manga'}</span>
                </div>
                {isNewRelease && (
                  <span className="absolute right-3 top-3 w-fit rounded-md bg-[#FF4D88] px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white shadow-xl">
                    Estreno
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={interactionBusy !== ''}
                  aria-label={isLiked ? 'Quitar Me gusta' : 'Me gusta'}
                  title={isLiked ? 'Quitar Me gusta' : 'Me gusta'}
                  className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-60 ${isLiked ? 'border-[#FF4D88]/60 bg-[#FF4D88] text-white' : 'border-white/20 bg-black/55 text-white hover:border-[#FF4D88]/60 hover:text-[#FF4D88]'}`}
                >
                  {interactionBusy === 'like' ? <Loader2 size={19} className="animate-spin" /> : <Heart size={19} fill={isLiked ? 'currentColor' : 'none'} />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleReadFirst}
                disabled={chaptersLoading || !firstChapter}
                className="manga-detail-ui-label mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e71f69] to-[#FF4D88] px-5 py-3.5 text-[11px] uppercase text-white shadow-[0_16px_35px_rgba(255,77,136,0.24)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <DetailOpenBook3DIcon
                  size={24}
                  className="h-6 w-6 shrink-0 object-contain"
                />
                Comenzar lectura
              </button>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleBookmark}
                  className={`manga-detail-secondary-button manga-detail-ui-label flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[9px] uppercase transition-all ${isBookmarked ? 'border-[#FF4D88]/35 bg-[#FF4D88]/15 text-[#FF4D88]' : 'border-white/10 bg-white text-black hover:bg-[#FF4D88] hover:text-white'}`}
                >
                  {interactionBusy === 'bookmark' ? <Loader2 size={15} className="animate-spin" /> : isBookmarked ? <BookMarked size={15} /> : <Bookmark size={15} />}
                  {isBookmarked ? 'Guardado' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="manga-detail-secondary-button manga-detail-ui-label flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-3 py-3 text-[9px] uppercase text-black transition-all hover:bg-[#FF4D88] hover:text-white"
                >
                  <Share2 size={15} /> {shareFeedback || 'Compartir'}
                </button>
              </div>

              <div className="mt-5">
                <MangaMusicCard cover={manga.portada} compactHeight isLight={isLightMode} />
              </div>
            </motion.aside>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="order-3 min-w-0 lg:col-start-1 lg:row-start-2 lg:w-[calc(100%+14px)] xl:w-[calc(100%+18px)]"
            >
              {synopsis && (
                <div className={`manga-detail-synopsis relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b]/80 shadow-[0_24px_65px_rgba(0,0,0,0.3)] backdrop-blur-md ${synopsisExpanded ? 'min-h-[290px]' : 'h-[320px] lg:h-[290px]'}`}>
                  <div className="manga-detail-synopsis-header flex items-center gap-2 border-b border-white/[0.06] px-5 py-4">
                    <span className="h-4 w-1 rounded-full bg-[#FF4D88]" />
                    <h2 className="manga-detail-synopsis-title manga-detail-ui-label text-xs uppercase text-white/80">Sinopsis</h2>
                  </div>
                  <div className="relative flex flex-1 flex-col px-5 pb-4 pt-3 sm:px-6">
                    <p className={`manga-detail-synopsis-copy text-justify text-sm leading-7 text-white/60 md:text-[15px] ${synopsisExpanded ? '' : 'line-clamp-[7]'}`}>
                      {synopsis}
                    </p>
                    {!synopsisExpanded && <div className="manga-detail-synopsis-fade pointer-events-none absolute inset-x-0 bottom-0 h-24" />}
                    {synopsis.length > 330 && (
                      <button
                        type="button"
                        onClick={() => setSynopsisExpanded((current) => !current)}
                        className={`manga-detail-ui-label z-10 flex items-center gap-2 text-[10px] text-[#FF4D88] transition-colors hover:text-white ${synopsisExpanded ? 'relative mx-auto mt-5' : 'absolute bottom-6 left-1/2 -translate-x-1/2'}`}
                      >
                        {synopsisExpanded ? 'Ver menos' : 'Leer completo'}
                        <ChevronDown size={14} className={`transition-transform ${synopsisExpanded ? 'rotate-180' : 'animate-bounce'}`} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.16, duration: 0.5 }}
              className="manga-detail-dashboard order-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-black shadow-[0_24px_65px_rgba(0,0,0,0.24)] lg:col-start-2 lg:row-start-2"
            >
              <div className="manga-detail-meta grid grid-cols-1 gap-0">
                <MetaItem icon={<DetailCalendarIcon size={30} />} label="Fecha" value={releaseDate} />
                <MetaItem icon={<DetailStudioIcon size={30} />} label="Estudio" value={manga.studio || 'N/A'} />
                <MetaItem icon={<DetailPlatformIcon size={30} />} label="Plataforma" value={manga.platform || 'N/A'} />
                <MetaItem icon={<DetailPublicationIcon size={30} />} label="Publicación" value={formatDate(publishedDate)} />
              </div>
            </motion.aside>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className="order-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:col-[1/3] lg:row-start-3"
            >
              <EngagementCard icon={<Activity size={17} />} label="Lectores en línea" value={engagement.online} progressClassName="from-[#FF4D88] to-[#ff8bb1] group-hover:from-[#FF4D88] group-hover:to-[#ff8bb1]" progressDelay={0.2} accentColor="#FF4D88" />
              <EngagementCard icon={<DetailCollectionIcon size={19} />} label="En colección" value={engagement.bookmarks} active={isBookmarked} onClick={handleBookmark} progressClassName="from-[#FF4D88] to-[#ff8bb1] group-hover:from-violet-500 group-hover:to-purple-300" progressDelay={0.32} accentColor="#a78bfa" />
              <EngagementCard icon={<Heart size={17} fill={isLiked ? 'currentColor' : 'none'} />} label="Likes" value={engagement.likes} active={isLiked} onClick={handleLike} progressClassName="from-[#FF4D88] to-[#ff8bb1] group-hover:from-lime-500 group-hover:to-green-400" progressDelay={0.44} accentColor="#65a30d" />
              <EngagementCard icon={<Share2 size={17} />} label="Compartidos" value={engagement.shares} onClick={handleShare} progressClassName="from-[#FF4D88] to-[#ff8bb1] group-hover:from-sky-500 group-hover:to-cyan-300" progressDelay={0.56} accentColor="#38bdf8" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="manga-detail-chapters desktop-content-shell mx-auto w-full max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        {chaptersLoading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-white/30">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cargando capítulos</span>
          </div>
        ) : (
          <ChapterList
            chapters={chapters}
            purchasedChapterIds={purchasedIds}
            userCoins={userCoins}
            userInfo={userInfo}
            onPurchaseSuccess={handlePurchaseSuccess}
            isLight={isLightMode}
          />
        )}

        <RelatedSection related={related} currentId={manga.id} isLight={isLightMode} />
      </section>

      <MangaComments mangaId={String(manga.id)} isLight={isLightMode} />
      <Footer />
    </main>
  );
};
