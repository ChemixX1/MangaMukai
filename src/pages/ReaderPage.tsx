import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { getStoredUser, getStoredToken, getAuthCacheKey, buyChapter, refreshUser, getUnlockedChapters, AUTH_CHANGED_EVENT } from "../services/authService";
import { AlarmIcon, MoonIcon, SunIcon } from "../components/ui";
import { OPEN_TIMER_EVENT } from "../components/layout/useNavbarState";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { PurchaseModal } from "../components/modals";
import { getMangaById, trackChapterView } from "../services/mangaService";
import { recordChapterProgress, recordMangaRead } from "../services/socialService";
import { MangaDetailClock } from "../components/common/MangaDetailClock";
import { MangaDetailSocials } from "../components/manga/MangaDetailSocials";
import { ReaderReactions } from "../components/manga/ReaderReactions";
import { MangaCommunityLinks } from "../components/manga/MangaCommunityLinks";
import { MangaComments } from "../components/manga/MangaComments";
import { MangaMusicCard } from "../components/manga/MangaMusicCard";
import { ReaderLoadingSkeleton } from "../components/manga/ReaderLoadingSkeleton";
import { ReaderImages } from "../components/manga/ReaderImages";
import { getMangaComments, type MangaComment } from "../services/communityService";
import { useTheme } from "../hooks/useTheme";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { getKnownMangaTitle } from "../services/mangaTitles";
import { peekChapterMetadata, readChapterNavigationState, type ChapterMetadata } from "../services/chapterMetadata";
import { cleanTitle } from "../utils/mangaFormat";
import { getBackgroundPolicy } from "../utils/backgroundTasks";
import { ReaderChapterSelect } from "../components/manga/ReaderChapterSelect";
import { chapterReaderSession, peekReaderSession, type ReaderPrefetchSession, type ReaderSibling } from "../services/readerPrefetchSession";
import '../styles/reader.css';

interface ChapterImage {
  id: string;
  image_url: string;
  page_number: number;
}

interface NavigationData {
  id: string;
  prevId: string | null;
  nextId: string | null;
  mangaId: string | null;
  title: string;
  chapterNum: number;
  nextChapterNum: number | null;
  nextIsPaid: boolean;
  nextPrice: number;
  isNextUnlocked: boolean;
}

const navigationFor = (id: string, mangaId: string, title: string, number: number, chapters: ReaderSibling[], unlocked: Set<string>): NavigationData => {
  const index = chapters.findIndex(chapter => String(chapter.id) === id);
  const previous = index > 0 ? chapters[index - 1] : undefined;
  const next = index >= 0 ? chapters[index + 1] : undefined;
  const nextIsPaid = !!next?.is_paid && !(next.free_at && new Date(next.free_at) <= new Date());
  return { id, mangaId, title, chapterNum: number, prevId: previous ? String(previous.id) : null, nextId: next ? String(next.id) : null, nextChapterNum: next?.chapter_number ?? null, nextIsPaid, nextPrice: next?.price_coins || 0, isNextUnlocked: !nextIsPaid || unlocked.has(String(next?.id)) };
};

