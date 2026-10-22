import { hasHotTag } from '../utils/womenBlackWhite';
import { buildMangaRecommendations } from '../utils/mangaRecommendations';
import { SaveButton } from '../components/ui/SaveButton';
import { GooeySelector } from '../components/ui/GooeySelector';
import { createQueuedLike } from '../utils/queuedLike';
import { readGuestMangaLike } from '../utils/guestMangaLikes';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ChevronDown } from 'lucide-react';

import {
  getChaptersBySeries,
  getMangaById,
  getRelatedMangas,
  getUltimosCapitulos,
  trackChapterView,
  type RelatedManga,
  type SeriesChapter,
} from '../services/mangaService';
import {
  getInteractions,
  toggleMangaLike,
} from '../services/interactionsService';
import { seedSavedMangas, toggleSavedManga } from '../services/savedMangas';
import { getMangaComments, getEntityReactions, setEntityReaction, type MangaComment } from '../services/communityService';
import {
  getStoredToken,
  getStoredUser,
  getUnlockedChapters,
  refreshUser,
} from '../services/authService';
import type { MangaCapitulo } from '../types/manga';
import { ChapterList, MangaComments, MangaMusicCard, MangaRecommendations } from '../components/manga';
import { MobileMangaDetail } from '../components/manga/mobile/MobileMangaDetail';
import HoloCard from '../components/manga/HoloCard';
import {
  PaletteIcon,
  PlatformIcon,
  PublishedIcon,
  SearchIcon,
  SortDownIcon,
  SortUpIcon,
  StudioIcon,
  TypeIcon,
  ChaptersTabIcon,
  SynopsisTabIcon,
  CommentsTabIcon,
} from '../components/manga/designIcons';
import { MANGA_REACTIONS, ReactionButton, ReactionRingGradient, createReactionCounts, type MangaReactionId } from '../components/manga/reactions';
import { useIsMobileViewport } from '../hooks/useIsMobileViewport';
import { MangaDetailClock } from '../components/common';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../hooks/useTheme';
import { toTitleCase } from '../utils/titleCase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getKnownMangaTitle } from '../services/mangaTitles';
import { collectionBadge } from '../utils/womenBlackWhite';
import { whenIdle } from '../utils/whenIdle';
import { mangaReaderSession } from '../services/readerPrefetchSession';
import { peekPreparedMangaDetail } from '../services/homeNavigationPrefetch';
import { ensureMusicLibrary } from '../services/musicPlayer';
import { MangaCommunityLinks } from '../components/manga/MangaCommunityLinks';
import { MangaSeasonSelector } from '../components/manga/MangaSeasonSelector';
import { MangaSeriesLikeButton } from '../components/manga/MangaSeriesLikeButton';
import { MangaRewardProgress } from '../components/manga/MangaRewardProgress';
import { MangaDetailSocials } from '../components/manga/MangaDetailSocials';
import { DetailViewsIcon } from '../components/manga/referenceIcons';

const formatCompactNumber = (value: number) => new Intl.NumberFormat('es-PE', {
  notation: value >= 1000 ? 'compact' : 'standard',
  maximumFractionDigits: 1,
}).format(value);

const guestReactionKey = (mangaId: string | number) => `mm_manga_guest_reaction:${mangaId}`;

const readGuestReaction = (mangaId: string | number): MangaReactionId | null => {
  try {
    const stored = window.localStorage.getItem(guestReactionKey(mangaId));
    return MANGA_REACTIONS.find(({ id }) => id === stored)?.id ?? null;
  } catch {
    return null;
  }
};

const saveGuestReaction = (mangaId: string | number, reaction: MangaReactionId | null) => {
  try {
    if (reaction) window.localStorage.setItem(guestReactionKey(mangaId), reaction);
    else window.localStorage.removeItem(guestReactionKey(mangaId));
  } catch {

  }
};

const withGuestReaction = (counts: Record<MangaReactionId, number>, reaction: MangaReactionId | null) => {
  if (!reaction) return counts;
  return { ...counts, [reaction]: counts[reaction] + 1 };
};

