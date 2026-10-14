import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setSearchTerm, useSearchFilter, useSearchTerm } from "../../hooks/useSearchTerm";
import { useShopCart } from "../../hooks/useShopCart";
import { useTheme } from "../../hooks/useTheme";
import { AUTH_CHANGED_EVENT, AUTH_SESSION_EXPIRED_EVENT, clearAuth, getStoredToken, getStoredUser, refreshUser, type MMUser, } from "../../services/authService";
import { getInteractions } from "../../services/interactionsService";
import { getUltimosCapitulos } from "../../services/mangaService";
import { getConversations, getNotifications, OPEN_CHAT_EVENT, SOCIAL_REFRESH_EVENT, syncMangaSubscriptions, type FriendUser } from "../../services/socialService";
import { PROFILE_UPDATED_EVENT, type ProfileUpdatedDetail } from "../../services/wordpressService";
import { seedSharedAuthCovers } from "../../utils/authCoverCache";
import { isMobileSectionRoute } from "../../utils/mobileSections";
import { preloadImages } from "../../utils/preloadImages";
import { NavbarBellIcon } from "../ui";

// El modal vive montado una sola vez en App: aquí solo se precarga y se abre.
const loadSubscriptionModal = () => import("../modals/SubscriptionModal");
// Las ventanas del buscador (Biblioteca entera) y de notificaciones van en sus chunks y se precargan al montar.
const loadSearchOverlay = () => import("./SearchOverlay");
const loadNotificationsOverlay = () => import("./NotificationsOverlay");
// La del carrito solo se monta (y se carga) en la Tienda móvil.

/** La página "Más" lo emite para abrir la alarma, que vive montada aquí. */
export const OPEN_TIMER_EVENT = 'mm_open_timer';

/** Enlaces de la cabecera de escritorio (diseño de PC). */
const getCurrentStoredUser = () => (getStoredToken() ? getStoredUser() : null);

export const useNavbarState = () => {

  // --- LÓGICA DE COLOR (DARK/LIGHT MODE) ---
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isLightMode = theme === 'light';
  const isProfileRoute = location.pathname === '/mas';

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
  const hideHeaderOnMobile = location.pathname.startsWith('/comunidad/publicacion/') || /^\/usuarios\/[^/]+\/publicacion\/[^/]+$/.test(location.pathname) || /^\/manga\/[^/]+/.test(location.pathname) || /^\/chat(\/|$)/.test(location.pathname) || location.pathname === '/mas' || location.pathname === '/perfil/editar' || isMobileSectionRoute(location.pathname);
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

  // Al acercarse a "Iniciar Sesión" / "Crear cuenta" se adelantan la página de
  // acceso y las portadas de su fondo, para que se abra sin esperas.
  const authPrefetched = useRef(false);
  const prefetchAuth = useCallback(() => {
    if (authPrefetched.current) return;
    authPrefetched.current = true;
    void getUltimosCapitulos().then((mangas) => {
      const covers = seedSharedAuthCovers(mangas);
      void preloadImages(covers.slice(0, 24).map((cover) => cover.src));
    });
    void import('../../pages/AuthPage');
  }, []);

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
  const renderMobileBell = () => (
    <button
      type="button"
      onClick={() => { setShowUserMenu(false); setShowNotifications(false); if (currentUser) setIsNotificationsOpen(true); else navigate('/auth/login', { state: { returnTo: '/notificaciones' } }); }}
      aria-label="Notificaciones"
      title="Notificaciones"
      className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors lg:hidden ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'}`}
    >
      <NavbarBellIcon size={25.2} />
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

  /* Escritorio (lg+): cabecera del diseño de PC. El logo a la izquierda, los accesos a
     las colecciones, Character, Comunidad y la Tienda, y a la derecha la lupa, la alarma,
     el tema y el acceso (con sesión: las monedas, el avatar con su menú y la campana).
     Es igual en todas las rutas. Los tres iconos comparten caja fija y centro (con un área
     de clic algo mayor, invisible) y el acceso ocupa siempre el mismo hueco (209 px), así
     nada se mueve al cambiar de tema, activar la alarma o iniciar sesión. */
  const desktopIconClass = "relative flex h-[23.52px] w-[23.52px] shrink-0 items-center justify-center text-ink transition-colors after:absolute after:-inset-2 after:content-[''] hover:text-[#ff4a7d]";

  return { location, theme, isLightMode, isProfileRoute, currentUser, showUserMenu, setShowUserMenu, sessionNotice, setSessionNotice, showNotifications, setShowNotifications, unreadMessages, unreadNotifications, setUnreadNotifications, isHeaderHidden, userMenuRef, isMobile, isSearchMode, isStoreMode, headerUsesDarkText, searchTerm, searchFilter, hideHeaderOnMobile, isMessagesRoute, isSearchOpen, closeSearchOverlay, isNotificationsOpen, closeNotificationsOverlay, isCartOpen, closeCartOverlay, cartCount, searchInputRef, searchGlyphRef, openSearch, openCart, closeSearch, isTimerModalOpen, setIsTimerModalOpen, isAlarmAlertOpen, setIsAlarmAlertOpen, timeLeft, isTimerActive, startTimer, stopTimer, prefetchAuth, handleThemeToggle, handleLogout, goToRecharge, openAuthPage, renderMobileBell, handleLogoClick, desktopIconClass };
};

export type NavbarViewProps = { model: ReturnType<typeof useNavbarState> };
