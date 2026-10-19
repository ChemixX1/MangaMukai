import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OPEN_SEARCH_EVENT, setSearchTerm } from "../../hooks/useSearchTerm";
import { useShopCart } from "../../hooks/useShopCart";
import { useTheme } from "../../hooks/useTheme";
import { AUTH_CHANGED_EVENT, AUTH_SESSION_EXPIRED_EVENT, getStoredToken, getStoredUser, refreshUser, type MMUser, } from "../../services/authService";
import { getInteractions } from "../../services/interactionsService";
import { getNotifications, OPEN_CHAT_EVENT, SOCIAL_REFRESH_EVENT, syncMangaSubscriptions, type FriendUser } from "../../services/socialService";
import { PROFILE_UPDATED_EVENT, type ProfileUpdatedDetail } from "../../services/wordpressService";
import { isMobileSectionRoute } from "../../utils/mobileSections";
import { isPageScrollLocked, PAGE_SCROLL_LOCK_CHANGED_EVENT } from "../../utils/scrollLock";
import { NavbarBellIcon } from "../ui";

// Las ventanas del buscador (Biblioteca entera) y de notificaciones van en sus chunks y se precargan al montar.
const loadSearchOverlay = () => import("./SearchOverlay");
const loadNotificationsOverlay = () => import("./NotificationsOverlay");
// La del carrito solo se monta (y se carga) en la Tienda móvil.

/** La página "Más" lo emite para abrir la alarma, que vive montada aquí. */
export const OPEN_TIMER_EVENT = 'mm_open_timer';


const getCurrentStoredUser = () => (getStoredToken() ? getStoredUser() : null);

