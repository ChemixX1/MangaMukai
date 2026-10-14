import { BookmarkIcon } from '../components/ui/icons';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ChevronDown, Loader2 } from 'lucide-react';

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
import {
  LikeHeartIcon,
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
import { Footer, FOOTER_SOCIALS } from '../components/layout/Footer';
import { useTheme } from '../hooks/useTheme';
import { toTitleCase } from '../utils/titleCase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { collectionBadge } from '../utils/womenBlackWhite';
import { whenIdle } from '../utils/whenIdle';
import { MangaCommunityLinks } from '../components/manga/MangaCommunityLinks';
import { MangaReaderActivity } from '../components/manga/MangaReaderActivity';
import { MangaRewardProgress } from '../components/manga/MangaRewardProgress';
import { DetailViewsIcon, DetailNewIcon, DetailXIcon, DetailYoutubeIcon, DetailTelegramIcon, DetailDiscordIcon, DetailInstagramIcon, DetailFacebookIcon } from '../components/manga/referenceIcons';

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

/** El catálogo usa cuatro tipos: Manga, Manhwa, Manhua y Comic (mismos colores que en móvil). */
const typeDotColor = (type = '') => {
  const normalized = type.toLocaleLowerCase('es');
  if (normalized.includes('manhua')) return '#22C55E';
  if (normalized.includes('manhwa')) return '#B000AD';
  if (normalized.includes('comic')) return '#38BDF8';
  return '#FF008C';
};

/** Fila de la ficha técnica del diseño móvil: icono, etiqueta en negrita y valor a la derecha. */
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

/** Pestañas Capítulos · Sinopsis · Comentarios: la activa sobre la píldora que se desliza. */
const tabClass = (active = false) => `manga-detail-tab ${active ? 'is-active' : ''}`;
const SOCIAL_ICONS = { X: DetailXIcon, Instagram: DetailInstagramIcon, YouTube: DetailYoutubeIcon, Telegram: DetailTelegramIcon, Discord: DetailDiscordIcon, Facebook: DetailFacebookIcon };
const DETAIL_SOCIALS = [
  { name: 'Facebook', size: 23, left: 0, top: 3 },
  { name: 'Instagram', size: 23, left: 31, top: 3 },
  { name: 'Discord', size: 29, left: 62, top: 0 },
  { name: 'Telegram', size: 22, left: 100, top: 2 },
  { name: 'YouTube', size: 28, left: 130, top: 1 },
  { name: 'X', size: 21, left: 168, top: 3 },
] as const;


export const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const isMobile = useIsMobileViewport();

  const [manga, setManga] = useState<MangaCapitulo | null>(null);
  const [chapters, setChapters] = useState<SeriesChapter[]>([]);
  const [related, setRelated] = useState<RelatedManga[]>([]);
  const [initialComments, setInitialComments] = useState<MangaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [secondaryReady, setSecondaryReady] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [chaptersError, setChaptersError] = useState('');
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
  // Reacción recién pulsada: su aro se dibuja dando una vuelta, como en móvil.
  const [tracingReaction, setTracingReaction] = useState<MangaReactionId | null>(null);

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

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [interactionBusy, setInteractionBusy] = useState<'bookmark' | 'like' | ''>('');
  const [engagement, setEngagement] = useState({ online: 0, bookmarks: 0, likes: 0 });
  const synopsisRef = useRef<HTMLParagraphElement>(null);
  const coverColumnRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const coverColumn = coverColumnRef.current;
    const sidebar = sidebarRef.current;
    if (loading || isMobile || !coverColumn || !sidebar) return;

    // Las recomendaciones terminan a la altura de Publicación, incluso si cambia la ficha o su ancho.
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
    setChaptersLoading(true);
    setCommentsLoading(true);
    setRelatedLoading(true);
    setCommentsError('');
    setChaptersError('');
    setSecondaryReady(false);
    let cancelSecondary = () => {};
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

        // La ficha se publica con sus metadatos; ninguna imagen ni lista la bloquea.
        setLoading(false);
        const commentsRequest = getMangaComments(String(mangaData.id)).then(data => {
          if (active) setInitialComments(data);
        }).catch(() => { if (active) setCommentsError('No se pudieron cargar los comentarios.'); })
          .finally(() => { if (active) setCommentsLoading(false); });
        const relatedRequest = getRelatedMangas(mangaPostId, 18).then(data => {
          if (active) setRelated(data);
        }).catch(() => {}).finally(() => { if (active) setRelatedLoading(false); });
        const chaptersRequest = getChaptersBySeries(mangaPostId).then(data => {
          if (active) setChapters(data);
        }).catch(() => { if (active) setChaptersError('No se pudieron cargar los capítulos.'); })
          .finally(() => { if (active) setChaptersLoading(false); });
        void loadInteractions(String(mangaData.id), () => active).catch(() => {});
        await Promise.allSettled([commentsRequest, relatedRequest, chaptersRequest]);
        if (!active) return;
        cancelSecondary = whenIdle(() => {
          if (!active) return;
          setSecondaryReady(true);
          void getUltimosCapitulos().then(catalog => {
            if (!active) return;
            const counts = new Map(catalog.map(item => [String(item.eroSeri || item.id), item.chapterCount]));
            setRelated(current => current.map(item => ({ ...item, chapterCount: counts.get(String(item.id)) ?? item.chapterCount })));
          }).catch(() => {});
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
      cancelSecondary();
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
  // Distintivo de la portada según la colección a la que pertenece la ficha.
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

  const tabIndex = activeContent === 'chapters' ? 0 : 1;

  return (
    <main className="manga-detail-desktop relative min-h-screen overflow-x-clip bg-surface text-ink">
      {/* Fondo: la portada difuminada bajo el velo del tema. */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <img src={manga.portada} alt="" className="h-full w-full origin-top scale-105 object-cover object-top blur-[2px]" />
        <div className="absolute inset-0 bg-surface/[.95]" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-transparent to-surface" />
      </div>
      <ReactionRingGradient />

      <section className="manga-detail-stage relative z-10 pb-20 pt-32">
        <div className="manga-detail-container mx-auto w-full max-w-[1780px] px-4 lg:!max-w-[1366px] 2xl:px-6">
          <div className="manga-detail-topbar mb-2 grid items-center gap-4 xl:grid-cols-[270px_minmax(0,1fr)_300px] xl:gap-6">
            {/* Va en la primera columna para quedar justo encima de la portada. */}
            <div className="mx-auto w-full xl:col-start-1 xl:row-start-1">
              <MangaDetailClock />
            </div>
            <div className="manga-detail-socials text-center xl:col-start-3 xl:row-start-1">
              <p className="font-orbitron text-[13px] font-bold text-ink/70">¡Síguenos!</p>
              <div className="manga-detail-social-icons" aria-label="Redes sociales de MangaMukai">
                {DETAIL_SOCIALS.map(({ name, size, left, top }) => { const SocialIcon = SOCIAL_ICONS[name]; const href = FOOTER_SOCIALS.find(social => social.name === name)?.href; return (
                  <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name} title={name} style={{ width: size, height: size, left, top }} className="absolute flex items-center justify-center text-ink transition-transform hover:-translate-y-0.5 hover:text-mukai-magenta">
                    <SocialIcon size={size} />
                  </a>
                ); })}
              </div>
            </div>
          </div>
          <div className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-ink/20 to-transparent" aria-hidden="true" />

          <div className="manga-detail-grid grid items-start gap-9 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_300px] xl:gap-6">
            <motion.aside
              ref={coverColumnRef}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45 }}
              className="manga-detail-cover-column w-full xl:col-start-1 xl:row-start-1"
            >
              <div className="manga-detail-cover relative aspect-[3/4.35] overflow-hidden rounded-lg bg-media">
                <img src={manga.portada} alt={`Portada de ${toTitleCase(manga.titulo)}`} fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
              </div>

              {/* Ambos botones comparten el ancho de la portada a partes iguales. */}
              <div className="manga-detail-actions">
                <button type="button" onClick={handleReadFirst} disabled={!firstChapter} className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-mukai-magenta px-2 font-montserrat text-[13px] font-extrabold text-white transition-transform hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45">
                  Leer Capítulo 1
                </button>
                <button
                  type="button"
                  onClick={handleBookmark}
                  disabled={interactionBusy !== ''}
                  aria-pressed={isBookmarked}
                  className={`flex h-12 w-28 shrink-0 items-center justify-center gap-2 rounded-md border bg-surface font-montserrat text-[13px] font-extrabold uppercase transition-transform active:scale-95 ${'border-neutral-400 text-white'}`}
                >
                  {interactionBusy === 'bookmark' ? <Loader2 size={21} className="animate-spin" /> : <BookmarkIcon size={21} filled={isBookmarked} />}
                  {isBookmarked ? 'Guardado' : 'Guardar'}
                </button>
              </div>

              <MangaReaderActivity online={engagement.online} />

              {/* Etiquetas de la colección y "Me gusta" en una sola fila. */}
              <div className="manga-detail-badges">
                <span className="manga-detail-views" aria-label={`${formatCompactNumber(manga.totalViews ?? 0)} vistas`}><DetailViewsIcon size={18} />{formatCompactNumber(manga.totalViews ?? 0)}</span>
                <span className={`${BADGE} bg-mukai-magenta text-white`}><DetailNewIcon size={14} />Estreno</span>
                {coverBadge === 'bn' ? (
                  <span className={`${BADGE} bg-zinc-100 text-black`}>B&amp;N</span>
                ) : coverBadge === 'hot' ? (
                  <span className={`${BADGE} bg-red-600 text-white`}>Hot</span>
                ) : (
                  <span className={`${BADGE} bg-mukai-purple text-white`}><PaletteIcon size={16} />Color</span>
                )}
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={interactionBusy !== ''}
                  aria-pressed={isLiked}
                  aria-label={isLiked ? 'Quitar Me gusta' : 'Me gusta'}
                  className="ml-auto flex shrink-0 items-center gap-1.5 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {interactionBusy === 'like'
                    ? <Loader2 size={24} className="animate-spin" />
                    : <LikeHeartIcon size={26} filled={isLiked} className="text-ink" />}
                  <span className="font-anta text-sm font-normal tabular-nums">{engagement.likes}</span>
                </button>
              </div>

              <div className="manga-detail-metadata mt-4 px-1">
                <MetaRow icon={<TypeIcon size={26} />} label="Tipo" value={manga.tipo || 'Manga'} dotColor={typeDotColor(manga.tipo)} />
                {manga.author && <MetaRow icon={<StudioIcon size={25} />} label="Autor" value={manga.author} />}
                <MetaRow icon={<StudioIcon size={25} />} label="Estudio" value={manga.studio || 'N/A'} />
                <MetaRow icon={<PlatformIcon size={26} />} label="Plataforma" value={manga.platform || 'N/A'} />
                <MetaRow icon={<PublishedIcon size={27} />} label="Publicación" value={formatDate(publishedDate)} />
              </div>
            </motion.aside>

            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.5 }} className="manga-detail-content min-w-0 xl:col-start-2 xl:row-start-1 xl:px-1">
              <header className="border-b border-line pb-5">
                <h1 className="text-center font-montserrat text-[clamp(1.3rem,1.7vw,1.8rem)] font-black leading-[1.15] text-ink">{toTitleCase(manga.titulo)}</h1>

                {genres.length > 0 && (
                  <nav aria-label="Géneros" className="manga-detail-genres">
                    {genres.slice(0, 6).map((genre) => (
                      <Link key={genre} to={`/biblioteca?genre=${encodeURIComponent(genre)}`} className="flex h-6 items-center border border-line bg-surface px-2.5 font-anta text-[11px] font-normal leading-6 text-ink transition-colors hover:border-mukai-magenta hover:text-mukai-magenta">
                        {genre}
                      </Link>
                    ))}
                  </nav>
                )}
                <MangaRewardProgress mangaId={String(manga.eroSeri || manga.id)} chapterIds={chapters.map(chapter => chapter.id)} purchasedIds={purchasedIds} userId={userInfo.id} cover={manga.portada} loading={chaptersLoading} />
              </header>

              {/* Pestañas: una sola píldora que viaja entre ellas. */}
              <nav aria-label="Secciones del manga" className="manga-detail-section-nav">
                <div className="manga-detail-tabs">
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-black transition-transform duration-[360ms] ease-[cubic-bezier(0.22,0.9,0.3,1)] will-change-transform motion-reduce:transition-none" style={{ transform: `translateX(${tabIndex * 100}%)` }} />
                  <button type="button" onClick={() => setActiveContent('chapters')} aria-current={activeContent === 'chapters'} className={tabClass(activeContent === 'chapters')}>
                    <ChaptersTabIcon size={22} /> Capítulos ({chapters.length})
                  </button>
                  <button type="button" onClick={() => setActiveContent('synopsis')} aria-current={activeContent === 'synopsis'} className={tabClass(activeContent === 'synopsis')}>
                    <SynopsisTabIcon size={19} /> Sinopsis
                  </button>
                  <a href="#comentarios" className={tabClass()}>
                    <CommentsTabIcon size={22} /> Comentarios
                  </a>
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
              ) : (
                <section id="sinopsis" aria-label="Sinopsis" className="mt-5 scroll-mt-28 rounded-2xl border-[0.5px] border-line bg-surface/60 p-5">
                  {manga.tituloOriginal && <p className="mb-3 text-center text-xs">{manga.tituloOriginal}</p>}
                  <p ref={synopsisRef} className={`text-justify font-montserrat text-[14px] font-normal leading-6 text-ink/90 ${synopsisExpanded ? '' : 'line-clamp-[9]'}`}>{synopsis || 'La sinopsis de este manga todavía no está disponible.'}</p>
                  {synopsisHasOverflow && (
                    <button type="button" onClick={() => setSynopsisExpanded((current) => !current)} className="mx-auto mt-3 flex items-center gap-1 font-montserrat text-[11px] font-semibold text-mukai-magenta">
                      {synopsisExpanded ? 'Ver menos' : 'Ver más'}<ChevronDown size={14} className={synopsisExpanded ? 'rotate-180' : ''} />
                    </button>
                  )}
                </section>
              )}

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
              <div className="manga-detail-comments"><MangaComments key={manga.id} mangaId={String(manga.id)} initialComments={initialComments} loading={commentsLoading} loadError={commentsError} /></div>
              <Footer homeDesign className="manga-detail-footer" />
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
