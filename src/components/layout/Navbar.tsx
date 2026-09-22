import { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { X, AlarmClock, Coins, Crown, LogOut, MessageCircle, User as UserIcon, Bookmark, Moon, Sun, Flame, ShoppingCart } from "lucide-react";
import { AlarmAlert, TimerModal } from "../modals";
import { BellGlyph, DetailCoin3DIcon, SearchGlyph } from "../common";
import { NotificationsPanel } from "../social";
import { useTheme } from "../../hooks/useTheme";
import { SEARCH_FILTERS, setSearchFilter, setSearchTerm, useSearchFilter, useSearchTerm } from "../../hooks/useSearchTerm";
import { isMobileSectionRoute } from "../../utils/mobileSections";
import { useShopCart } from "../../hooks/useShopCart";
import { getUltimosCapitulos } from "../../services/mangaService";
import { openSubscriptionModal } from "../../utils/subscriptionModal";
import authPopoverBackground from "../../assets/modals/auth-login.webp";
import { preloadImages } from "../../utils/preloadImages";
import { seedSharedAuthCovers } from "../../utils/authCoverCache";
import {
  AUTH_CHANGED_EVENT,
  AUTH_SESSION_EXPIRED_EVENT,
  getStoredUser,
  getStoredToken,
  clearAuth,
  refreshUser,
  type MMUser,
} from "../../services/authService";
import { getInteractions } from "../../services/interactionsService";
import { getConversations, getNotifications, OPEN_CHAT_EVENT, SOCIAL_REFRESH_EVENT, syncMangaSubscriptions, type FriendUser } from "../../services/socialService";
import { PROFILE_UPDATED_EVENT, type ProfileUpdatedDetail } from "../../services/wordpressService";

// El modal vive montado una sola vez en App: aquí solo se precarga y se abre.
const loadSubscriptionModal = () => import("../modals/SubscriptionModal");
// Las ventanas del buscador (Biblioteca entera) y de notificaciones van en sus chunks y se precargan al montar.
const loadSearchOverlay = () => import("./SearchOverlay");
const SearchOverlay = lazy(() => loadSearchOverlay().then(({ SearchOverlay: Overlay }) => ({ default: Overlay })));
const loadNotificationsOverlay = () => import("./NotificationsOverlay");
const NotificationsOverlay = lazy(() => loadNotificationsOverlay().then(({ NotificationsOverlay: Overlay }) => ({ default: Overlay })));
// La del carrito solo se monta (y se carga) en la Tienda móvil.
const CartOverlay = lazy(() => import("./CartOverlay").then(({ CartOverlay: Overlay }) => ({ default: Overlay })));

/** La página "Más" lo emite para abrir la alarma, que vive montada aquí. */
export const OPEN_TIMER_EVENT = 'mm_open_timer';


const NavbarFire = ({ size = 16 }: { size?: number }) => (
  <span
    aria-hidden="true"
    className="navbar-fire-stack"
    style={{ width: size, height: Math.round(size * 1.18) }}
  >
    <Flame className="navbar-fire-outer" size={size} strokeWidth={2.25} />
    <Flame className="navbar-fire-core" size={Math.round(size * 0.62)} strokeWidth={2.6} />
    <span className="navbar-fire-ember navbar-fire-ember-one" />
    <span className="navbar-fire-ember navbar-fire-ember-two" />
  </span>
);

const getCurrentStoredUser = () => (getStoredToken() ? getStoredUser() : null);

export const Navbar = () => {

  // --- LÓGICA DE COLOR (DARK/LIGHT MODE) ---
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isLightMode = theme === 'light';
  const isProfileRoute = location.pathname === '/perfil';

  const [currentUser, setCurrentUser] = useState<MMUser | null>(getCurrentStoredUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // --- BUSCADOR MÓVIL ---
  // En móvil, estar en /biblioteca convierte la cabecera en un buscador: la
  // lupa viaja a la izquierda, el logo desaparece y una X ocupa el sitio de la
  // campana. En escritorio (lg) la cabecera no cambia todavía.
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  const isSearchMode = isMobile && location.pathname === '/biblioteca';
  // En la Tienda (móvil) la cabecera es la del "Mukai Store": el nombre a la
  // izquierda en lugar de la campana, sin logo en el centro y el carrito a la derecha.
  const isStoreMode = isMobile && location.pathname === '/tienda';
  const headerUsesDarkText = isLightMode;
  const searchTerm = useSearchTerm();
  const searchFilter = useSearchFilter();
  // En la ficha de un manga y en "Más" (móvil) la imagen ocupa toda la parte superior: la cabecera no se pinta.
  // Character Chat (/chat, la ficha /chat/:id y la conversación) va sin cabecera en móvil: solo su flecha de volver.
  const hideHeaderOnMobile = /^\/manga\/[^/]+/.test(location.pathname) || /^\/chat(\/|$)/.test(location.pathname) || ['/mas', '/perfil/editar'].includes(location.pathname) || isMobileSectionRoute(location.pathname);
  // El chat de mensajes (botón "Mensajes" de la Comunidad) y las notificaciones van a pantalla
  // completa: sin cabecera en ningún tamaño. El componente sigue montado para conservar la alarma,
  // los avisos y el evento openChat.
  const isMessagesRoute = location.pathname.startsWith('/mensajes') || location.pathname.startsWith('/notificaciones');
  // Ventana del buscador (lupa): se desliza sobre la página sin cambiar de ruta.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const closeSearchOverlay = useCallback(() => { setIsSearchOpen(false); setSearchTerm(''); }, []);
  // Panel de notificaciones (campana móvil): también se desliza sobre la página.
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const closeNotificationsOverlay = useCallback(() => setIsNotificationsOpen(false), []);
  // Carrito (Tienda móvil, en el sitio de la lupa): ventana lateral hasta el centro de la página.
  const [isCartOpen, setIsCartOpen] = useState(false);
  const closeCartOverlay = useCallback(() => setIsCartOpen(false), []);
  const { count: cartCount } = useShopCart();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchGlyphRef = useRef<HTMLSpanElement>(null);
  // Posición de la lupa justo antes de cambiar de modo (técnica FLIP): al
  // renderizarse en su nuevo sitio se anima desde aquí.
  const searchGlyphFlipRect = useRef<DOMRect | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const glyph = searchGlyphRef.current;
    const from = searchGlyphFlipRect.current;
    searchGlyphFlipRect.current = null;
    if (!glyph || !from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const to = glyph.getBoundingClientRect();
    if (!to.width) return;
    glyph.animate(
      [
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`, transformOrigin: 'top left' },
        { transform: 'translate(0, 0) scale(1)', transformOrigin: 'top left' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.22, 0.9, 0.3, 1)' },
    );
  }, [isSearchMode]);

  // La lupa del navbar (y cualquier navigate a /biblioteca con focusSearch) deja el campo listo para escribir.
  useEffect(() => {
    if (!isSearchMode || location.state?.focusSearch !== true) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [isSearchMode, location.key, location.state]);

  useEffect(() => { void loadSearchOverlay(); void loadNotificationsOverlay(); }, []);

  const openSearch = () => {
    setShowUserMenu(false);
    setShowNotifications(false);
    if (isSearchMode) {
      searchInputRef.current?.focus();
      return;
    }
    setIsSearchOpen(true);
  };

  const openCart = () => {
    setShowUserMenu(false);
    setShowNotifications(false);
    setIsCartOpen(true);
  };

  const closeSearch = () => {
    searchGlyphFlipRect.current = searchGlyphRef.current?.getBoundingClientRect() ?? null;
    setSearchTerm('');
    // Vuelve a donde estaba el usuario; si entró directo a /biblioteca, al inicio.
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) navigate(-1);
    else navigate('/');
  };

  // --- LÓGICA DEL TEMPORIZADOR ---
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isAlarmAlertOpen, setIsAlarmAlertOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentUser || !showUserMenu) return;
    void loadSubscriptionModal();
  }, [currentUser, showUserMenu]);

  /** La cabecera se esconde al bajar y reaparece en cuanto se sube. */
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;
      // Umbral pequeño para que el rebote del scroll no la haga parpadear.
      if (Math.abs(delta) < 6) return;
      lastY = currentY;
      setIsHeaderHidden(currentY > 90 && delta > 0);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const refreshSocialCounts = useCallback(async () => {
    if (!getCurrentStoredUser()) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }
    const [messages, notifications] = await Promise.allSettled([
      getConversations(),
      getNotifications(),
    ]);
    if (messages.status === 'fulfilled') setUnreadMessages(messages.value.unread);
    if (notifications.status === 'fulfilled') setUnreadNotifications(notifications.value.unread);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    void refreshSocialCounts();
    void getInteractions().then((interactions) => interactions
      ? syncMangaSubscriptions({ mangaIds: interactions.bookmarks }).catch(() => undefined)
      : undefined);
    const interval = window.setInterval(() => void refreshSocialCounts(), 30000);
    const refresh = () => void refreshSocialCounts();
    window.addEventListener(SOCIAL_REFRESH_EVENT, refresh);
    return () => { window.clearInterval(interval); window.removeEventListener(SOCIAL_REFRESH_EVENT, refresh); };
  }, [currentUser, refreshSocialCounts]);

  // openChat(usuario) desde cualquier pantalla abre su conversación en la página de mensajes.
  useEffect(() => {
    const open = (event: Event) => {
      const target = (event as CustomEvent<FriendUser>).detail;
      if (!target?.id) return;
      setShowUserMenu(false);
      setShowNotifications(false);
      navigate(`/mensajes/${target.id}`);
    };
    // La alarma se abre también desde la página "Más".
    const openTimer = () => { setShowUserMenu(false); setShowNotifications(false); setIsTimerModalOpen(true); };
    window.addEventListener(OPEN_CHAT_EVENT, open);
    window.addEventListener(OPEN_TIMER_EVENT, openTimer);
    return () => {
      window.removeEventListener(OPEN_CHAT_EVENT, open);
      window.removeEventListener(OPEN_TIMER_EVENT, openTimer);
    };
  }, [navigate]);

  const startTimer = (minutes: number) => {
    const seconds = minutes * 60;
    setTimeLeft(seconds);
    setIsTimerActive(true);
    setIsAlarmAlertOpen(false);
  };

  const stopTimer = () => {
    setIsTimerActive(false);
    setTimeLeft(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (isTimerActive) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerActive(false); 
            setIsAlarmAlertOpen(true);
            return 0;
          }
          return prev !== null ? prev - 1 : 0;
        });
      }, 1000);
    }

    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [isTimerActive]); 
  // ------------------------------

  // Escuchar cambios de autenticación
  useEffect(() => {
    const update = () => setCurrentUser(getCurrentStoredUser());
    const updateProfile = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      setCurrentUser((current) => {
        if (!current || String(current.id) !== detail.userId) return current;
        return {
          ...current,
          ...(detail.username ? { username: detail.username, display_name: detail.username } : {}),
          ...(detail.avatarUrl ? { avatar: detail.avatarUrl } : {}),
        };
      });
    };
    const handleExpired = () => {
      setCurrentUser(null);
      setShowUserMenu(false);
      setSessionNotice(true);
    };

    window.addEventListener(AUTH_CHANGED_EVENT, update);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpired);
    window.addEventListener(PROFILE_UPDATED_EVENT, updateProfile);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, update);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpired);
      window.removeEventListener(PROFILE_UPDATED_EVENT, updateProfile);
    };
  }, []);

  useEffect(() => {
    if (currentUser || !showUserMenu) return;

    void getUltimosCapitulos().then((mangas) => {
      const covers = seedSharedAuthCovers(mangas);
      void preloadImages(covers.slice(0, 24).map((cover) => cover.src));
    });
    void import('../../pages/AuthPage');
  }, [currentUser, showUserMenu]);

  // Cambio directo: la View Transition capturaba toda la página (imágenes, blur,
  // carruseles) y con flushSync bloqueaba el hilo; en la portada se notaba mucho.
  const handleThemeToggle = () => toggleTheme();

  // Refrescar monedas desde el servidor al cargar y cada 60s
  useEffect(() => {
    const doRefresh = async () => {
      const user = await refreshUser();
      if (user) setCurrentUser({ ...user });
      else if (!getCurrentStoredUser()) setCurrentUser(null);
    };
    doRefresh();
    const interval = setInterval(doRefresh, 60000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar el menú de usuario si se hace click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setSessionNotice(false);
    setShowUserMenu(false);
    setShowNotifications(false);
    // Recarga completa al terminar: así no queda en memoria nada de la cuenta
    // (monedas, guardados, mensajes) que siguiera vivo en algún componente.
    void clearAuth().finally(() => window.location.reload());
  };

  const goToRecharge = () => {
    setShowUserMenu(false);
    navigate('/recargar', { state: { returnTo: `${location.pathname}${location.search}` } });
  };

  const openAuthPage = (view: 'login' | 'register') => {
    setSessionNotice(false);
    setShowUserMenu(false);
    navigate(`/auth/${view}`);
  };

  /* Móvil: campana que abre la página de notificaciones (en escritorio vive junto al avatar). */
  const renderMobileBell = (extraClass: string) => (
    <button
      type="button"
      onClick={() => { setShowUserMenu(false); setShowNotifications(false); if (currentUser) setIsNotificationsOpen(true); else navigate('/auth/login', { state: { returnTo: '/notificaciones' } }); }}
      aria-label="Notificaciones"
      title="Notificaciones"
      className={`relative rounded-full p-2 transition-colors lg:hidden ${extraClass} ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'}`}
    >
      <BellGlyph size={26} />
      {/* Punto rojo en la esquina: hay notificaciones sin leer. */}
      {unreadNotifications > 0 && <span aria-label={`${unreadNotifications} sin leer`} className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ${headerUsesDarkText ? 'ring-white' : 'ring-black'}`} />}
    </button>
  );

  const handleLogoClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    setIsTimerModalOpen(false);
    setShowUserMenu(false);
    setShowNotifications(false);
    setSessionNotice(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    // En el inicio móvil, un segundo toque al logo reinicia por completo la vista.
    if (location.pathname === '/' && window.matchMedia('(max-width: 1023px)').matches) {
      event.preventDefault();
      window.location.reload();
    }
  };

  return (
    <>
      {!isMessagesRoute && <header
        className={`${isProfileRoute ? 'sticky' : 'fixed'} site-navbar-surface left-0 top-0 z-[100] w-full py-2.5 transition-transform duration-300 lg:py-3 ${hideHeaderOnMobile ? 'hidden lg:block' : ''} ${isSearchMode ? 'pb-0' : ''}`}
        style={{ transform: isHeaderHidden && !isSearchMode ? 'translateY(-100%)' : 'translateY(0)' }}
      >
        {/* Tres columnas iguales: el logo queda centrado de verdad, con los enlaces a la izquierda y las herramientas a la derecha. */}
        <div className={`desktop-content-shell max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-6 xl:px-16 items-center ${isSearchMode ? 'flex justify-between' : 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'}`}>
          {isSearchMode ? (
            <div className="w-full">
              <div className="flex h-12 w-full items-center gap-2">
                {/* Píldora: la lupa (que llega volando desde la derecha) y el campo hasta justo antes de la X.
                    El fondo va en ::before para que su fundido no arrastre a la lupa. */}
                <div className={`navbar-search-pill relative flex h-12 min-w-0 flex-1 items-center gap-2 pl-3 pr-1.5 before:absolute before:inset-0 before:rounded before:border before:content-[''] ${headerUsesDarkText ? 'text-black before:border-black/[0.06] before:bg-[#f2f2f4]' : 'text-white before:border-white/10 before:bg-white/10'}`}>
                  <span ref={searchGlyphRef} className="relative flex shrink-0 items-center">
                    <SearchGlyph size={24} />
                  </span>
                  <input
                    ref={searchInputRef}
                    type="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    placeholder="Busca títulos, autores o palabras clave"
                    aria-label="Buscar manga"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className={`relative h-full min-w-0 flex-1 bg-transparent font-[Montserrat] text-[14px] font-semibold outline-none placeholder:text-[12.5px] placeholder:text-ellipsis [&::-webkit-search-cancel-button]:hidden ${headerUsesDarkText ? 'placeholder:text-zinc-400' : 'placeholder:text-zinc-500'}`}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                      aria-label="Borrar búsqueda"
                      className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${headerUsesDarkText ? 'text-zinc-500 hover:text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      <X size={12} strokeWidth={2.75} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Cerrar búsqueda"
                  title="Cerrar búsqueda"
                  className={`navbar-search-close -mr-2 rounded-full p-2 transition-colors ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'}`}
                >
                  <X size={26} strokeWidth={2.5} />
                </button>
              </div>

              {/* Pestañas de colección (Inter regular): "Todos" en negro puro; las no seleccionadas, negro tirando a gris. */}
              <div role="tablist" aria-label="Colección" className="navbar-search-filters mt-6 flex items-end gap-6">
                {SEARCH_FILTERS.map(({ id, label }) => {
                  const active = searchFilter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => { setSearchFilter(id); searchInputRef.current?.focus({ preventScroll: true }); }}
                      className={`relative pb-2.5 font-[Inter] text-[15px] leading-none transition-colors ${active ? `font-medium ${headerUsesDarkText ? 'text-black' : 'text-white'}` : `font-normal ${headerUsesDarkText ? 'text-[#4b4b50] hover:text-black' : 'text-zinc-400 hover:text-white'}`}`}
                    >
                      {label}
                      {/* Rayita bajo la pestaña activa, apoyada en la línea separadora de la cabecera. */}
                      {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-current" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
          <>
            {/* 1. IZQUIERDA: la campana en móvil (en la Tienda, el nombre "Mukai Store") y los enlaces en escritorio. El logo sigue centrado. */}
            <div className="flex items-center justify-self-start">
            {isStoreMode ? (
              <span className={`select-none whitespace-nowrap text-[22px] min-[390px]:text-2xl font-[1000] uppercase italic leading-none tracking-tighter sm:text-3xl ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                MUKAI <span className="text-[#db2777]">STORE</span>
              </span>
            ) : renderMobileBell('-ml-2')}
            <nav className="hidden h-10 items-center gap-3 whitespace-nowrap lg:-translate-y-0.5 lg:flex xl:gap-8">
              <Link to="/" className={`navbar-primary-link inline-flex h-full items-center text-[12px] leading-none hover:text-[#ff4a7d] uppercase tracking-[0.045em] transition-colors xl:text-[13px] ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                Inicio
              </Link>

              <Link to="/biblioteca" className={`navbar-primary-link inline-flex h-full items-center text-[12px] leading-none hover:text-[#ff4a7d] uppercase tracking-[0.045em] transition-colors xl:text-[13px] ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                Biblioteca
              </Link>

              <Link to="/manga-bn" className={`navbar-primary-link inline-flex h-full items-center text-[12px] leading-none hover:text-[#ff4a7d] uppercase tracking-[0.045em] transition-colors xl:text-[13px] ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                Mangas B&N
              </Link>
              <Link to="/manga-19" className={`navbar-primary-link navbar-adult-link inline-flex h-full items-center text-[12px] leading-none hover:text-[#ff4a7d] uppercase tracking-[0.045em] transition-colors xl:text-[13px] ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                <span className="navbar-adult-option inline-flex items-center gap-1.5">
                  <NavbarFire size={17} />
                  <span className="navbar-adult-label">Mangas <span className="navbar-adult-number">+19</span></span>
                </span>
              </Link>
            </nav>
            </div>

            {/* 2. CENTRO: logo (columna fija: en móvil el nav no existe y la rejilla lo colocaría en la primera). En la Tienda móvil no se pinta. */}
            {!isStoreMode && (
            <Link to="/" onClick={handleLogoClick} className="group col-start-2 flex h-10 items-center justify-self-center lg:-translate-y-0.5" aria-label="Volver al inicio de MangaMukai">
              <span className={`select-none whitespace-nowrap text-[22px] min-[390px]:text-2xl font-[1000] uppercase italic leading-none tracking-tighter transition-colors sm:text-3xl lg:text-2xl xl:text-3xl ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                  MANGA<span className="text-[#db2777]">MUKAI</span>
              </span>
            </Link>
            )}

            {/* 3. DERECHA */}
            <div className="col-start-3 flex items-center justify-self-end gap-0 sm:gap-1 lg:gap-4 lg:translate-y-0.5 xl:gap-6">

                <div className="contents">
                {/* Herramientas: la alarma móvil está en el menú principal. */}
                <div className={`relative hidden items-center gap-0 min-[360px]:flex lg:gap-2 ${headerUsesDarkText ? 'border-zinc-200' : 'border-white/10'} lg:border-r lg:mr-1 lg:pr-6`}>

                    {isStoreMode ? (
                    /* Tienda móvil: en el sitio de la lupa va el carrito, que abre su ventana lateral hasta el centro de la página. */
                    <button
                        type="button"
                        onClick={openCart}
                        aria-label={cartCount > 0 ? `Abrir carrito, ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}` : 'Abrir carrito'}
                        title="Carrito"
                        className={`${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'} relative -mr-2 rounded-full p-2 transition-colors`}
                    >
                        <ShoppingCart size={26} strokeWidth={2.25} />
                        {/* Globo rosa en la esquina con cuántos productos hay seleccionados. */}
                        {cartCount > 0 && <span aria-hidden="true" className={`absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4a7d] px-1 font-[Montserrat] text-[9px] font-bold leading-none text-white ring-2 ${headerUsesDarkText ? 'ring-white' : 'ring-black'}`}>{cartCount > 9 ? '9+' : cartCount}</span>}
                    </button>
                    ) : (
                    /* El buscador vive en la Biblioteca: la lupa abre su ventana (y en móvil, en /biblioteca, vuela a la píldora). */
                    <button
                        onClick={openSearch}
                        aria-label="Buscar mangas"
                        title="Buscar mangas"
                        className={`${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'} -mr-2 rounded-full p-2 transition-colors lg:mr-0`}
                    >
                        <span ref={searchGlyphRef} className="flex items-center"><SearchGlyph size={26} /></span>
                    </button>
                    )}

                    <div className="relative hidden lg:block">
                        <button
                            onClick={() => setIsTimerModalOpen(!isTimerModalOpen)}
                            aria-label="Abrir temporizador"
                            title="Abrir temporizador"
                            className={`transition-colors p-2 rounded-full relative group ${
                                isTimerActive 
                                    ? 'text-[#ff4a7d] bg-white/5' 
                                    : headerUsesDarkText
                                    ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]'
                                    : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'
                            }`}
                        >
                            <AlarmClock size={20} strokeWidth={2.5} className={isTimerActive ? 'animate-pulse' : ''} />

                            {isTimerActive && (
                                <span className="absolute top-1 right-2 w-2 h-2 bg-[#ff4a7d] rounded-full border border-[#02040a] animate-ping"></span>
                            )}
                        </button>

                    </div>

                    {/* En móvil el tema se cambia desde la página "Más". */}
                    <button
                      type="button"
                      onClick={handleThemeToggle}
                      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                      aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                      className={`hidden rounded-full p-2 transition-colors lg:block ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'}`}
                    >
                      {theme === 'light' ? <Moon size={20} strokeWidth={2.5} /> : <Sun size={20} strokeWidth={2.5} />}
                    </button>
                </div>

                {/* ── Monedas en navbar (solo si hay sesión) ── */}
                {currentUser && (
                  <div className="hidden lg:flex items-center">
                    <button
                      type="button"
                      onClick={() => goToRecharge()}
                      aria-label={`Abrir mercado de monedas. Saldo: ${currentUser.coins ?? 0}`}
                      title="Abrir mercado de monedas"
                      className={`group flex items-center gap-2 rounded-xl border px-2.5 py-1.5 shadow-sm transition-all duration-200 hover:-translate-y-px ${headerUsesDarkText ? 'border-[#D99A16]/35 bg-[#FFF5D8]/95 hover:border-[#D99A16]/55 hover:bg-[#ffefbf]' : 'border-[#FFC53D]/25 bg-[#FFC53D]/10 hover:border-[#FFC53D]/45 hover:bg-[#FFC53D]/15'}`}
                    >
                      <DetailCoin3DIcon size={27} className="h-[27px] w-[27px] object-contain drop-shadow-[0_5px_7px_rgba(180,83,9,0.28)] transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95" />
                      <span className={`font-[Montserrat] text-[15px] font-bold leading-none tracking-wide transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95 ${headerUsesDarkText ? 'text-[#D99A16]' : 'text-[#FFC53D]'}`}>{currentUser.coins ?? 0}</span>
                    </button>
                  </div>
                )}

                {/* Perfil y acceso solo en escritorio: en móvil todo esto vive en la página "Más". */}
                {currentUser ? (
                  <div className="relative hidden items-center gap-1 lg:flex" ref={userMenuRef}>
                    <div className="relative">
                      <button
                        onClick={() => { setShowUserMenu((value) => !value); setShowNotifications(false); }}
                        aria-label={`Abrir perfil de ${currentUser.username}`}
                        aria-expanded={showUserMenu}
                        title={currentUser.username}
                        className={`flex h-10 w-10 items-center justify-center rounded-full bg-transparent transition-colors lg:border ${headerUsesDarkText ? 'text-black hover:text-[#ff4a7d] lg:border-black/20 lg:hover:border-black/40' : 'text-white hover:text-[#ff4a7d] lg:border-white/25 lg:hover:border-white/45'}`}
                      >
                        {currentUser.avatar ? <img src={currentUser.avatar} alt={`Foto de perfil de ${currentUser.username}`} className="h-8 w-8 rounded-full object-cover" /> : <UserIcon size={20} strokeWidth={2.4} />}
                      </button>

                      {showUserMenu && (
                        // Fondo sólido (blanco/negro según el tema), sin imagen ni degradado.
                        <div className={`profile-user-popover fixed inset-x-4 top-20 z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto overflow-x-hidden overscroll-contain lg:overflow-hidden rounded-2xl lg:absolute lg:inset-x-auto lg:right-0 lg:top-auto lg:mt-2 lg:max-h-[calc(100dvh-4.5rem)] lg:w-[300px] border shadow-2xl ${isLightMode ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black text-white'}`}>
                          <div className="relative z-10">
                            <div className={`flex items-center gap-3 border-b p-4 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                              <Link to="/perfil" onClick={() => setShowUserMenu(false)} aria-label="Ver mi perfil" className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff4a7d]">
                              {currentUser.avatar ? <img src={currentUser.avatar} alt={`Foto de perfil de ${currentUser.username}`} className={`h-11 w-11 rounded-full border object-cover ${isLightMode ? 'border-black/20' : 'border-white/25'}`} /> : <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-transparent ${isLightMode ? 'border-black/20 text-black' : 'border-white/25 text-white'}`}><UserIcon size={20} /></span>}
                              </Link>
                              <div className="min-w-0"><p className="truncate font-[Montserrat] text-[15px] font-bold uppercase tracking-[0.035em]">{currentUser.username}</p><p className={`truncate font-[Montserrat] text-[11px] font-semibold ${isLightMode ? 'text-black/55' : 'text-white/55'}`}>{currentUser.email}</p></div>
                            </div>
                            <div className="flex flex-col gap-0.5 px-2 pb-2">
                              <button type="button" onClick={goToRecharge} className={`profile-user-menu-option flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors lg:hidden ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><Coins size={17} /> Recargar monedas</button>
                              <Link to="/perfil" onClick={() => setShowUserMenu(false)} className={`profile-user-menu-option hidden lg:flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><UserIcon size={17} /> Mi Perfil</Link>
                              <Link to="/saved" onClick={() => setShowUserMenu(false)} className={`profile-user-menu-option flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><Bookmark size={17} /> Guardados</Link>
                              <Link to="/mensajes" onClick={() => setShowUserMenu(false)} className={`profile-user-menu-option flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><MessageCircle size={17} /> Mensajes{unreadMessages > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4a7d] px-1 text-[9px] text-white">{unreadMessages}</span>}</Link>
                              <button type="button" onClick={() => { setShowUserMenu(false); openSubscriptionModal(); }} className={`profile-user-menu-option flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors lg:hidden ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><Crown size={17} /> Suscripción</button>
                              {/* Cerrar sesión va aquí (antes estaba en el menú de hamburguesa en móvil). */}
                              <button type="button" onClick={handleLogout} className="profile-user-menu-option flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#ff4a7d] transition-colors hover:bg-[#ff4a7d]/10"><LogOut size={17} /> Cerrar Sesión</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => { setShowNotifications((value) => !value); setShowUserMenu(false); }} aria-label="Abrir notificaciones" aria-expanded={showNotifications} className={`relative hidden lg:flex h-10 w-10 items-center justify-center rounded-full transition-colors ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'}`}>
                      <BellGlyph size={26} />
                      {unreadNotifications > 0 && <span aria-label={`${unreadNotifications} sin leer`} className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ${headerUsesDarkText ? 'ring-white' : 'ring-black'}`} />}
                    </button>
                  </div>
                ) : (
                  <div className="auth-google-sans relative hidden lg:block" ref={userMenuRef}>
                    <button type="button" aria-label="Abrir opciones de acceso" aria-expanded={showUserMenu} onClick={() => setShowUserMenu((visible) => !visible)} className={`flex h-10 w-10 items-center justify-center rounded-full bg-transparent transition-colors lg:border ${headerUsesDarkText ? 'text-zinc-800 hover:text-[#ff4a7d] lg:border-black/10 lg:hover:border-[#ff4a7d]' : 'text-white hover:text-[#ff4a7d] lg:border-white/15 lg:hover:border-[#ff4a7d]'}`}><UserIcon size={20} strokeWidth={2.4} /></button>
                    {showUserMenu && (
                      <div className={`auth-user-popover auth-user-popover-${isLightMode ? 'light' : 'dark'} fixed inset-x-4 top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto overflow-x-hidden overscroll-contain lg:overflow-hidden rounded-[24px] lg:absolute lg:inset-x-auto lg:right-0 lg:top-auto lg:mt-3 lg:max-h-[calc(100dvh-4.5rem)] lg:min-h-[290px] lg:w-[340px] border p-4 lg:p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)] ${headerUsesDarkText ? 'border-black/10 bg-white text-zinc-950' : 'border-white/10 bg-[#0a0a0d] text-white'}`}>
                        <img src={authPopoverBackground} alt="" aria-hidden="true" className="auth-user-popover-background absolute inset-0 h-full w-full object-cover" />
                        <div aria-hidden="true" className="auth-user-popover-scrim absolute inset-0" />
                        <div className="relative z-10">
                          <div className="mb-5 flex flex-col items-center px-3 pt-1 text-center">
                            <span aria-hidden="true" className="mb-3 block h-14 w-14 shrink-0 opacity-0" />
                            <p className={`text-[13px] font-normal leading-relaxed ${headerUsesDarkText ? 'text-zinc-700' : 'text-zinc-200'}`}>Listo para disfrutar de lo mejor en mangas</p>
                          </div>
                          <Link to="/auth/login" onClick={() => setShowUserMenu(false)} className="audiowide-library flex min-h-12 items-center justify-center rounded-[14px] bg-[#ff4a7d] px-4 text-[12px] font-normal tracking-normal text-white transition-colors hover:bg-[#ff347b]">Iniciar sesión</Link>
                          <Link to="/auth/register" onClick={() => setShowUserMenu(false)} className={`audiowide-library mt-2 flex min-h-12 items-center justify-center rounded-[14px] border px-4 text-[12px] font-normal tracking-normal transition-colors ${headerUsesDarkText ? 'border-black/15 bg-white/45 text-zinc-900 hover:border-[#ff4a7d] hover:text-[#ff4a7d]' : 'border-white/15 bg-black/20 text-zinc-100 hover:border-[#ff4a7d] hover:text-[#ff4a7d]'}`}>Crear cuenta</Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                </div>
            </div>
          </>
          )}
        </div>
      </header>}

      {sessionNotice && !currentUser && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto z-[130] flex max-w-sm items-center gap-3 rounded-xl border border-yellow-400/20 bg-[#0A0A0F] px-4 py-3 text-yellow-100 shadow-2xl">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-yellow-300">Sesion expirada</p>
            <p className="text-xs text-white/70">Ingresa otra vez para usar monedas, guardados y compras.</p>
          </div>
          <button
            onClick={() => openAuthPage('login')}
            className="shrink-0 rounded-lg bg-yellow-400 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black hover:bg-yellow-300"
          >
            Ingresar
          </button>
          <button
            onClick={() => setSessionNotice(false)}
            className="shrink-0 rounded-md p-1 text-white/40 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <NotificationsPanel isOpen={showNotifications} isLight={isLightMode} onClose={() => setShowNotifications(false)} onUnreadChange={setUnreadNotifications} />

      <Suspense fallback={null}>
        <SearchOverlay open={isSearchOpen} isLight={isLightMode} onClose={closeSearchOverlay} />
        <NotificationsOverlay open={isNotificationsOpen} isLight={isLightMode} onClose={closeNotificationsOverlay} />
        {/* Sigue montado mientras esté abierto al salir de la Tienda, para que el panel se cierre solo con la ruta. */}
        {(isStoreMode || isCartOpen) && <CartOverlay open={isCartOpen} isLight={isLightMode} onClose={closeCartOverlay} />}
      </Suspense>

      <TimerModal
        isOpen={isTimerModalOpen}
        onClose={() => setIsTimerModalOpen(false)}
        onStartTimer={startTimer}
        onStopTimer={stopTimer}
        activeTimer={timeLeft}
        isActive={isTimerActive}
      />
      <AlarmAlert isOpen={isAlarmAlertOpen} onClose={() => setIsAlarmAlertOpen(false)} />
    </>
  );
};