const formatDate = (value?: string, fallback = 'N/A') => {
  if (!value) return fallback;
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
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

const typeDotColor = (type = '') => {
  const normalized = type.toLocaleLowerCase('es');
  if (normalized.includes('manhua')) return '#22C55E';
  if (normalized.includes('manhwa')) return '#B000AD';
  if (normalized.includes('comic')) return '#38BDF8';
  return '#FF008C';
};

const MetaRow = ({ icon, label, value, dotColor }: { icon: ReactNode; label: string; value: string; dotColor?: string }) => (
  <div className="flex min-h-[37px] items-center gap-2.5 text-ink">
    <span className="flex w-[26px] shrink-0 items-center justify-center">{icon}</span>
    <span className="shrink-0 font-montserrat text-base font-extrabold leading-4 tracking-tight">{label}</span>
    <span className="ml-auto inline-flex min-w-0 items-center gap-2 text-right font-montserrat text-base font-normal leading-4 tracking-tight">
      {dotColor && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 animate-dot-blink rounded-full motion-reduce:animate-none" style={{ backgroundColor: dotColor }} />}
      <span className="truncate">{value || 'N/A'}</span>
    </span>
  </div>
);

const BADGE = 'manga-detail-badge';

const tabClass = (active = false) => `manga-detail-tab ${active ? 'is-active' : ''}`;

export const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const isMobile = useIsMobileViewport();

  const prepared = id ? peekPreparedMangaDetail(id) : undefined;
  const [manga, setManga] = useState<MangaCapitulo | null>(() => prepared?.manga ?? null);
  const [chapters, setChapters] = useState<SeriesChapter[]>(() => prepared?.chapters ?? []);
  const [related, setRelated] = useState<RelatedManga[]>(() => prepared?.related ?? []);
  const [initialComments, setInitialComments] = useState<MangaComment[]>(() => prepared?.comments ?? []);
  const [loading, setLoading] = useState(!prepared);
  const [chaptersLoading, setChaptersLoading] = useState(!prepared?.chapters);
  const [commentsLoading, setCommentsLoading] = useState(!prepared?.comments);
  const [relatedLoading, setRelatedLoading] = useState(!prepared?.related);
  const [secondaryReady, setSecondaryReady] = useState(!!prepared);
  const [commentsError, setCommentsError] = useState('');
  const [chaptersError, setChaptersError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [synopsisHasOverflow, setSynopsisHasOverflow] = useState(false);
  const [activeContent, setActiveContent] = useState<'chapters' | 'synopsis' | 'comments'>('chapters');
  const [tabIndex, setTabIndex] = useState(0);
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterSortOrder, setChapterSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReaction, setSelectedReaction] = useState<MangaReactionId | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<MangaReactionId, number>>(createReactionCounts);
  const guestReactionRef = useRef<MangaReactionId | null>(null);

  const reactionSequence = useRef(0);
  const [reactionError, setReactionError] = useState('');

  const [tracingReaction, setTracingReaction] = useState<MangaReactionId | null>(null);

  useEffect(() => {
    if (!manga?.id) return;
    let active = true;
    const isGuest = !getStoredToken();
    const guestReaction = isGuest ? readGuestReaction(manga.id) : null;
    guestReactionRef.current = guestReaction;
    setReactionError('');
    if (isGuest) {
      setSelectedReaction(guestReaction);
      setReactionCounts(withGuestReaction(createReactionCounts(), guestReaction));
    }
    void getEntityReactions('manga', manga.id).then(result => {
      if (!active) return;
      const counts = { ...createReactionCounts(), ...result.reactions };
      setReactionCounts(isGuest ? withGuestReaction(counts, guestReactionRef.current) : counts);
      setSelectedReaction(isGuest ? guestReactionRef.current : (result.my_reaction || null) as MangaReactionId | null);
    }).catch(() => { if (active && !isGuest) setReactionError('No se pudieron cargar las reacciones.'); });
    return () => { active = false; };
  }, [manga?.id]);

  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [userCoins, setUserCoins] = useState(0);
  const [userInfo, setUserInfo] = useState<{ id: string; username: string }>({ id: '', username: '' });

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const likeQueueRef = useRef<ReturnType<typeof createQueuedLike> | null>(null);
  useEffect(() => {
    likeQueueRef.current = null;
    return () => { likeQueueRef.current?.dispose(); likeQueueRef.current = null; };
  }, [id]);
  const [interactionBusy, setInteractionBusy] = useState<'bookmark' | 'like' | ''>('');
  const [engagement, setEngagement] = useState({ online: 0, bookmarks: 0, likes: 0 });
  useEffect(() => {
    if (!manga?.id || getStoredToken()) return;
    const liked = readGuestMangaLike(String(manga.id));
    setIsLiked(liked);
    setEngagement((current) => ({ ...current, likes: Number(liked) }));
  }, [manga?.id]);
  const synopsisRef = useRef<HTMLParagraphElement>(null);
  const coverColumnRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const coverColumn = coverColumnRef.current;
    const sidebar = sidebarRef.current;
    if (loading || isMobile || !coverColumn || !sidebar) return;

    const alignSidebar = () => {
      sidebar.style.setProperty('--manga-sidebar-height', `${coverColumn.getBoundingClientRect().height}px`);
    };
    alignSidebar();
    const observer = new ResizeObserver(alignSidebar);
    observer.observe(coverColumn, { box: 'border-box' });
    return () => observer.disconnect();
  }, [loading, isMobile, manga?.id]);

  useEffect(() => {
    setSynopsisExpanded(false);
    setSynopsisHasOverflow(false);
  }, [id]);

  useLayoutEffect(() => {
    if (activeContent !== 'synopsis' || synopsisExpanded || !synopsisRef.current) return;
    const paragraph = synopsisRef.current;
    let frameId = 0;
    const measureOverflow = () => {
      setSynopsisHasOverflow(paragraph.scrollHeight > paragraph.clientHeight + 1);
    };
    frameId = window.requestAnimationFrame(measureOverflow);
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(paragraph);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [activeContent, synopsisExpanded, manga?.descripcion]);

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

  const loadInteractions = useCallback(async (mangaId: string, isActive: () => boolean = () => true) => {
    const interactions = await getInteractions(mangaId);
    if (!interactions || !isActive()) return;

    setIsBookmarked(interactions.bookmarks?.some((item) => String(item) === mangaId) || false);

    seedSavedMangas(interactions.bookmarks ?? []);
    if (!likeQueueRef.current) setIsLiked(interactions.likes?.some((item) => String(item) === mangaId) || false);
    setEngagement((current) => ({
      online: Number(interactions.online_readers || 0),
      bookmarks: Number(interactions.manga_bookmarks || 0),
      likes: likeQueueRef.current ? current.likes : Number(interactions.manga_likes || 0),
    }));
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const seoManga = manga && String(manga.id) === id ? manga : null;
  useDocumentTitle(
    seoManga?.titulo || (id ? getKnownMangaTitle(id) : undefined),
    seoManga
      ? `Lee ${seoManga.titulo} en español en MangaMukai. ${cleanSynopsis(seoManga.titulo, seoManga.descripcion).replace(/\s+/g, ' ') || 'Consulta su sinopsis y todos los capítulos disponibles.'}`.slice(0, 200)
      : undefined,
    { path: `/manga/${id}`, image: seoManga?.portada, adult: seoManga ? hasHotTag(seoManga) : undefined, noindex: seoManga ? false : !loading && !manga ? true : undefined },
  );

  useEffect(() => {
    if (!id) return;
    let active = true;
    const initial = peekPreparedMangaDetail(id);
    setLoading(!initial);
    setChaptersLoading(!initial?.chapters);
    setCommentsLoading(!initial?.comments);
    setRelatedLoading(!initial?.related);
    setCommentsError('');
    setChaptersError('');
    setSecondaryReady(!!initial);
    let cancelSecondary = () => {};
    const commentsController = new AbortController();
    setError(null);
    setManga(initial?.manga ?? null);
    setChapters(initial?.chapters ?? []);
    setRelated(initial?.related ?? []);
    setInitialComments(initial?.comments ?? []);
    setSynopsisExpanded(false);
    setActiveContent('chapters');
    setTabIndex(0);
    setChapterSearch('');
    setChapterSortOrder('desc');
    setSelectedReaction(null);
    setReactionCounts(createReactionCounts());
    setEngagement({ online: 0, bookmarks: 0, likes: 0 });

    const fetchData = async () => {
      try {
        const fresh = peekPreparedMangaDetail(id, 60_000);
        const mangaData = fresh?.manga ?? await getMangaById(id);
        if (!active) return;
        if (!mangaData) {
          setError('Manga no encontrado.');
          setLoading(false);
          return;
        }

        setManga(mangaData);

        void ensureMusicLibrary();
        const mangaPostId = mangaData.eroSeri || mangaData.id;

        setLoading(false);
        setSecondaryReady(true);
        const chaptersRequest = (fresh?.chapters ? Promise.resolve(fresh.chapters) : getChaptersBySeries(mangaPostId)).then(data => {
          if (active) {
            mangaReaderSession(id, String(mangaPostId), data);
            setChapters(data);
          }
        }).catch(() => { if (active) setChaptersError('No se pudieron cargar los capítulos.'); })
          .finally(() => { if (active) setChaptersLoading(false); });
        if (fresh?.related) {
          setRelated(fresh.related);
          setRelatedLoading(false);
        } else {
          let catalog: MangaCapitulo[] = [];
          let recommendations: RelatedManga[] = [];
          const updateRelated = () => {
            if (!active) return;
            setRelated(buildMangaRecommendations(mangaData, catalog, recommendations));
            setRelatedLoading(false);
          };
          // Show whichever source arrives first; the full catalog must not hold the sidebar.
          void getRelatedMangas(mangaPostId, 18).then(data => {
            recommendations = data;
            updateRelated();
          }).catch(updateRelated);
          void getUltimosCapitulos().then(data => {
            catalog = data;
            if (!active) return;
            const catalogManga = catalog.find(item => String(item.eroSeri || item.id) === String(mangaPostId));
            if (catalogManga) {
              setManga(current => current && String(current.id) === String(mangaData.id)
                ? { ...current, totalViews: catalogManga.totalViews ?? current.totalViews, chapterCount: catalogManga.chapterCount ?? current.chapterCount }
                : current);
            }
            updateRelated();
          }).catch(updateRelated);
        }
        void loadInteractions(String(mangaData.id), () => active).catch(() => {});
        await chaptersRequest;
        if (!active || initial?.comments) return;
        cancelSecondary = whenIdle(() => {
          if (!active) return;
          void getMangaComments(String(mangaData.id), undefined, commentsController.signal).then(data => {
            if (active) setInitialComments(data);
          }).catch(() => { if (active) setCommentsError('No se pudieron cargar los comentarios.'); })
            .finally(() => { if (active) setCommentsLoading(false); });
        }, 250);
      } catch (requestError) {
        console.error('Error MangaDetail:', requestError);
        if (active) {
          setError('No se pudo cargar el manga.');
          setLoading(false);
        }
      }
    };

    void fetchData();
    return () => {
      active = false;
      cancelSecondary();
      commentsController.abort();
    };
  }, [id, loadInteractions]);

  const firstChapter = useMemo(() => [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)[0], [chapters]);
  useEffect(() => {
    if (!id || !manga || loading || chaptersLoading || commentsLoading || relatedLoading || !chapters.length) return;
    const session = mangaReaderSession(id, String(manga.eroSeri || manga.id), chapters);
    const warm = () => session.warmAround([...chapters].sort((a, b) => a.chapter_number - b.chapter_number), '', purchasedIds);
    const cancel = whenIdle(warm);
    const visibility = () => { if (document.hidden) session.pause(); else warm(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { cancel(); session.pause(); document.removeEventListener('visibilitychange', visibility); };
  }, [id, manga, loading, chaptersLoading, commentsLoading, relatedLoading, chapters, purchasedIds]);
  const filteredChapters = useMemo(() => {
    const query = chapterSearch.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!query) return chapters;
    return chapters.filter((chapter) => {
      const title = `${chapter.chapter_number} ${chapter.title || ''}`.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return title.includes(query);
    });
  }, [chapterSearch, chapters]);

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
    if (!manga || interactionBusy) return false;
    if (!getStoredToken()) {
      goToLogin();
      return false;
    }

    setInteractionBusy('bookmark');
    const outcome = await toggleSavedManga(String(manga.id));
    if (outcome.status === 'ok') {
      setIsBookmarked(outcome.action === 'added');
      setEngagement((current) => ({ ...current, bookmarks: outcome.total }));
    }
    setInteractionBusy('');
    return outcome.status === 'ok';
  };

  const handleLike = () => {
    if (!manga || interactionBusy === 'bookmark') return;

    if (!likeQueueRef.current) {
      const mangaId = String(manga.id);
      const guestPublicTotal = Math.max(0, engagement.likes - Number(readGuestMangaLike(mangaId)));
      likeQueueRef.current = createQueuedLike(
        { liked: isLiked, count: engagement.likes },
        () => toggleMangaLike(mangaId, guestPublicTotal),
        ({ liked, count }) => {
          setIsLiked(liked);
          setEngagement((current) => ({ ...current, likes: count }));
        },
      );
    }
    likeQueueRef.current.click();
  };

  const handlePurchaseSuccess = useCallback(() => {
    void loadUser();
  }, [loadUser]);

  const handleReaction = (reactionId: MangaReactionId) => {
    if (!manga) return;

    const previousSelection = selectedReaction;
    const previousCounts = reactionCounts;
    const nextSelection = previousSelection === reactionId ? null : reactionId;
    const optimistic = { ...previousCounts };
    if (previousSelection) optimistic[previousSelection] = Math.max(0, optimistic[previousSelection] - 1);
    if (nextSelection) optimistic[nextSelection] += 1;

    const sequence = reactionSequence.current + 1;
    reactionSequence.current = sequence;
    setReactionError('');
    setSelectedReaction(nextSelection);
    setReactionCounts(optimistic);

    if (!getStoredToken()) {
      guestReactionRef.current = nextSelection;
      saveGuestReaction(manga.id, nextSelection);
      return;
    }

    void setEntityReaction('manga', manga.id, nextSelection || '')
      .then(result => {
        if (reactionSequence.current !== sequence) return;
        setReactionCounts({ ...createReactionCounts(), ...result.reactions });
        setSelectedReaction((result.my_reaction || null) as MangaReactionId | null);
      })
      .catch(caught => {
        if (reactionSequence.current !== sequence) return;
        setSelectedReaction(previousSelection);
        setReactionCounts(previousCounts);
        setReactionError(caught instanceof Error ? caught.message : 'No se pudo guardar la reacción.');
      });
  };

  const reactWithTrace = (reactionId: MangaReactionId) => {
    setTracingReaction(reactionId);
    window.setTimeout(() => setTracingReaction((current) => (current === reactionId ? null : current)), 700);
    handleReaction(reactionId);
  };

  if (loading) {
    return <div role="status" aria-label="Cargando ficha del manga" className="manga-detail-loading min-h-screen bg-surface px-6 pt-28"><div className="mx-auto grid max-w-[1208px] gap-12 lg:grid-cols-[264px_1fr_264px]" aria-hidden="true"><div className="aspect-[264/374] rounded bg-ink/10 animate-pulse motion-reduce:animate-none" /><div className="space-y-6"><div className="h-14 rounded bg-ink/10" /><div className="h-6 rounded bg-ink/10" /><div className="h-96 rounded bg-ink/5" /></div><div className="h-96 rounded bg-ink/5" /></div></div>;
  }

  if (error || !manga) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface px-4 text-center text-ink">
        <BookOpen size={52} className="text-ink/15" />
        <div>
          <h1 className="font-dela text-2xl font-normal">Historia no disponible</h1>
          <p className="mt-2 font-montserrat text-sm text-muted">{error || 'Manga no encontrado.'}</p>
        </div>
        <button onClick={() => navigate(-1)} className="rounded-md bg-mukai-magenta px-6 py-3 font-montserrat text-xs font-extrabold uppercase text-white">
          Volver
        </button>
      </div>
    );
  }

  const genres = manga.genres || [];
  const synopsis = cleanSynopsis(manga.titulo, manga.descripcion);
  const publishedDate = manga.publishedAt || manga.rawFecha;

  const coverBadge = collectionBadge(manga);

  if (isMobile) {
    return (
      <MobileMangaDetail
        manga={manga}
        chapters={chapters}
        related={related}
        initialComments={initialComments}
        commentsLoading={commentsLoading}
        commentsError={commentsError}
        chaptersLoading={chaptersLoading}
        chaptersError={chaptersError}
        relatedLoading={relatedLoading}
        secondaryReady={secondaryReady}
        isBookmarked={isBookmarked}
        isLiked={isLiked}
        likes={engagement.likes}
        online={engagement.online}
        interactionBusy={interactionBusy}
        onBookmark={handleBookmark}
        onLike={() => void handleLike()}
        reactionCounts={reactionCounts}
        selectedReaction={selectedReaction}
        reactionError={reactionError}
        onReact={handleReaction}
        purchasedIds={purchasedIds}
        userCoins={userCoins}
        userInfo={userInfo}
        onPurchaseSuccess={handlePurchaseSuccess}
        onReadFirst={handleReadFirst}
        hasFirstChapter={Boolean(firstChapter)}
        synopsis={synopsis}
      />
    );
  }

  return (
    <main className="manga-detail-desktop relative min-h-screen overflow-x-clip bg-surface text-ink">

      <div className="fixed inset-0 z-0" aria-hidden="true">
        <img src={manga.portada} alt="" className="h-full w-full origin-top scale-105 object-cover object-top blur-[2px]" />
        <div className="absolute inset-0 bg-surface/[.95]" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-transparent to-surface" />
      </div>
      <ReactionRingGradient />

      <section className="manga-detail-stage relative z-10 pb-20 pt-32">
        <div className="manga-detail-container mx-auto w-full max-w-[1780px] px-4 lg:!max-w-[1366px] 2xl:px-6">
          <div className="manga-detail-topbar mb-2 grid items-center gap-4 xl:grid-cols-[270px_minmax(0,1fr)_300px] xl:gap-6">

            <div className="mx-auto w-full xl:col-start-1 xl:row-start-1">
              <MangaDetailClock />
            </div>
            <div className="xl:col-start-3 xl:row-start-1">
              <MangaDetailSocials />
            </div>
          </div>
          <div className="mb-5 h-[2px] w-full bg-gradient-to-r from-transparent via-ink/20 to-transparent" aria-hidden="true" />

          <div className="manga-detail-grid grid items-start gap-9 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_300px] xl:gap-6">
            <motion.aside
              ref={coverColumnRef}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45 }}
              className="manga-detail-cover-column w-full xl:col-start-1 xl:row-start-1"
            >
              <div className="manga-detail-cover relative aspect-[3/4.35] rounded-lg">
                <HoloCard image={manga.portada} alt={`Portada de ${toTitleCase(manga.titulo)}`} foilEnabled={false} tiltMax={14} hoverScale={1.04} radius={0} idle={false} />
              </div>


              <div className="manga-detail-actions">
                <button type="button" onClick={handleReadFirst} disabled={!firstChapter} className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-mukai-magenta px-2 font-montserrat text-[13px] font-extrabold text-white transition-transform hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45">
                  Leer Capítulo 1
                </button>
                <SaveButton
                  mangaId={manga.id}
                  onSave={handleBookmark}
                  disabled={interactionBusy !== ''}
                  saved={isBookmarked}
                  iconClassName="size-[21px]"
                  className={`flex h-12 w-28 shrink-0 items-center justify-center gap-2 rounded-md border bg-surface font-montserrat text-[13px] font-extrabold uppercase transition-transform active:scale-95 ${'border-neutral-400 text-white'}`}
                />
              </div>

              <MangaSeasonSelector key={manga.id} cover={manga.portada} title={toTitleCase(manga.titulo)} likeAction={
                <MangaSeriesLikeButton liked={isLiked} likes={engagement.likes} busy={interactionBusy === 'like'} disabled={interactionBusy !== ''} onClick={() => void handleLike()} />
              } />


              <div className="manga-detail-badges">
                <span className="manga-detail-views" aria-label={manga.totalViews === undefined ? 'Vistas no disponibles' : `${formatCompactNumber(manga.totalViews)} vistas`}><DetailViewsIcon size={18} />{manga.totalViews === undefined ? '--' : formatCompactNumber(manga.totalViews)}</span>
                {coverBadge === 'bn' ? (
                  <span className={`${BADGE} bg-zinc-100 text-black`}>B&amp;N</span>
                ) : coverBadge === 'hot' ? (
                  <span className={`${BADGE} bg-red-600 text-white`}>Hot</span>
                ) : (
                  <span className={`${BADGE} bg-mukai-purple text-white`}><PaletteIcon size={16} />Color</span>
                )}
              </div>

              <div className="manga-detail-metadata mt-4 px-1">
                <MetaRow icon={<TypeIcon size={26} />} label="Tipo" value={manga.tipo?.trim() || '--'} dotColor={manga.tipo?.trim() ? typeDotColor(manga.tipo) : undefined} />
                {manga.author && <MetaRow icon={<StudioIcon size={25} />} label="Autor" value={manga.author} />}
                <MetaRow icon={<StudioIcon size={25} />} label="Estudio" value={manga.studio?.trim() || '--'} />
                <MetaRow icon={<PlatformIcon size={26} />} label="Plataforma" value={manga.platform?.trim() || '--'} />
                <MetaRow icon={<PublishedIcon size={27} />} label="Publicación" value={formatDate(publishedDate)} />
              </div>
            </motion.aside>

            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.5 }} className="manga-detail-content min-w-0 xl:col-start-2 xl:row-start-1 xl:px-1">
              <header className="border-b border-line pb-5">
                <h1 className="text-center font-montserrat text-[clamp(1.3rem,1.7vw,1.8rem)] font-black leading-[1.15] text-ink">{toTitleCase(manga.titulo)}</h1>
                {manga.tituloOriginal?.trim() && <p className="manga-detail-original-title">{manga.tituloOriginal.trim()}</p>}

                {genres.length > 0 && (
                  <div role="list" aria-label="Géneros" className="manga-detail-genres">
                    {genres.slice(0, 6).map((genre) => (
                      <span key={genre} role="listitem" className="flex h-6 items-center border border-line bg-surface px-2.5 font-anta text-[11px] font-normal leading-6 text-ink">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
                <MangaRewardProgress purchasedIds={purchasedIds} userId={userInfo.id} loading={chaptersLoading} />
              </header>


              <nav aria-label="Secciones del manga" className="manga-detail-section-nav">
                <div className="manga-detail-tabs">
                  <GooeySelector activeIndex={tabIndex} />
                  <button type="button" onClick={() => { setActiveContent('chapters'); setTabIndex(0); }} aria-current={tabIndex === 0} className={tabClass(tabIndex === 0)}>
                    <ChaptersTabIcon size={22} /> Capítulos ({Math.max(chapters.length, manga.chapterCount ?? 0)})
                  </button>
                  <button type="button" onClick={() => { setActiveContent('synopsis'); setTabIndex(1); }} aria-current={tabIndex === 1} className={tabClass(tabIndex === 1)}>
                    <SynopsisTabIcon size={19} /> Sinopsis
                  </button>
                  <button type="button" onClick={() => { setActiveContent('comments'); setTabIndex(2); }} aria-current={tabIndex === 2} className={tabClass(tabIndex === 2)}>
                    <CommentsTabIcon size={22} /> Comentarios
                  </button>
                </div>
              </nav>

              {activeContent === 'chapters' ? (
                <section id="capitulos" aria-label="Capítulos" className="manga-chapters-section scroll-mt-28">
                  <div className="manga-chapter-search">
                    <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border-[0.5px] border-line bg-ink/[.06] px-3.5">
                      <SearchIcon size={22} className="shrink-0 text-ink/60" />
                      <input
                        type="search"
                        aria-label="Buscar por número de capítulo o título"
                        value={chapterSearch}
                        onChange={(event) => setChapterSearch(event.target.value)}
                        placeholder="Busca por número de capítulo o título"
                        className="h-full min-w-0 flex-1 bg-transparent font-montserrat text-[13px] leading-5 text-ink caret-mukai-magenta outline-none placeholder:text-ink/40 [&::-webkit-search-cancel-button]:hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setChapterSortOrder((current) => current === 'desc' ? 'asc' : 'desc')}
                      aria-label={chapterSortOrder === 'desc' ? 'Ordenar capítulos del menor al mayor' : 'Ordenar capítulos del mayor al menor'}
                      title={chapterSortOrder === 'desc' ? 'Actualmente: mayor a menor' : 'Actualmente: menor a mayor'}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-[0.5px] border-line bg-ink/[.06] text-ink transition-colors hover:border-mukai-magenta"
                    >
                      <SortDownIcon size={22} className={chapterSortOrder === 'desc' ? 'opacity-100' : 'opacity-50'} />
                      <SortUpIcon size={22} className={chapterSortOrder === 'asc' ? 'opacity-100' : 'opacity-50'} />
                    </button>
                  </div>
                  {chapterSearch.trim() && filteredChapters.length === 0 ? (
                    <p className="rounded-lg border border-line py-14 text-center font-montserrat text-xs text-muted">No encontramos capítulos con esa búsqueda.</p>
                  ) : (
                    <ChapterList mangaId={String(manga.eroSeri || manga.id)} loading={chaptersLoading} loadError={chaptersError} chapters={filteredChapters} purchasedChapterIds={purchasedIds} userCoins={userCoins} userInfo={userInfo} onPurchaseSuccess={handlePurchaseSuccess} sortOrder={chapterSortOrder} />
                  )}
                </section>
              ) : activeContent === 'synopsis' ? (
                <section id="sinopsis" aria-label="Sinopsis" className="mt-5 scroll-mt-28 rounded-2xl border-[0.5px] border-line bg-surface/60 p-5">
                  <p ref={synopsisRef} className={`text-justify font-montserrat text-[14px] font-normal leading-6 text-ink/90 ${synopsisExpanded ? '' : 'line-clamp-[9]'}`}>{synopsis || 'La sinopsis de este manga todavía no está disponible.'}</p>
                  {synopsisHasOverflow && (
                    <button type="button" onClick={() => setSynopsisExpanded((current) => !current)} className="mx-auto mt-3 flex items-center gap-1 font-montserrat text-[11px] font-semibold text-mukai-magenta">
                      {synopsisExpanded ? 'Ver menos' : 'Ver más'}<ChevronDown size={14} className={synopsisExpanded ? 'rotate-180' : ''} />
                    </button>
                  )}
                </section>
              ) : null}

              <div className="flex flex-col">
              <MangaCommunityLinks />
              <div className="manga-detail-reactions" aria-label="Reacciones del manga">
                {reactionError && <p role="alert" className="mb-3 text-center font-montserrat text-xs text-red-500">{reactionError}</p>}
                <div className="grid grid-cols-6 items-start gap-2.5">
                  {MANGA_REACTIONS.map((reaction) => (
                    <div key={reaction.id} className="flex flex-col items-center gap-[7px]">
                      <ReactionButton
                        reaction={reaction}
                        count={reactionCounts[reaction.id]}
                        selected={selectedReaction === reaction.id}
                        tracing={tracingReaction === reaction.id}
                        onReact={() => reactWithTrace(reaction.id)}
                        className="aspect-square w-full max-w-[76px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className={`manga-detail-comments${activeContent === 'comments' ? ' order-first' : ''}`}><MangaComments key={manga.id} mangaId={String(manga.id)} initialComments={initialComments} loading={commentsLoading} loadError={commentsError} /></div>
              </div>
              <Footer ready={!chaptersLoading && !commentsLoading && !relatedLoading} homeDesign className="manga-detail-footer" />
            </motion.section>

            <motion.div ref={sidebarRef} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12, duration: 0.5 }} className="manga-detail-sidebar flex flex-col gap-5">
              {secondaryReady ? <MangaMusicCard cover={manga.portada} compactHeight isLight={isLightMode} /> : <div className="h-40 rounded-2xl bg-ink/5" aria-label="Cargando música" />}
              <MangaRecommendations loading={relatedLoading} items={related} currentId={manga.id} className="xl:min-h-0 xl:flex-1 xl:px-4" listClassName="h-[600px] xl:h-auto xl:min-h-0 xl:flex-1" />
            </motion.div>
          </div>
        </div>
      </section>

    </main>
  );
};