export const ReaderPage = () => {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const pageSurface = 'bg-surface text-ink';

  const [images, setImages] = useState<ChapterImage[]>([]);
  const [imageOwner, setImageOwner] = useState('');
  const [loadedNavData, setNavData] = useState<NavigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const purchaseInFlight = useRef(false);
  const [lock, setLock] = useState<{ price: number; requiresLogin: boolean; freeAt: string | null } | null>(null);
  const [lockManga, setLockManga] = useState<{ cover: string; title: string } | null>(null);
  const [chapterComments, setChapterComments] = useState<MangaComment[]>([]);

  const [userCoins, setUserCoins] = useState(0);
  const [userId, setUserId] = useState<string>("");

  const unlockedRef = useRef<Set<string> | null>(null);
  const metadataSession = chapterId ? peekReaderSession(chapterId) : null;
  const knownChapters = metadataSession?.peekSiblings() || [];
  const knownMetadata = chapterId ? metadataSession?.peekMetadata(chapterId) || readChapterNavigationState(location.state, chapterId) || peekChapterMetadata(chapterId) : undefined;
  const navData = loadedNavData?.id === chapterId ? loadedNavData
    : chapterId && knownMetadata
      ? navigationFor(chapterId, knownMetadata.mangaId, knownMetadata.title, knownMetadata.number, knownChapters, unlockedRef.current || new Set())
      : null;
  const chapterOptions = knownChapters.map(chapter => ({ id: String(chapter.id), number: chapter.chapter_number, isPaid: chapter.is_paid && !(chapter.free_at && new Date(chapter.free_at) <= new Date()), price: chapter.price_coins, isPurchased: unlockedRef.current?.has(String(chapter.id)) || false }));

  const mangaId = navData?.mangaId || metadataSession?.mangaId;
  const mangaTitle = (mangaId ? getKnownMangaTitle(mangaId) : undefined)
    || (chapterId ? getKnownMangaTitle(chapterId) : undefined)
    || (navData ? cleanTitle(navData.title).replace(/\s*[—–|:-]\s*$/, '').trim() : undefined)
    || undefined;
  const readerTitle = navData
    ? (new RegExp(`cap[ií]tulo\\s*0*${navData.chapterNum}(\\D|$)`, 'i').test(navData.title)
        ? navData.title
        : `${navData.title} — Capítulo ${navData.chapterNum}`)
    : undefined;
  useDocumentTitle(
    mangaTitle,
    readerTitle ? `Lee ${readerTitle} en español en MangaMukai. Consulta su disponibilidad y sigue los capítulos de la historia.` : undefined,
    { path: `/read/${chapterId}`, noindex: navData ? false : !loading && !!error ? true : undefined },
  );

  const sessionRef = useRef<ReaderPrefetchSession | null>(null);
  const [imagesComplete, setImagesComplete] = useState(false);
  const imagesCompleteRef = useRef(false);
  const siblingsRef = useRef<ReaderSibling[]>([]);
  const chapterRef = useRef(chapterId);
  const [authGeneration, setAuthGeneration] = useState(0);

  const fetchUserProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    const user = await refreshUser();
    if (user) {
      setUserId(String(user.id));
      setUserCoins(user.coins || 0);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUserId(String(stored.id));
      setUserCoins(stored.coins || 0);
    }
    fetchUserProfile();
  }, [fetchUserProfile]);

  const goToRecharge = () => navigate('/recargar', { state: { returnTo: `/read/${chapterId}` } });
  const goToLogin = () => {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    navigate(`/auth/login?${new URLSearchParams({ returnTo })}`, { state: { returnTo } });
  };

  useEffect(() => {
    if (!chapterRef.current) return;
    const session = chapterReaderSession(chapterRef.current);
    sessionRef.current = session;
    let owner = getAuthCacheKey();
    const changed = () => {
      const next = getAuthCacheKey();
      if (owner === next) return;
      owner = next;
      if (chapterRef.current) sessionRef.current = chapterReaderSession(chapterRef.current);
      unlockedRef.current = null;
      setAuthGeneration(value => value + 1);
    };
    const visibility = () => {
      const current = sessionRef.current;
      if (document.hidden) current?.pause();
      else if (chapterRef.current && imagesCompleteRef.current) current?.warmAround(siblingsRef.current, chapterRef.current, unlockedRef.current || new Set());
    };
    const connection = (navigator as Navigator & { connection?: Partial<EventTarget> }).connection;
    let canSpeculate = getBackgroundPolicy().allowSpeculation;
    const network = () => {
      const allowed = getBackgroundPolicy().allowSpeculation;
      const recovered = allowed && !canSpeculate;
      canSpeculate = allowed;
      if (recovered && !document.hidden) visibility();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, changed);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    connection?.addEventListener?.('change', network);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, changed);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
      connection?.removeEventListener?.('change', network);
      document.removeEventListener('visibilitychange', visibility);
      sessionRef.current?.pause();
      sessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chapterId) return;
    const session = chapterReaderSession(chapterId);
    const clickedChapter = readChapterNavigationState(location.state, chapterId);
    if (clickedChapter) session.seedMetadata(clickedChapter);
    sessionRef.current = session;
    chapterRef.current = chapterId;
    session.focus(chapterId);
    const cached = session.peek(chapterId);
    setImageOwner(`${chapterId}:${authGeneration}`);
    setLoading(!cached);
    setImagesComplete(false);
    imagesCompleteRef.current = false;
    siblingsRef.current = session.peekSiblings();
    setNavData(null);
    setLockManga(null);
    setPurchaseOpen(false);
    setError(cached?.error || null);
    setLock(cached?.locked ? { price: cached.price, requiresLogin: cached.requiresLogin, freeAt: null } : null);
    setImages(cached?.images.map((url, index) => ({ id: String(index), image_url: url, page_number: index + 1 })) || []);
    setChapterComments([]);

    let active = true;
    const commentsController = new AbortController();
    const loadNavigation = async (metadata: ChapterMetadata) => {
      if (!active) return [];
      setNavData(navigationFor(chapterId, metadata.mangaId, metadata.title, metadata.number, session.peekSiblings(), unlockedRef.current || new Set()));
      const chapters = metadata.mangaId ? await session.siblings(metadata.mangaId) : [];
      if (active) {
        siblingsRef.current = chapters;
        setNavData(navigationFor(chapterId, metadata.mangaId, metadata.title, metadata.number, chapters, unlockedRef.current || new Set()));
      }
      return chapters;
    };
    // Start the selector first when home/detail already supplied the series ID.
    // Direct links request it as soon as metadata arrives, independently of content.
    const metadata = session.peekMetadata(chapterId);
    const chaptersPromise = (metadata ? loadNavigation(metadata) : session.metadata(chapterId).then(loadNavigation)).catch(() => []);
    void (async () => {
      try {
        const data = await session.load(chapterId);
        if (!active) return;

        setImages(data.images.map((url, index) => ({ id: String(index), image_url: url, page_number: index + 1 })));
        setError(data.error);
        setLock(data.locked ? { price: data.price, requiresLogin: data.requiresLogin, freeAt: null } : null);
        setNavData(navigationFor(chapterId, data.mangaId, data.title, data.number, session.peekSiblings(), unlockedRef.current || new Set()));
        setLoading(false);
        const unlockedPromise = unlockedRef.current ? Promise.resolve(unlockedRef.current) : getStoredToken() ? getUnlockedChapters().catch(() => new Set<string>()) : Promise.resolve(new Set<string>());
        const [chapters, unlocked] = await Promise.all([chaptersPromise, unlockedPromise]);
        if (!active) return;
        void getMangaComments(data.mangaId, chapterId, commentsController.signal)
          .then(items => { if (active) setChapterComments(items); }).catch(() => undefined);
        unlockedRef.current = unlocked;
        siblingsRef.current = chapters;
        setNavData(navigationFor(chapterId, data.mangaId, data.title, data.number, chapters, unlocked));
        setError(data.error);

        const currentChapter = chapters.find(chapter => String(chapter.id) === chapterId);
        setLock(data.locked ? { price: data.price || currentChapter?.price_coins || 0, requiresLogin: data.requiresLogin, freeAt: currentChapter?.free_at ?? null } : null);
        if (data.locked) {
          const cover = currentChapter?.cover_url?.trim() || '';
          setLockManga({ cover, title: data.title });
          if (data.mangaId) {
            void getMangaById(data.mangaId).then(manga => {
              if (active && manga) setLockManga({ cover: cover || manga.portada || '', title: manga.titulo || '' });
            }).catch(() => undefined);
          }
        }
        if (data.mangaId && !data.error && !data.locked) {
          void trackChapterView(chapterId, data.mangaId);

          if (getStoredToken()) {
            void recordMangaRead(data.mangaId, chapterId).catch(() => undefined);

            void recordChapterProgress(chapterId, data.mangaId, false).catch(() => undefined);
          }
        }
        if (imagesCompleteRef.current) session.warmAround(chapters, chapterId, unlocked);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'No se pudo cargar el capítulo.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; commentsController.abort(); };
  }, [chapterId, authGeneration, location.state]);

  const chapterEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = chapterEndRef.current;
    const mangaId = navData?.mangaId;
    if (loading || !imagesComplete || !target || !mangaId || !chapterId || images.length === 0 || !getStoredToken()) return;
    let reported = false;
    const observer = new IntersectionObserver((entries) => {
      if (reported || !entries.some((entry) => entry.isIntersecting)) return;
      reported = true;
      observer.disconnect();
      void recordChapterProgress(chapterId, mangaId, true).catch(() => undefined);
    }, { threshold: 0.5 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, imagesComplete, images.length, navData?.mangaId, chapterId]);

  useEffect(() => {
    if (loading || (!imagesComplete && !lock) || location.hash !== '#comentarios') return;
    const timer = window.setTimeout(() => document.getElementById('comentarios')?.scrollIntoView({ behavior: 'smooth' }), 150);
    return () => window.clearTimeout(timer);
  }, [loading, imagesComplete, lock, location.hash, chapterId]);

  const handleNextClick = () => {
    if (navData?.nextId) navigate(`/read/${navData.nextId}`);
  };

  const handleUnlockCurrent = async () => {
    if (!chapterId || !lock || purchaseInFlight.current) return;
    if (!userId || lock.requiresLogin) {
      goToLogin();
      return;
    }
    if (userCoins < lock.price) {
      goToRecharge();
      return;
    }
    const origin = chapterId;
    const session = sessionRef.current;
    purchaseInFlight.current = true;
    setUnlocking(true);
    try {
      const result = await buyChapter(chapterId);
      if (chapterRef.current !== origin || sessionRef.current !== session) return;
      if (result.success) {
        setUserCoins(result.coins);
        unlockedRef.current ??= new Set();
        unlockedRef.current.add(chapterId);
        setPurchaseOpen(false);
        sessionRef.current?.invalidate(chapterId);
        setLock(null);
        setLoading(true);

        setAuthGeneration((value) => value + 1);
      } else if (result.message.includes('saldo') || result.message.includes('insuficiente')) {
        goToRecharge();
      } else {
        alert('Error: ' + (result.message || 'No se pudo desbloquear'));
      }
    } catch {
      if (chapterRef.current === origin) alert('No se pudo procesar la compra. Inténtalo de nuevo.');
    } finally {
      purchaseInFlight.current = false;
      setUnlocking(false);
    }
  };

  if (error && !lock) return (
    <div className={`reader-page min-h-screen flex flex-col items-center justify-center gap-6 px-4 ${pageSurface}`}>
      <Lock className="w-16 h-16 text-yellow-400" />
      <div className="text-center">
        <h1 className="text-xl font-black mb-2">Capítulo no disponible</h1>
        <p className="text-zinc-400 text-sm max-w-xs">{error}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition-colors">Volver</button>
      </div>
    </div>
  );

  const loginRequired = !getStoredToken() || !!lock?.requiresLogin;
  const closePurchase = () => { if (!unlocking) setPurchaseOpen(false); };

  const lockedMangaTitle = (lockManga?.title || navData?.title || '').replace(/\s*(?:[—–|:-]\s*)?cap[ií]tulo\s*\d+(?:[.,]\d+)?\s*$/iu, '').trim();

  const chapterNavigation = (showHome: boolean) => (
    <div className="reader-navigation">
      <button type="button" onClick={() => navData?.prevId && navigate(`/read/${navData.prevId}`)} disabled={!navData?.prevId} aria-label="Capítulo anterior" className="reader-navigation__button"><ChevronLeft size={24} /><span className={showHome ? "hidden sm:inline" : "hidden lg:inline"}>Anterior</span></button>
      {showHome && <button type="button" onClick={() => navigate(navData?.mangaId ? `/manga/${navData.mangaId}` : '/')} aria-label="Volver al manga" className="reader-navigation__button"><svg width="25" height="25" viewBox="0 0 25 25" fill="none" aria-hidden="true"><path d="M22.9161 13.1945C22.8247 13.195 22.7341 13.1775 22.6495 13.1429C22.5649 13.1084 22.4879 13.0574 22.4231 12.9931L12.4994 3.06251L2.57584 12.9931C2.44299 13.1068 2.2721 13.1663 2.09733 13.1595C1.92255 13.1528 1.75676 13.0803 1.63309 12.9567C1.50941 12.833 1.43696 12.6672 1.43021 12.4924C1.42345 12.3176 1.4829 12.1467 1.59667 12.0139L12.0133 1.59723C12.1435 1.46789 12.3195 1.39529 12.5029 1.39529C12.6864 1.39529 12.8624 1.46789 12.9925 1.59723L23.4092 12.0139C23.5047 12.1114 23.5694 12.2349 23.5952 12.3689C23.621 12.503 23.6067 12.6417 23.554 12.7676C23.5014 12.8936 23.4129 13.0013 23.2994 13.0772C23.1859 13.1531 23.0526 13.1939 22.9161 13.1945Z" fill="currentColor"/><path d="M12.4993 5.40973L4.16602 13.7708V22.2222C4.16602 22.5906 4.31234 22.9439 4.57281 23.2043C4.83328 23.4648 5.18655 23.6111 5.5549 23.6111H10.416V16.6667H14.5827V23.6111H19.4438C19.8121 23.6111 20.1654 23.4648 20.4259 23.2043C20.6864 22.9439 20.8327 22.5906 20.8327 22.2222V13.7222L12.4993 5.40973Z" fill="currentColor"/></svg><span className="hidden sm:inline">Home</span></button>}
      <button type="button" onClick={handleNextClick} disabled={!navData?.nextId || unlocking} aria-label="Capítulo siguiente" className={`reader-navigation__button${navData?.nextId && navData.nextIsPaid ? ' reader-navigation__button--next' : ''}`}><span className={showHome ? "hidden sm:inline" : "hidden lg:inline"}>Siguiente</span><ChevronRight size={24} /></button>
    </div>
  );

  return (
    <div className={`reader-page min-h-screen relative flex flex-col items-center transition-colors ${pageSurface}`}>
      {lock && purchaseOpen && <PurchaseModal
        isOpen
        onClose={closePurchase}
        onBack={closePurchase}
        onConfirm={() => void handleUnlockCurrent()}
        onRecharge={() => { if (!getStoredToken() || lock.requiresLogin) goToLogin(); else goToRecharge(); }}
        chapterNumber={navData?.chapterNum ?? ''}
        price={lock.price}
        userBalance={userCoins}
        loading={unlocking}
        freeAt={lock.freeAt}
        loginRequired={!getStoredToken() || lock.requiresLogin}
      />}


      {!lock && <h1 className="sr-only">{readerTitle || 'Lector de manga'}</h1>}
      <div className="reader-content w-full max-w-[1100px] mx-auto flex flex-col items-center gap-6 pt-28 px-0 lg:px-4 pb-20 relative">
        <div className="reader-topbar">
          <div className="reader-mobile-controls">
            <button type="button" onClick={toggleTheme} aria-label={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}>
              {isLight ? <MoonIcon size={26} /> : <SunIcon size={26} />}
            </button>
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_TIMER_EVENT))} aria-label="Abrir temporizador"><AlarmIcon size={22} /></button>
            <Link to="/recargar" state={{ returnTo: `${location.pathname}${location.search}` }} aria-label="Recargar monedas"><svg width="26" height="26" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M6.123 7.25L6.914 2H2.8L1.081 6.5C1.02767 6.66 1.00067 6.82667 1 7C1 8.104 2.15 9 3.571 9C4.881 9 5.964 8.236 6.123 7.25ZM10 9C11.42 9 12.571 8.104 12.571 7C12.5703 6.95867 12.5687 6.91833 12.566 6.879L12.057 2H7.943L7.433 6.875L7.429 7C7.429 8.104 8.58 9 10 9ZM15 10.046V14H5V10.052C4.562 10.21 4.08 10.3 3.571 10.3C3.376 10.3 3.187 10.277 3 10.251V16.6C3 17.37 3.629 18 4.398 18H15.6C16.37 18 17 17.369 17 16.6V10.252C16.8111 10.282 16.6203 10.2983 16.429 10.301C15.9415 10.2996 15.4579 10.2133 15 10.046ZM18.92 6.5L17.199 2H13.086L13.876 7.242C14.03 8.232 15.113 9 16.429 9C17.849 9 19 8.104 19 7C18.9993 6.82667 18.9727 6.66 18.92 6.5Z" fill="currentColor" />
              </svg></Link>
          </div>
          <MangaDetailClock />
          <MangaDetailSocials />
        </div>


        <aside className="reader-music-section w-full max-w-[540px] px-4 lg:px-0 h-fit z-40 shrink-0 space-y-9">
             <MangaMusicCard cover="" isLight={isLight} compactHeight />
             <nav aria-label="Navegación del capítulo" className="reader-top-navigation mx-auto w-full max-w-[420px] space-y-5">
               {chapterNavigation(true)}
               <ReaderChapterSelect value={chapterId} number={navData?.chapterNum} options={chapterOptions} isLight={isLight} onChange={id => navigate(`/read/${id}`)} />
             </nav>
        </aside>


        <main className="w-full max-w-none lg:max-w-[800px] mx-auto border-0 min-h-[50vh] flex flex-col gap-0 items-center relative z-10">
          {lock ? (
            <section className="reader-locked-chapter" aria-label="Capítulo bloqueado">
              <div className="reader-locked-chapter__art">
                {lockManga?.cover ? <img src={lockManga.cover} alt={`Portada de ${lockManga.title}`} className="reader-locked-chapter__cover" /> : <div className="reader-locked-chapter__placeholder" />}
                <div className="reader-locked-chapter__veil"><span className="reader-locked-chapter__lock"><Lock size={28} strokeWidth={1.7} aria-hidden="true" /></span></div>
              </div>
              <h1 className="reader-locked-chapter__title">{lockedMangaTitle}</h1>
              <p className="reader-chapter-end__number">Capítulo {navData?.chapterNum ?? '…'}</p>
              <button type="button" onClick={() => loginRequired ? goToLogin() : setPurchaseOpen(true)} disabled={loading || !navData} className={`reader-locked-chapter__unlock${loginRequired ? ' reader-locked-chapter__unlock--login' : ''}`}>
                <Lock size={18} aria-hidden="true" /> {loginRequired ? 'Iniciar sesión' : 'Desbloquear capítulo'}
              </button>
            </section>
          ) : imageOwner === `${chapterId}:${authGeneration}` && images.length > 0 ? (
            <ReaderImages key={`${chapterId}:${authGeneration}`} images={images} title={navData?.title} onComplete={() => {
              setImagesComplete(true);
              imagesCompleteRef.current = true;
              if (chapterId) sessionRef.current?.warmAround(siblingsRef.current, chapterId, unlockedRef.current || new Set());
            }} />
          ) : !loading ? (
              <div className="h-96 flex flex-col items-center justify-center text-zinc-500 gap-4"><p>Sin páginas.</p></div>
          ) : <ReaderLoadingSkeleton key={chapterId} />}


          {!loading && (imagesComplete || lock) && <>
          <div className={`w-full p-6 md:p-10 flex flex-col gap-8 border-t ${isLight ? 'border-black/10' : 'border-zinc-900'}`}>
             {!lock && <div ref={chapterEndRef} className="reader-chapter-end text-center space-y-3">
              <p className="reader-chapter-end__label">Fin del capítulo {navData?.chapterNum}</p>
            </div>}

            <nav aria-label="Navegación al final del capítulo" className="reader-bottom-navigation space-y-5">
              {chapterNavigation(false)}
              <ReaderChapterSelect value={chapterId} number={navData?.chapterNum} options={chapterOptions} isLight={isLight} onChange={id => navigate(`/read/${id}`)} />
            </nav>
          </div>

          <div className="w-full px-4 pb-24 pt-4 md:px-8">
            <MangaCommunityLinks />
            {chapterId && <ReaderReactions key={`${chapterId}:${authGeneration}`} chapterId={chapterId} />}
            <MangaComments key={chapterId} mangaId={navData?.mangaId || ''} chapterId={chapterId} initialComments={chapterComments} />
          </div>
          </>}
        </main>

      </div>

    </div>
  );
};