export const useNavbarState = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isLightMode = theme === 'light';
  const isProfileRoute = location.pathname === '/profile';

  const [currentUser, setCurrentUser] = useState<MMUser | null>(getCurrentStoredUser);
  const [sessionNotice, setSessionNotice] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  // En la Tienda (móvil) la cabecera es la del "Mukai Store": el nombre a la
  // izquierda en lugar de la campana, sin logo en el centro y el carrito a la derecha.
  const isStoreMode = isMobile && location.pathname === '/tienda';
  const headerUsesDarkText = isLightMode;
  // En la ficha de un manga y en "Más" (móvil) la imagen ocupa toda la parte superior: la cabecera no se pinta.
  // Character Chat (/chat, la ficha /chat/:id y la conversación) va sin cabecera en móvil: solo su flecha de volver.
  const hideHeaderOnMobile = location.pathname.startsWith('/comunidad/publicacion/') || /^\/usuarios\/[^/]+\/publicacion\/[^/]+$/.test(location.pathname) || /^\/manga\/[^/]+/.test(location.pathname) || /^\/chat(\/|$)/.test(location.pathname) || location.pathname === '/profile' || location.pathname === '/perfil/editar' || isMobileSectionRoute(location.pathname);
  // El chat de mensajes (botón "Mensajes" de la Comunidad) y las notificaciones van a pantalla
  // completa: sin cabecera en ningún tamaño. El componente sigue montado para conservar la alarma,
  // los avisos y el evento openChat.
  const isMessagesRoute = location.pathname.startsWith('/mensajes') || location.pathname.startsWith('/notificaciones');
  // Ventana del buscador (lupa): se desliza sobre la página sin cambiar de ruta.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const closeSearchOverlay = useCallback(() => { setIsSearchOpen(false); setSearchTerm(''); }, []);
  // Panel compartido por las campanas de móvil y escritorio.
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const closeNotificationsOverlay = useCallback(() => setIsNotificationsOpen(false), []);
  // Carrito (Tienda móvil, en el sitio de la lupa): ventana lateral hasta el centro de la página.
  const [isCartOpen, setIsCartOpen] = useState(false);
  const closeCartOverlay = useCallback(() => setIsCartOpen(false), []);
  const { count: cartCount } = useShopCart();
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const showSearch = () => {
      setIsNotificationsOpen(false);
      setIsSearchOpen(true);
    };
    window.addEventListener(OPEN_SEARCH_EVENT, showSearch);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, showSearch);
  }, []);

  useEffect(() => { void loadSearchOverlay(); void loadNotificationsOverlay(); }, []);

  const openSearch = () => {
    setIsNotificationsOpen(false);
    setIsSearchOpen(true);
  };

  const openCart = () => {
    setIsNotificationsOpen(false);
    setIsCartOpen(true);
  };

  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isAlarmAlertOpen, setIsAlarmAlertOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  /** La cabecera se esconde al bajar y reaparece en cuanto se sube. */
  useEffect(() => {
    let lastY = window.scrollY;
    let travel = 0;
    const isMangaDetail = /^\/manga\/[^/]+/.test(location.pathname);
    const syncScrollPosition = () => {
      lastY = Math.max(0, window.scrollY);
      travel = 0;
      if (lastY <= 90) setIsHeaderHidden(false);
    };
    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      if (isPageScrollLocked()) return;
      if (currentY <= 90) {
        syncScrollPosition();
        return;
      }
      const delta = currentY - lastY;
      if (isMangaDetail) {
        lastY = currentY;
        if (currentY <= 90) {
          travel = 0;
          setIsHeaderHidden(false);
          return;
        }
        if (delta === 0) return;
        travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
        if (travel >= 24 || travel <= -16) {
          setIsHeaderHidden(travel > 0);
          travel = 0;
        }
        return;
      }
      // Umbral pequeño para que el rebote del scroll no la haga parpadear.
      if (Math.abs(delta) < 6) return;
      lastY = currentY;
      setIsHeaderHidden(currentY > 90 && delta > 0);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener(PAGE_SCROLL_LOCK_CHANGED_EVENT, syncScrollPosition);
    syncScrollPosition();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener(PAGE_SCROLL_LOCK_CHANGED_EVENT, syncScrollPosition);
    };
  }, [location.pathname]);

  const refreshSocialCounts = useCallback(async () => {
    if (!getCurrentStoredUser()) {
      setUnreadNotifications(0);
      return;
    }
    const [notifications] = await Promise.allSettled([
      getNotifications(),
    ]);
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
      setIsNotificationsOpen(false);
      navigate(`/mensajes/${target.id}`);
    };
    // La alarma se abre también desde la página "Más".
    const openTimer = () => { setIsNotificationsOpen(false); setIsTimerModalOpen(true); };
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

  // Adelanta solo el código de acceso. Las portadas se reutilizan desde el home,
  // sin competir con sus imágenes ni pedir otro catálogo al acercarse al enlace.
  const authPrefetched = useRef(false);
  const prefetchAuth = useCallback(() => {
    if (authPrefetched.current) return;
    authPrefetched.current = true;
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

  const goToRecharge = () => {
    navigate('/recargar', { state: { returnTo: `${location.pathname}${location.search}` } });
  };

  const openAuthPage = (view: 'login' | 'register') => {
    setSessionNotice(false);
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    navigate(`/auth/${view}?${new URLSearchParams({ returnTo })}`, { state: { returnTo } });
  };

  const openNotifications = () => {
    if (currentUser) setIsNotificationsOpen(true);
    else navigate('/auth/login', { state: { returnTo: '/notificaciones' } });
  };

  /* Móvil: usa el mismo panel que la campana junto al avatar de escritorio. */
  const renderMobileBell = () => (
    <button
      type="button"
      onClick={openNotifications}
      aria-label="Notificaciones"
      title="Notificaciones"
      className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 motion-reduce:transition-none lg:hidden ${headerUsesDarkText ? 'text-black' : 'text-white'}`}
    >
      <NavbarBellIcon size={25.2} />
      {/* Punto rojo en la esquina: hay notificaciones sin leer. */}
      {unreadNotifications > 0 && <span aria-label={`${unreadNotifications} sin leer`} className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ${headerUsesDarkText ? 'ring-white' : 'ring-black'}`} />}
    </button>
  );

  const handleLogoClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    setIsTimerModalOpen(false);
    setIsNotificationsOpen(false);
    setSessionNotice(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    // En el inicio móvil, un segundo toque al logo reinicia por completo la vista.
    if (location.pathname === '/' && window.matchMedia('(max-width: 1023px)').matches) {
      event.preventDefault();
      window.location.reload();
    }
  };


  const desktopIconClass = "relative flex h-[23.52px] w-[23.52px] shrink-0 items-center justify-center text-ink transition-transform duration-200 hover:scale-110 motion-reduce:transition-none after:absolute after:-inset-2 after:content-['']";

  return { location, theme, isLightMode, isProfileRoute, currentUser, sessionNotice, setSessionNotice, unreadNotifications, isHeaderHidden, isMobile, isStoreMode, headerUsesDarkText, hideHeaderOnMobile, isMessagesRoute, isSearchOpen, closeSearchOverlay, isNotificationsOpen, openNotifications, closeNotificationsOverlay, isCartOpen, closeCartOverlay, cartCount, openSearch, openCart, isTimerModalOpen, setIsTimerModalOpen, isAlarmAlertOpen, setIsAlarmAlertOpen, timeLeft, isTimerActive, startTimer, stopTimer, prefetchAuth, handleThemeToggle, goToRecharge, openAuthPage, renderMobileBell, handleLogoClick, desktopIconClass };
};

export type NavbarViewProps = { model: ReturnType<typeof useNavbarState> };
