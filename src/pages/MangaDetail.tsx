import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  BookMarked,
  BookOpen,
  BookType,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Heart,
  List,
  Loader2,
  MessageSquareText,
  MonitorPlay,
  Palette,
  Search,
  Users,
} from 'lucide-react';

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
import { ChapterList, MangaComments, MangaMusicCard, MangaRecommendationSidebar } from '../components/manga';
import { MobileMangaDetail } from '../components/manga/mobile/MobileMangaDetail';
import { useIsMobileViewport } from '../hooks/useIsMobileViewport';
import { MangaDetailClock } from '../components/common';
import { Footer } from '../components/layout';
import { FOOTER_SOCIALS } from '../components/layout/Footer';
import { useTheme } from '../hooks/useTheme';
import { toTitleCase } from '../utils/titleCase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { collectionBadge } from '../utils/womenBlackWhite';
import { preloadImages } from '../utils/preloadImages';

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

const MANGA_REACTIONS = [
  { id: 'like', symbol: '👍', label: 'Me gusta' },
  { id: 'love', symbol: '❤️', label: 'Me encanta' },
  { id: 'haha', symbol: '😂', label: 'Me divierte' },
  { id: 'wow', symbol: '😮', label: 'Me asombra' },
  { id: 'sad', symbol: '😢', label: 'Me entristece' },
  { id: 'angry', symbol: '😡', label: 'Me enoja' },
] as const;

type MangaReactionId = (typeof MANGA_REACTIONS)[number]['id'];

const createReactionCounts = (): Record<MangaReactionId, number> => Object.fromEntries(
  MANGA_REACTIONS.map(({ id }) => [id, 0]),
) as Record<MangaReactionId, number>;

