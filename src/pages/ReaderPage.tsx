import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getStoredUser, getStoredToken, buyChapter, refreshUser, getUnlockedChapters, AUTH_CHANGED_EVENT } from "../services/authService";
import { Loader2, ChevronLeft, ChevronRight, Home, Coins, Lock } from "lucide-react";
import { PurchaseModal } from "../components/modals";
import { getMangaById, trackChapterView } from "../services/mangaService";
import { recordChapterProgress, recordMangaRead } from "../services/socialService";
import { FOOTER_SOCIALS } from "../components/layout/Footer";
import { MangaComments } from "../components/manga/MangaComments";
import { MangaMusicCard } from "../components/manga/MangaMusicCard";
import { MukaiLoaderWheel } from "../components/common/MukaiLoaderWheel";
import { getMangaComments, type MangaComment } from "../services/communityService";
import { useTheme } from "../hooks/useTheme";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ReaderChapterSelect } from "../components/manga/ReaderChapterSelect";
import { ReaderPrefetchSession, type ReaderSibling } from "../services/readerPrefetchSession";

interface ChapterImage {
  id: string;
  image_url: string;
  page_number: number;
}

interface NavigationData {
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

export const ReaderPage = () => {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const pageSurface = isLight ? 'bg-white text-[#18181b]' : 'bg-black text-white';
  const navigationSurface = isLight ? 'border-black/10 bg-[#f4f4f5] hover:bg-zinc-200' : 'border-white/15 bg-zinc-900 hover:bg-zinc-800';
  
  const [images, setImages] = useState<ChapterImage[]>([]);
  const [navData, setNavData] = useState<NavigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  // Capítulo de pago sin comprar: se compra aquí mismo sobre un fondo desenfocado (la portada,
  // nunca páginas reales: el servidor no las entrega hasta la compra).
  const [lock, setLock] = useState<{ price: number; requiresLogin: boolean; freeAt: string | null } | null>(null);
  const [lockManga, setLockManga] = useState<{ cover: string; title: string } | null>(null);
  const [chapterOptions, setChapterOptions] = useState<Array<{ id: string; number: number }>>([]);
  const [chapterComments, setChapterComments] = useState<MangaComment[]>([]);

  // Estados de Usuario
  const [userCoins, setUserCoins] = useState(0);
  const [userId, setUserId] = useState<string>("");

  // El título del capítulo suele traer ya el número; solo se añade si falta.
  const readerTitle = navData
    ? (new RegExp(`cap[ií]tulo\\s*0*${navData.chapterNum}(\\D|$)`, 'i').test(navData.title)
        ? navData.title
        : `${navData.title} — Capítulo ${navData.chapterNum}`)
    : undefined;
  useDocumentTitle(
    readerTitle,
    readerTitle ? `Lee ${readerTitle} online y en español, gratis y en alta calidad en MangaMukai.` : undefined,
  );

  const sessionRef = useRef<ReaderPrefetchSession | null>(null);
  const firstReaderLoad = useRef(true);
  const unlockedRef = useRef<Set<string> | null>(null);
  const siblingsRef = useRef<ReaderSibling[]>([]);
  const chapterRef = useRef(chapterId);
  const [authGeneration, setAuthGeneration] = useState(0);

  // 1. FETCH USUARIO Y MONEDAS (WordPress)
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

  useEffect(() => {
    const session = new ReaderPrefetchSession();
    sessionRef.current = session;
    let owner = String(getStoredUser()?.id || '');
    const changed = () => {
      const next = String(getStoredUser()?.id || '');
      if (owner === next) return;
      owner = next;
      sessionRef.current?.dispose();
      sessionRef.current = new ReaderPrefetchSession();
      unlockedRef.current = null;
      setAuthGeneration(value => value + 1);
    };
    const visibility = () => {
      const current = sessionRef.current;
      if (document.hidden) current?.pause();
      else if (chapterRef.current) current?.warmAround(siblingsRef.current, chapterRef.current, unlockedRef.current || new Set());
    };
    window.addEventListener(AUTH_CHANGED_EVENT, changed);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, changed);
      document.removeEventListener('visibilitychange', visibility);
      sessionRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const session = sessionRef.current;
    if (!chapterId || !session) return;
    chapterRef.current = chapterId;
    session.focus(chapterId);
    const cached = session.peek(chapterId);
    setLoading(!cached);
    setError(cached?.error || null);
    setLock(cached?.locked ? { price: cached.price, requiresLogin: cached.requiresLogin, freeAt: null } : null);
    setImages(cached?.images.map((url, index) => ({ id: String(index), image_url: url, page_number: index + 1 })) || []);
    setChapterComments([]);
    window.scrollTo(0, 0);
    let active = true;
    const commentsController = new AbortController();
    void (async () => {
      try {
        const data = await session.load(chapterId);
        if (!active) return;
        const comments = getMangaComments(data.mangaId, chapterId, commentsController.signal);
        void comments.then(items => { if (active) setChapterComments(items); });
        const chaptersPromise = data.mangaId ? session.siblings(data.mangaId) : Promise.resolve([]);
        const unlockedPromise = unlockedRef.current ? Promise.resolve(unlockedRef.current) : getStoredToken() ? getUnlockedChapters() : Promise.resolve(new Set<string>());
        if (!cached && !data.error) await session.warmImages(data, true);
        const [chapters, unlocked] = await Promise.all([chaptersPromise, unlockedPromise]);
        if (!active) return;
        unlockedRef.current = unlocked;
        siblingsRef.current = chapters;
        setChapterOptions(chapters.map(chapter => ({ id: String(chapter.id), number: chapter.chapter_number })));
        const index = chapters.findIndex(chapter => String(chapter.id) === chapterId);
        const previous = index > 0 ? chapters[index - 1] : null;
        const next = index >= 0 ? chapters[index + 1] : null;
        setNavData({ prevId: previous ? String(previous.id) : null, nextId: next ? String(next.id) : null, mangaId: data.mangaId, title: data.title, chapterNum: data.number, nextChapterNum: next?.chapter_number || null, nextIsPaid: !!next?.is_paid, nextPrice: next?.price_coins || 0, isNextUnlocked: !next?.is_paid || unlocked.has(String(next.id)) });
        setImages(data.images.map((url, index) => ({ id: String(index), image_url: url, page_number: index + 1 })));
        setError(data.error);
        // Sin sesión el servidor no manda el precio (401): se toma del listado de capítulos.
        const currentChapter = chapters.find(chapter => String(chapter.id) === chapterId);
        setLock(data.locked ? { price: data.price || currentChapter?.price_coins || 0, requiresLogin: data.requiresLogin, freeAt: currentChapter?.free_at ?? null } : null);
        if (data.locked && data.mangaId) {
          void getMangaById(data.mangaId).then((manga) => { if (active && manga) setLockManga({ cover: manga.portada || '', title: manga.titulo || '' }); }).catch(() => undefined);
        }
        if (data.mangaId && !data.error && !data.locked) {
          void trackChapterView(chapterId, data.mangaId);
          // Cuenta la serie como leída en el perfil (solo con sesión).
          if (getStoredToken()) {
            void recordMangaRead(data.mangaId, chapterId).catch(() => undefined);
            // Capítulo abierto (aún sin terminar): aparece en Actividad hasta llegar al final.
            void recordChapterProgress(chapterId, data.mangaId, false).catch(() => undefined);
          }
        }
        session.warmAround(chapters, chapterId, unlocked);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'No se pudo cargar el capítulo.');
      } finally {
        if (active) { firstReaderLoad.current = false; setLoading(false); }
      }
    })();
    return () => { active = false; commentsController.abort(); };
  }, [chapterId, authGeneration]);

  // Al ver el pie "Fin del capítulo" se da el capítulo por terminado (sale de Actividad).
  const chapterEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = chapterEndRef.current;
    const mangaId = navData?.mangaId;
    if (loading || !target || !mangaId || !chapterId || images.length === 0 || !getStoredToken()) return;
    let reported = false;
    const observer = new IntersectionObserver((entries) => {
      if (reported || !entries.some((entry) => entry.isIntersecting)) return;
      reported = true;
      observer.disconnect();
      void recordChapterProgress(chapterId, mangaId, true).catch(() => undefined);
    }, { threshold: 0.5 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, images.length, navData?.mangaId, chapterId]);

  useEffect(() => {
    if (loading || location.hash !== '#comentarios') return;
    const timer = window.setTimeout(() => document.getElementById('comentarios')?.scrollIntoView({ behavior: 'smooth' }), 150);
    return () => window.clearTimeout(timer);
  }, [loading, location.hash, chapterId]);


  // 4. NAVEGACIÓN con compra si el capítulo siguiente es de pago
  const handleNextClick = async () => {
    if (!navData?.nextId) return;

    // Capítulo libre o ya desbloqueado → navegar directo
    if (!navData.nextIsPaid || navData.isNextUnlocked) {
      navigate(`/read/${navData.nextId}`);
      return;
    }

    // Sin sesión → no puede comprar
    if (!userId) {
      alert('Debes iniciar sesión para desbloquear este capítulo.');
      return;
    }

    // Sin monedas suficientes → abrir tienda
    if (userCoins < navData.nextPrice) {
      goToRecharge();
      return;
    }

    // Comprar capítulo
    setUnlocking(true);
    try {
      const result = await buyChapter(navData.nextId);
      if (result.success) {
        setUserCoins(result.coins);
        sessionRef.current?.invalidate(navData.nextId);
        unlockedRef.current?.add(navData.nextId);
        setNavData(prev => prev ? { ...prev, isNextUnlocked: true } : prev);
        navigate(`/read/${navData.nextId}`);
      } else if (result.message.includes('saldo') || result.message.includes('insuficiente')) {
        goToRecharge();
      } else {
        alert('Error: ' + (result.message || 'No se pudo desbloquear'));
      }
    } finally {
      setUnlocking(false);
    }
  };

  // Compra del capítulo actual (bloqueado) sin salir del lector.
  const handleUnlockCurrent = async () => {
    if (!chapterId || !lock || unlocking) return;
    if (!userId || lock.requiresLogin) {
      navigate('/auth/login', { state: { returnTo: `/read/${chapterId}` } });
      return;
    }
    if (userCoins < lock.price) {
      goToRecharge();
      return;
    }
    setUnlocking(true);
    try {
      const result = await buyChapter(chapterId);
      if (result.success) {
        setUserCoins(result.coins);
        unlockedRef.current?.add(chapterId);
        sessionRef.current?.invalidate(chapterId);
        setLock(null);
        setLoading(true);
        // Vuelve a pedir el capítulo: el servidor ya lo entrega comprado.
        setAuthGeneration((value) => value + 1);
      } else if (result.message.includes('saldo') || result.message.includes('insuficiente')) {
        goToRecharge();
      } else {
        alert('Error: ' + (result.message || 'No se pudo desbloquear'));
      }
    } finally {
      setUnlocking(false);
    }
  };

  if (loading && firstReaderLoad.current) return (
    <div className={`flex min-h-screen items-center justify-center ${pageSurface}`}>
      <MukaiLoaderWheel size={72} isLight={isLight} />
    </div>
  );
  if (lock) {
    const goToManga = () => navigate(navData?.mangaId ? `/manga/${navData.mangaId}` : '/');
    const loginRequired = !userId || lock.requiresLogin;
    return (
      <div className={`reader-page relative min-h-screen overflow-hidden ${pageSurface}`}>
        {/* Fondo: la portada repetida como "páginas" muy desenfocadas. Solo es la portada pública. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center gap-3 pt-24 select-none">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[520px] w-full max-w-[720px] overflow-hidden rounded-xl bg-zinc-700/40">
              {lockManga?.cover && <img src={lockManga.cover} alt="" className="h-full w-full scale-110 object-cover blur-2xl" draggable={false} />}
            </div>
          ))}
        </div>
        <div className={`absolute inset-0 ${isLight ? 'bg-white/60' : 'bg-black/65'}`} />

        {/* El mismo modal de compra de la ficha; "Regresar" vuelve a la serie. */}
        <PurchaseModal
          isOpen
          onClose={goToManga}
          onBack={goToManga}
          onConfirm={() => void handleUnlockCurrent()}
          onRecharge={() => { if (loginRequired) navigate('/auth/login', { state: { returnTo: `/read/${chapterId}` } }); else goToRecharge(); }}
          chapterNumber={navData?.chapterNum || ''}
          price={lock.price}
          userBalance={userCoins}
          loading={unlocking}
          freeAt={lock.freeAt}
          loginRequired={loginRequired}
        />
      </div>
    );
  }

  if (error) return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-6 px-4 ${pageSurface}`}>
      <Lock className="w-16 h-16 text-yellow-400" />
      <div className="text-center">
        <h2 className="text-xl font-black mb-2">Capítulo no disponible</h2>
        <p className="text-zinc-400 text-sm max-w-xs">{error}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition-colors">Volver</button>
      </div>
    </div>
  );

  const showLockState = navData?.nextIsPaid && !navData?.isNextUnlocked;

  return (
    <div className={`reader-page min-h-screen relative flex flex-col items-center transition-colors ${pageSurface}`}>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="w-full max-w-[1100px] mx-auto flex flex-col items-center gap-6 pt-28 px-0 lg:px-4 pb-20 relative">

        {/* IZQUIERDA: REPRODUCTOR - ESTATICO (NO STICKY) */}
        <aside className="w-full max-w-[540px] px-4 lg:px-0 h-fit z-40 shrink-0 space-y-5">
             <nav className="flex flex-wrap items-center justify-center gap-0" aria-label="Redes sociales de MangaMukai">
               {FOOTER_SOCIALS.map(({ name, href, Icon }) => <a key={name} href={href} target="_blank" rel="noopener noreferrer" title={name} aria-label={name} className="grid h-8 w-6 sm:h-9 sm:w-7 place-items-center transition hover:text-[#FF4D88]"><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></a>)}
             </nav>
             <MangaMusicCard cover="" isLight={isLight} compactHeight singleLineDescription />
             <nav aria-label="Navegación del capítulo" className="mx-auto max-w-lg space-y-4">
               <div className="flex items-center justify-center gap-2 sm:gap-3">
                 <button type="button" onClick={() => navData?.prevId && navigate(`/read/${navData.prevId}`)} disabled={!navData?.prevId} className={`flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl border px-3 text-sm disabled:opacity-30 ${navigationSurface}`}><ChevronLeft size={20} />Anterior</button>
                 <button type="button" onClick={() => navigate(navData?.mangaId ? `/manga/${navData.mangaId}` : '/')} className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border px-3 text-sm ${navigationSurface}`}><Home size={20} />Inicio</button>
                 <button type="button" onClick={handleNextClick} disabled={!navData?.nextId || unlocking} className={`flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl border px-3 text-sm disabled:opacity-30 ${navigationSurface}`}>Siguiente<ChevronRight size={20} /></button>
               </div>
               <ReaderChapterSelect value={chapterId} number={navData?.chapterNum} options={chapterOptions} isLight={isLight} onChange={id => navigate(`/read/${id}`)} />
             </nav>
        </aside>

        {/* CENTRAL: LECTOR */}
        <main className="w-full max-w-none lg:max-w-[800px] mx-auto border-0 min-h-[50vh] flex flex-col gap-0 items-center relative z-10">
          {loading ? <div className="flex h-[50vh] items-center justify-center"><MukaiLoaderWheel size={48} isLight={isLight} /></div> : images.length > 0 ? (
              images.map((img) => (
              <img 
                  key={img.id} src={img.image_url} alt={navData ? `${navData.title} — página ${img.page_number}` : `Página ${img.page_number}`}
                  className="w-full h-auto block shrink-0 select-none m-0 p-0"
                  loading="lazy" style={{ display: 'block' }} 
              />
              ))
          ) : (
              <div className="h-96 flex flex-col items-center justify-center text-zinc-500 gap-4"><p>Sin páginas.</p></div>
          )}

          {/* Footer Navegación */}
          <div className={`w-full p-6 md:p-10 flex flex-col gap-8 border-t ${isLight ? 'bg-[#f8fafc] border-black/10' : 'bg-zinc-950 border-zinc-900'}`}>
             <div ref={chapterEndRef} className="text-center space-y-2">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em]">Fin del capítulo {navData?.chapterNum}</p>
              <h3 className="font-black text-xl md:text-2xl tracking-tight">{navData?.title || "Sin título"}</h3>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                <button onClick={() => navData?.prevId && navigate(`/read/${navData.prevId}`)} disabled={!navData?.prevId} className={`w-full md:flex-1 h-14 flex items-center justify-center gap-2 rounded-xl font-bold transition-all border disabled:opacity-30 ${navigationSurface}`}> <ChevronLeft size={20} /> Anterior </button>
                <button onClick={() => navigate(navData?.mangaId ? `/manga/${navData.mangaId}` : '/')} aria-label="Volver al manga" className={`w-14 h-14 shrink-0 flex items-center justify-center rounded-xl border transition-colors ${navigationSurface}`}> <Home size={22} /> </button>
                
                {/* BOTÓN SIGUIENTE INTELIGENTE */}
                <button 
                    onClick={handleNextClick} 
                    disabled={!navData?.nextId || unlocking} 
                    className={`
                        w-full md:flex-1 h-14 flex items-center justify-center gap-3 rounded-xl font-black transition-all shadow-lg relative overflow-hidden group
                        border disabled:opacity-40 ${navigationSurface}
                    `}
                >
                    {unlocking ? (
                         <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={18}/> Procesando...</div>
                    ) : !navData?.nextId ? (
                        <span className="text-sm font-medium opacity-50">¡Estás al día!</span>
                    ) : showLockState ? (
                        /* BLOQUEADO (Pagar) */
                        <>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[9px] uppercase font-bold opacity-70">Capítulo {navData.nextChapterNum}</span>
                                <span className="text-sm font-black italic">
                                    {userCoins >= navData.nextPrice ? "DESBLOQUEAR" : "RECARGAR"}
                                </span>
                            </div>
                            <div className="w-[1px] h-6 bg-black/20 mx-1"></div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm ${userCoins >= navData.nextPrice ? 'bg-black/10' : 'bg-red-500/10 text-red-900'}`}>
                                <Lock size={14} />
                                <span className="text-sm font-black flex items-center gap-1">
                                    {navData.nextPrice} <Coins size={12} strokeWidth={3} />
                                </span>
                            </div>
                        </>
                    ) : (
                        /* DESBLOQUEADO (Siguiente) */
                        <> <div className="flex flex-col items-start leading-none text-left"> <span className="text-[9px] uppercase font-bold opacity-70">Capítulo {navData.nextChapterNum}</span> <span className="text-sm font-black italic">SIGUIENTE</span> </div> <ChevronRight size={20} /> </>
                    )}
                </button>
            </div>
          </div>
          <div id="comentarios" className={`w-full scroll-mt-24 ${isLight ? 'bg-white' : 'bg-zinc-950'}`}>
            <MangaComments key={chapterId} mangaId={navData?.mangaId || ''} chapterId={chapterId} initialComments={chapterComments} isLight={isLight} />
          </div>
        </main>

      </div>

    </div>
  );
};