function SidebarMetaRow({ icon, label, value, isLight, valueDotColor }: { icon: ReactNode; label: string; value: string; isLight: boolean; valueDotColor?: string }) {
  return (
    <div className="google-sans-library flex min-h-[35px] min-w-0 items-center gap-1.5 sm:min-h-[40px] sm:gap-2 sm:py-0.5">
      <span className={`shrink-0 [&>svg]:h-[23px] [&>svg]:w-[23px] sm:[&>svg]:h-6 sm:[&>svg]:w-6 ${isLight ? 'text-black' : 'text-white'}`}>{icon}</span>
      <span className={`shrink-0 text-[15px] font-bold sm:text-[16px] ${isLight ? 'text-black' : 'text-white'}`}>{label}</span>
      <span className={`ml-auto inline-flex max-w-[64%] items-center justify-end gap-1.5 overflow-visible text-right text-[15px] font-normal sm:text-[16px] ${isLight ? 'text-black/75' : 'text-white/75'}`}>
        {valueDotColor && <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-55" style={{ backgroundColor: valueDotColor }} /><span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: valueDotColor, boxShadow: `0 0 12px ${valueDotColor}` }} /></span>}
        <span className="truncate">{value || 'N/A'}</span>
      </span>
    </div>
  );
}

export const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  // Por debajo de lg la ficha usa su diseño móvil propio; en escritorio, el clásico.
  const isMobile = useIsMobileViewport();
  const [isDesktopMusicPlacement, setIsDesktopMusicPlacement] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  ));

  const [manga, setManga] = useState<MangaCapitulo | null>(null);
  const [chapters, setChapters] = useState<SeriesChapter[]>([]);
  const [related, setRelated] = useState<RelatedManga[]>([]);
  const [initialComments, setInitialComments] = useState<MangaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [synopsisHasOverflow, setSynopsisHasOverflow] = useState(false);
  const [activeContent, setActiveContent] = useState<'chapters' | 'synopsis'>('chapters');
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterSortOrder, setChapterSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReaction, setSelectedReaction] = useState<MangaReactionId | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<MangaReactionId, number>>(createReactionCounts);
  // Solo la ultima peticion de reaccion puede reconciliar el estado optimista.
  const reactionSequence = useRef(0);
  const [reactionError, setReactionError] = useState('');

  useEffect(() => {
    if (!manga?.id) return;
    let active = true;
    setReactionError('');
    void getEntityReactions('manga', manga.id).then(result => {
      if (!active) return;
      setReactionCounts({ ...createReactionCounts(), ...result.reactions });
      setSelectedReaction((result.my_reaction || null) as MangaReactionId | null);
    }).catch(() => { if (active) setReactionError('No se pudieron cargar las reacciones.'); });
    return () => { active = false; };
  }, [manga?.id]);

  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [userCoins, setUserCoins] = useState(0);
  const [userInfo, setUserInfo] = useState<{ id: string; username: string }>({ id: '', username: '' });

  useEffect(() => {
    const desktopMedia = window.matchMedia('(min-width: 1024px)');
    const updateMusicPlacement = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktopMusicPlacement(event.matches);
    };

    updateMusicPlacement(desktopMedia);
    desktopMedia.addEventListener('change', updateMusicPlacement);
    return () => desktopMedia.removeEventListener('change', updateMusicPlacement);
  }, []);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [interactionBusy, setInteractionBusy] = useState<'bookmark' | 'like' | ''>('');
  const [engagement, setEngagement] = useState({ online: 0, bookmarks: 0, likes: 0 });
  const [activeEngagementIndex, setActiveEngagementIndex] = useState(0);
  const synopsisRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveEngagementIndex((current) => (current + 1) % 3);
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [activeEngagementIndex]);

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

  const loadInteractions = useCallback(async (mangaId: string) => {
    const interactions = await getInteractions(mangaId);
    if (!interactions) return;

    setIsBookmarked(interactions.bookmarks?.some((item) => String(item) === mangaId) || false);
    // La lista completa ya viene en la respuesta: se comparte con los botones "Guardar" del resto de la web.
    seedSavedMangas(interactions.bookmarks ?? []);
    setIsLiked(interactions.likes?.some((item) => String(item) === mangaId) || false);
    setEngagement({
      online: Number(interactions.online_readers || 0),
      bookmarks: Number(interactions.manga_bookmarks || 0),
      likes: Number(interactions.manga_likes || 0),
    });
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // El servidor ya envía este head; aquí solo se mantiene al navegar dentro de la SPA.
  useDocumentTitle(
    manga?.titulo,
    manga
      ? `${cleanSynopsis(manga.titulo, manga.descripcion).replace(/\s+/g, ' ').slice(0, 200) || `Lee ${manga.titulo} online en español`} · MangaMukai`
      : undefined,
  );

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);
    setManga(null);
    setChapters([]);
    setRelated([]);
    setInitialComments([]);
    setSynopsisExpanded(false);
    setActiveContent('chapters');
    setChapterSearch('');
    setChapterSortOrder('desc');
    setSelectedReaction(null);
    setReactionCounts(createReactionCounts());
    setEngagement({ online: 0, bookmarks: 0, likes: 0 });

    const fetchData = async () => {
      try {
        const mangaData = await getMangaById(id);
        if (!active) return;
        if (!mangaData) {
          setError('Manga no encontrado.');
          setLoading(false);
          return;
        }

        setManga(mangaData);
        const mangaPostId = mangaData.eroSeri || mangaData.id;

        const [chapterData, relatedData, commentData] = await Promise.all([
          getChaptersBySeries(mangaPostId),
          getRelatedMangas(mangaPostId, 18),
          getMangaComments(String(mangaData.id)),
          loadInteractions(String(mangaData.id)),
        ]);
        if (!active) return;
        await preloadImages([
          mangaData.portada,
          ...relatedData.slice(0, 10).map((item) => item.portada),
        ]);
        if (!active) return;
        setChapters(chapterData);
        setRelated(relatedData);
        setInitialComments(commentData);
        setLoading(false);

        void getUltimosCapitulos().then((catalog) => {
          if (!active || catalog.length === 0) return;
          const countByMangaId = new Map(catalog.map((catalogManga) => {
            const chapterCount = catalogManga.capitulosRecientes.reduce((highest, chapter) => {
              const chapterNumber = Number.parseFloat(String(chapter.numero).replace(',', '.'));
              return Number.isFinite(chapterNumber) ? Math.max(highest, Math.ceil(chapterNumber)) : highest;
            }, 0);
            return [String(catalogManga.id), chapterCount] as const;
          }));
          setRelated((current) => current.map((relatedManga) => ({
            ...relatedManga,
            chapterCount: countByMangaId.get(String(relatedManga.id)) ?? 0,
          })));
        });
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
    };
  }, [id, loadInteractions]);

  const firstChapter = useMemo(() => [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)[0], [chapters]);
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
    if (!manga || interactionBusy) return;
    if (!getStoredToken()) {
      goToLogin();
      return;
    }

    setInteractionBusy('bookmark');
    const outcome = await toggleSavedManga(String(manga.id));
    if (outcome.status === 'ok') {
      setIsBookmarked(outcome.action === 'added');
      setEngagement((current) => ({ ...current, bookmarks: outcome.total }));
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

  const handlePurchaseSuccess = useCallback(() => {
    void loadUser();
  }, [loadUser]);

  // Optimista: el contador y el resaltado cambian en el mismo clic; la red solo confirma o revierte.
  const handleReaction = (reactionId: MangaReactionId) => {
    if (!manga) return;
    if (!getStoredToken()) { navigate('/auth/login', { state: { returnTo: `/manga/${manga.id}` } }); return; }

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
  const engagementStats = [
    { label: 'Likes', value: engagement.likes, icon: Heart },
    { label: 'Guardados', value: engagement.bookmarks, icon: Bookmark },
    { label: 'Lectores conectados', value: engagement.online, icon: Users },
  ];
  const activeEngagementStat = engagementStats[activeEngagementIndex] || engagementStats[0];
  const ActiveEngagementIcon = activeEngagementStat.icon;
  const onlineReaderRemainder = engagement.online % 50;
  const onlineReaderProgress = engagement.online > 0 && onlineReaderRemainder === 0
    ? 100
    : (onlineReaderRemainder / 50) * 100;
  const engagementProgress = activeEngagementStat.label === 'Lectores conectados'
    ? onlineReaderProgress
    : ((activeEngagementIndex + 1) / engagementStats.length) * 100;
  const typeIndicatorColor = /manhwa|manhua/i.test(manga.tipo || '') ? '#8b5cf6' : '#FF4D88';
  // Distintivo de la portada según la colección a la que pertenece la ficha.
  const coverBadge = collectionBadge(manga);

  if (isMobile) {
    return (
      <MobileMangaDetail
        manga={manga}
        chapters={chapters}
        related={related}
        initialComments={initialComments}
        isBookmarked={isBookmarked}
        isLiked={isLiked}
        likes={engagement.likes}
        interactionBusy={interactionBusy}
        onBookmark={() => void handleBookmark()}
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
    <main className={`manga-detail-page relative min-h-screen overflow-x-clip transition-colors duration-500 ${isLightMode ? 'manga-detail-theme-light bg-white text-black' : 'manga-detail-theme-dark bg-black text-white'}`}>
      {/* Fondo difuminado solo en escritorio: en móvil la portada va a sangre sobre fondo liso. */}
      <div className="fixed inset-0 z-0 hidden lg:block" aria-hidden="true">
        <img src={manga.portada} alt="" className="h-full w-full origin-top scale-105 object-cover object-top blur-[2px]" />
        <div className={`absolute inset-0 ${isLightMode ? 'bg-[linear-gradient(90deg,rgba(255,255,255,.97),rgba(255,255,255,.91)_52%,rgba(255,255,255,.96))]' : 'bg-[linear-gradient(90deg,rgba(0,0,0,.95),rgba(0,0,0,.84)_52%,rgba(0,0,0,.94))]'}`} />
        <div className={`absolute inset-0 bg-gradient-to-b ${isLightMode ? 'from-white/45 via-transparent to-white' : 'from-black/45 via-transparent to-black'}`} />
      </div>

      {/* Móvil: la portada ocupa toda la parte superior, sin cabecera (el navbar
          se oculta en esta ruta). El botón flotante devuelve a la página anterior. */}
      <div className="manga-detail-mobile-hero relative z-10 lg:hidden" data-testid="manga-detail-mobile-hero">
        {/* La portada se muestra entera (alto según su proporción), con la base curvada y una sombra suave debajo. */}
        <div className={`relative w-full overflow-hidden rounded-b-[36px] ${isLightMode ? 'bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]' : 'bg-black shadow-[0_18px_44px_rgba(0,0,0,0.6)]'}`}>
          <img src={manga.portada} alt={`Portada de ${toTitleCase(manga.titulo)}`} className="block h-auto w-full" fetchPriority="high" />
          <div className={`absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t ${isLightMode ? 'from-white/70' : 'from-black/70'} to-transparent`} aria-hidden="true" />
        </div>

        {/* Móvil: título, tipo y título original justo bajo la portada (el reloj y las redes solo van en escritorio). */}
        <div className="px-5 pt-5 text-center">
          <h1 className={`font-[Montserrat] text-[22px] font-bold uppercase leading-[1.15] tracking-[-0.02em] ${isLightMode ? 'text-black' : 'text-white'}`}>{manga.titulo.toLocaleUpperCase('es')}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="manga-detail-cover-tag inline-flex items-center rounded-md px-3 py-2 text-[11px] uppercase leading-none text-white shadow-lg" style={{ backgroundColor: typeIndicatorColor }}>{manga.tipo || 'Manga'}</span>
            {coverBadge === 'bn' && <span className="manga-detail-cover-tag inline-flex items-center rounded-md bg-zinc-100 px-3 py-2 text-[11px] uppercase leading-none text-black shadow-lg">B&amp;N</span>}
            {coverBadge === 'hot' && <span className="manga-detail-cover-tag inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-[11px] uppercase leading-none text-white shadow-lg">Hot</span>}
          </div>
          {manga.tituloOriginal && (
            <p className={`mx-auto mt-3 w-fit max-w-full rounded-md px-3 py-1 font-[Montserrat] text-[13px] font-medium ${isLightMode ? 'bg-black/[0.06] text-black/70' : 'bg-white/[0.08] text-white/75'}`}>{manga.tituloOriginal}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => { if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1); else navigate('/'); }}
          aria-label="Volver"
          title="Volver"
          className="absolute left-3 top-[calc(env(safe-area-inset-top)+12px)] flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:bg-black/60"
        >
          <ChevronLeft size={24} strokeWidth={2.6} className="-ml-0.5" />
        </button>
      </div>

      <section className="relative z-10 pb-20 pt-4 lg:pt-32">
        <div className="desktop-content-shell mx-auto w-full max-w-[1780px] px-3 sm:px-5 lg:px-4 2xl:px-6">
          <div className="mb-2 hidden items-center gap-4 lg:grid xl:grid-cols-[270px_minmax(0,1fr)_300px] xl:gap-6">
            {/* Va en la primera columna para quedar justo encima de la portada. */}
            <div className="mx-auto w-full max-w-[300px] lg:max-w-none xl:col-start-1 xl:row-start-1">
              <MangaDetailClock isLight={isLightMode} />
            </div>
            <div className="text-center xl:col-start-3 xl:row-start-1">
              <p className={`manga-detail-social-prompt text-[13px] ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>¡No olvides seguirnos!</p>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5" aria-label="Redes sociales de MangaMukai">
                {FOOTER_SOCIALS.map(({ name, href, icon: SocialIcon }) => (
                  <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name} title={name} className="manga-detail-social-link flex h-9 w-8 items-center justify-center bg-transparent transition-all hover:-translate-y-0.5 hover:text-[#FF4D88]">
                    <SocialIcon size={21} />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div data-testid="manga-detail-social-divider" className={`mb-5 hidden h-px w-full bg-gradient-to-r from-transparent via-current to-transparent lg:block ${isLightMode ? 'text-black/20' : 'text-white/20'}`} aria-hidden="true" />

          <div className="grid items-start gap-9 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_300px] xl:gap-6">
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45 }}
              data-testid="manga-detail-left-column"
              className="manga-detail-sticky-column no-scrollbar order-1 mx-auto w-full max-w-[300px] lg:max-w-none xl:col-start-1 xl:row-start-1 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto xl:overscroll-contain"
            >
              <div className={`manga-detail-cover relative hidden aspect-[3/4.35] overflow-hidden rounded-[8px] border lg:block ${isLightMode ? 'border-black/10 bg-white' : 'border-white/10 bg-black'}`}>
                <img src={manga.portada} alt={`Portada de ${toTitleCase(manga.titulo)}`} className="h-full w-full object-cover" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={handleReadFirst} disabled={!firstChapter} className="poppins-bold flex min-h-[48px] items-center justify-center rounded-md bg-[#FF4D88] px-3 py-3 text-[14px] text-white transition hover:-translate-y-0.5 hover:bg-[#ef2f73] disabled:cursor-not-allowed disabled:opacity-45">
                  Leer capítulo 1
                </button>
                <button type="button" onClick={handleBookmark} className={`poppins-regular flex min-h-[48px] items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-[14px] transition ${isBookmarked ? 'border-[#FF4D88]/40 bg-[#FF4D88]/15 text-[#FF4D88]' : isLightMode ? 'border-black/10 bg-white/80 text-black hover:border-[#FF4D88]' : 'border-white/10 bg-white/10 text-white hover:border-[#FF4D88]'}`}>
                  {interactionBusy === 'bookmark' ? <Loader2 size={14} className="animate-spin" /> : isBookmarked ? <BookMarked size={14} /> : <Bookmark size={14} />}{isBookmarked ? 'Guardado' : 'Guardar'}
                </button>
              </div>

              <div className="manga-detail-stat-carousel manga-cyber-stat-card relative mt-4" aria-label="Estadísticas del manga" aria-live="polite">
                <div className="manga-cyber-stat-content">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeEngagementStat.label}
                      className="manga-cyber-stat-slide"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      aria-label={`${activeEngagementStat.label}: ${formatCompactNumber(activeEngagementStat.value)}`}
                    >
                      <div className="manga-cyber-stat-copy">
                        <strong className="manga-cyber-stat-value tabular-nums">{formatCompactNumber(activeEngagementStat.value)}</strong>
                        <span className={`manga-cyber-stat-label ${activeEngagementStat.label === 'Lectores conectados' ? 'is-long' : ''}`}>{activeEngagementStat.label}</span>
                      </div>
                      <span className={`manga-cyber-stat-icon ${activeEngagementStat.label === 'Likes' ? 'is-heart' : ''}`}>
                        <ActiveEngagementIcon size={22} strokeWidth={2.15} />
                      </span>
                    </motion.div>
                  </AnimatePresence>
                  <div className="manga-cyber-progress-track">
                    <span className="manga-cyber-progress-track-inner" />
                    <motion.span
                      key={`stat-progress-${activeEngagementIndex}`}
                      aria-hidden="true"
                      className="manga-cyber-progress-fill"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: engagementProgress / 100 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <strong className="manga-cyber-progress-percentage tabular-nums">{Math.round(engagementProgress)}%</strong>
                  </div>
                </div>
              </div>

              {/* Etiquetas de la ficha y "Me gusta", antes encima de la portada:
                  ahora en una sola fila bajo el contador de likes y lectores. */}
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 xl:flex xl:flex-wrap">
                {/* En móvil las etiquetas van centradas y el corazón a la derecha; en escritorio, en fila. */}
                <div className="col-start-2 flex flex-wrap items-center justify-center gap-2 xl:justify-start">
                <span className="manga-detail-cover-tag inline-flex items-center rounded-md bg-[#FF4D88] px-3 py-2 text-[11px] uppercase leading-none text-white shadow-lg">
                  Estreno
                </span>
                {coverBadge === 'bn' ? (
                  <span className="manga-detail-cover-tag inline-flex items-center rounded-md bg-zinc-100 px-3 py-2 text-[11px] uppercase leading-none text-black shadow-lg">B&amp;N</span>
                ) : coverBadge === 'hot' ? (
                  <span className="manga-detail-cover-tag inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-[11px] uppercase leading-none text-white shadow-lg">Hot</span>
                ) : (
                  <span className="manga-detail-cover-tag inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-[11px] uppercase leading-none text-white shadow-lg">
                    Color
                    <Palette size={14} strokeWidth={2.3} aria-hidden="true" />
                  </span>
                )}
                </div>
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={interactionBusy !== ''}
                  aria-label={isLiked ? 'Quitar Me gusta' : 'Me gusta'}
                  className={`col-start-3 flex shrink-0 items-center justify-center justify-self-end bg-transparent xl:ml-auto transition-all hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60 ${isLiked ? 'text-[#FF4D88]' : isLightMode ? 'text-black/70 hover:text-[#FF4D88]' : 'text-white/80 hover:text-[#FF4D88]'}`}
                >
                  {interactionBusy === 'like' ? <Loader2 size={24} className="animate-spin" /> : <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />}
                </button>
              </div>

              <div className="mt-2 px-1">
                <SidebarMetaRow icon={<BookType />} label="Tipo" value={manga.tipo || 'Manga'} isLight={isLightMode} valueDotColor={typeIndicatorColor} />
                <SidebarMetaRow icon={<Building2 />} label="Estudio" value={manga.studio || 'N/A'} isLight={isLightMode} />
                <SidebarMetaRow icon={<MonitorPlay />} label="Plataforma" value={manga.platform || 'N/A'} isLight={isLightMode} />
                <SidebarMetaRow icon={<CalendarDays />} label="Publicación" value={formatDate(publishedDate)} isLight={isLightMode} />
              </div>
            </motion.aside>

            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.5 }} className="order-2 min-w-0 xl:col-start-2 xl:row-start-1 xl:px-1">
              {!isDesktopMusicPlacement && (
                <div className="mx-auto mb-6 w-full max-w-[340px]">
                  <MangaMusicCard cover={manga.portada} compactHeight isLight={isLightMode} />
                </div>
              )}
              <header className={`border-b pb-5 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                <p className={`hidden text-center font-[Montserrat] text-[clamp(1.2rem,1.6vw,1.72rem)] font-bold uppercase leading-[1.16] tracking-[-0.025em] lg:block ${isLightMode ? 'text-black' : 'text-white'}`}>{manga.titulo.toLocaleUpperCase('es')}</p>
                {manga.tituloOriginal && (
                  <p className={`mx-auto mt-2 hidden w-fit max-w-full rounded-md px-3 py-1 text-center font-[Montserrat] text-[clamp(0.8rem,1vw,0.95rem)] font-medium backdrop-blur-md lg:block ${isLightMode ? 'bg-black/[0.06] text-black/70' : 'bg-white/[0.08] text-white/75'}`}>
                    {manga.tituloOriginal}
                  </p>
                )}
                {genres.length > 0 && (
                  <div className="no-scrollbar mt-4 flex flex-nowrap items-center justify-start gap-2 overflow-x-auto whitespace-nowrap px-1 pb-1 sm:mx-auto sm:w-fit sm:max-w-full sm:justify-center sm:overflow-hidden">
                    <span className="shrink-0 text-lg font-black text-[#FF4D88]">#</span>
                    {genres.map((genre, index) => (
                      <Link key={genre} to={`/biblioteca?genre=${encodeURIComponent(genre)}`} className={`shrink-0 rounded-md border px-3 py-1.5 text-[11px] font-bold transition hover:border-[#FF4D88] hover:text-[#FF4D88] ${index >= 4 ? 'sm:hidden' : ''} ${isLightMode ? 'border-black/10 bg-white/60 text-black/60' : 'border-white/10 bg-black/35 text-white/60'}`}>{genre}</Link>
                    ))}
                  </div>
                )}
              </header>

              <nav className={`mt-4 grid grid-cols-[1.12fr_.88fr_1fr] rounded-full border p-1 backdrop-blur-xl ${isLightMode ? 'border-black/10 bg-white/70' : 'border-white/10 bg-black/60'}`} aria-label="Secciones del manga">
                <button type="button" onClick={() => setActiveContent('chapters')} className={`manga-detail-section-tab flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 py-2 text-[12px] transition sm:gap-2 sm:px-3 sm:text-[13px] xl:text-[14px] ${activeContent === 'chapters' ? 'bg-[#FF4D88] text-white' : isLightMode ? 'text-black hover:text-[#FF4D88]' : 'text-white/70 hover:text-white'}`}><List className="h-[18px] w-[18px] sm:h-[18px] sm:w-[18px]" />Capítulos ({chapters.length})</button>
                <button type="button" onClick={() => setActiveContent('synopsis')} className={`manga-detail-section-tab flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 py-2 text-[12px] transition sm:gap-2 sm:px-3 sm:text-[13px] xl:text-[14px] ${activeContent === 'synopsis' ? 'bg-[#FF4D88] text-white' : isLightMode ? 'text-black hover:text-[#FF4D88]' : 'text-white/70 hover:text-white'}`}><BookOpen className="h-[18px] w-[18px] sm:h-[18px] sm:w-[18px]" />Sinopsis</button>
                <a href="#comentarios" className={`manga-detail-section-tab flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 py-2 text-[12px] transition sm:gap-2 sm:px-3 sm:text-[13px] xl:text-[14px] ${isLightMode ? 'text-black hover:text-[#FF4D88]' : 'text-white/70 hover:text-white'}`}><MessageSquareText className="h-[18px] w-[18px] sm:h-[18px] sm:w-[18px]" />Comentarios</a>
              </nav>

              {activeContent === 'chapters' ? (
                <section id="capitulos" className="mt-5 scroll-mt-28">
                  <div className="mb-6 flex items-center gap-2">
                    <label className={`relative flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-xl border ${isLightMode ? 'border-black/10 bg-white/[0.34]' : 'border-white/10 bg-black/25'}`}>
                      <Search size={16} className={`ml-4 shrink-0 ${isLightMode ? 'text-black/35' : 'text-white/35'}`} />
                      <input type="search" aria-label="Buscar por número de capítulo o título" value={chapterSearch} onChange={(event) => setChapterSearch(event.target.value)} placeholder="Buscar por número de capítulo o título" className={`h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none ${isLightMode ? 'text-black placeholder:text-black/30' : 'text-white placeholder:text-white/30'}`} />
                    </label>
                    <button
                      type="button"
                      onClick={() => setChapterSortOrder((current) => current === 'desc' ? 'asc' : 'desc')}
                      aria-label={chapterSortOrder === 'desc' ? 'Ordenar capítulos del menor al mayor' : 'Ordenar capítulos del mayor al menor'}
                      title={chapterSortOrder === 'desc' ? 'Actualmente: mayor a menor' : 'Actualmente: menor a mayor'}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center gap-0 rounded-xl border transition hover:border-[#FF4D88] hover:text-[#FF4D88] ${isLightMode ? 'border-black/10 bg-white/[0.34] text-black' : 'border-white/10 bg-black/25 text-white'}`}
                    >
                      <ArrowUp strokeWidth={2.2} className={`manga-chapter-sort-arrow ${chapterSortOrder === 'asc' ? 'opacity-100' : 'opacity-30'}`} />
                      <ArrowDown strokeWidth={2.2} className={`manga-chapter-sort-arrow ${chapterSortOrder === 'desc' ? 'opacity-100' : 'opacity-30'}`} />
                    </button>
                  </div>
                  {chapterSearch.trim() && filteredChapters.length === 0 ? (
                    <div className={`rounded-2xl border px-5 py-16 text-center text-sm ${isLightMode ? 'border-black/10 bg-white/70 text-black/45' : 'border-white/10 bg-black/50 text-white/40'}`}>No encontramos capítulos con esa búsqueda.</div>
                  ) : (
                    <ChapterList chapters={filteredChapters} purchasedChapterIds={purchasedIds} userCoins={userCoins} userInfo={userInfo} onPurchaseSuccess={handlePurchaseSuccess} isLight={isLightMode} sortOrder={chapterSortOrder} />
                  )}
                </section>
              ) : (
                <section id="sinopsis" className={`relative mt-5 scroll-mt-28 overflow-hidden rounded-2xl border p-5 backdrop-blur-xl ${isLightMode ? 'border-black/10 bg-white/[0.72]' : 'border-white/10 bg-black/[0.52]'}`}>
                  <h2 className={`manga-detail-synopsis-heading text-sm font-semibold ${isLightMode ? 'text-black' : 'text-white'}`}>Sinopsis</h2>
                  <p ref={synopsisRef} className={`manga-detail-synopsis-copy mt-3 text-justify text-sm leading-7 ${synopsisExpanded ? '' : 'is-collapsed'} ${isLightMode ? 'text-black/60' : 'text-white/55'}`}>{synopsis || 'La sinopsis de este manga todavía no está disponible.'}</p>
                  {synopsisHasOverflow && <button type="button" onClick={() => setSynopsisExpanded((current) => !current)} className="mx-auto mt-4 flex items-center gap-1 text-[10px] font-bold text-[#FF4D88]">{synopsisExpanded ? 'Ver menos' : 'Ver más'}<ChevronDown size={13} className={synopsisExpanded ? 'rotate-180' : ''} /></button>}
                </section>
              )}

              <div className={`mt-7 rounded-2xl border px-4 py-4 ${isLightMode ? 'border-black/10 bg-white/[0.28]' : 'border-white/10 bg-black/20'}`} aria-label="Reacciones del manga">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {reactionError && <p role="alert" className="text-xs text-red-500">{reactionError}</p>}
                  {MANGA_REACTIONS.map((reaction) => (
                    <div key={reaction.id} className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleReaction(reaction.id)}
                        aria-label={reaction.label}
                        aria-pressed={selectedReaction === reaction.id}
                        title={reaction.label}
                        className={`group flex h-[76px] w-[76px] items-center justify-center rounded-full transition-colors ${selectedReaction === reaction.id ? 'border-2 border-[#FF4D88] bg-transparent shadow-[0_0_13px_rgba(255,77,136,0.42)]' : isLightMode ? 'border border-transparent bg-white/80 shadow-[0_0_7px_rgba(0,0,0,0.24)]' : 'border border-transparent bg-white/[0.05] shadow-[0_0_7px_rgba(255,255,255,0.22)]'}`}
                      >
                        <span className="text-[36px] leading-none transition-transform duration-200 ease-out group-hover:scale-110" aria-hidden="true">
                          {reaction.symbol}
                        </span>
                      </button>
                      <span className={`manga-reaction-count tabular-nums ${selectedReaction === reaction.id ? 'is-selected' : ''}`}>{formatCompactNumber(reactionCounts[reaction.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.div data-testid="manga-detail-right-column" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12, duration: 0.5 }} className="manga-detail-sticky-column order-3 flex flex-col gap-5 lg:col-[1/3] xl:col-start-3 xl:row-start-1 xl:h-[calc(100vh-2.5rem)] xl:min-h-0">
              {isDesktopMusicPlacement && <MangaMusicCard cover={manga.portada} compactHeight isLight={isLightMode} />}
              <MangaRecommendationSidebar items={related} currentId={manga.id} isLight={isLightMode} />
            </motion.div>
          </div>
        </div>
      </section>

      <div id="comentarios" className="relative z-10 scroll-mt-28">
        <MangaComments mangaId={String(manga.id)} initialComments={initialComments} isLight={isLightMode} />
      </div>
      <Footer />
    </main>
  );
};
