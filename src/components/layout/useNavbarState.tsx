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
import { blockBackgroundTasks, scheduleBackgroundTask } from '../../utils/backgroundTasks';

const loadSearchOverlay = () => import("./SearchOverlay");
const loadNotificationsOverlay = () => import("./NotificationsOverlay");

export const OPEN_TIMER_EVENT = 'mm_open_timer';

const getCurrentStoredUser = () => (getStoredToken() ? getStoredUser() : null);

export const useNavbarState = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isLightMode = theme === 'light';
  const isProfileRoute = location.pathname === '/profile';

  const [currentUser, setCurrentUser] = useState<MMUser | null>(getCurrentStoredUser);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1023px)').matches);

  const isStoreMode = isMobile && location.pathname === '/tienda';
  const headerUsesDarkText = isLightMode;

  const hideHeaderOnMobile = location.pathname.startsWith('/comunidad/publicacion/') || /^\/usuarios\/[^/]+\/publicacion\/[^/]+$/.test(location.pathname) || /^\/manga\/[^/]+/.test(location.pathname) || /^\/chat(\/|$)/.test(location.pathname) || location.pathname === '/profile' || location.pathname === '/perfil/editar' || isMobileSectionRoute(location.pathname);

  const isMessagesRoute = location.pathname.startsWith('/mensajes') || location.pathname.startsWith('/notificaciones');

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const closeSearchOverlay = useCallback(() => { setIsSearchOpen(false); setSearchTerm(''); }, []);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const closeNotificationsOverlay = useCallback(() => setIsNotificationsOpen(false), []);

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

  useEffect(() => {
    if (/^\/(read|manga)\//.test(location.pathname)) return;
    return scheduleBackgroundTask('panel:search', loadSearchOverlay);
  }, [location.pathname]);

  useEffect(() => {
    if (!currentUser || /^\/(read|manga)\//.test(location.pathname)) return;
    return scheduleBackgroundTask('panel:notifications', loadNotificationsOverlay);
  }, [currentUser, location.pathname]);

  useEffect(() => {
    if (isSearchOpen || isNotificationsOpen || isCartOpen) return blockBackgroundTasks();
  }, [isSearchOpen, isNotificationsOpen, isCartOpen]);

  const prefetchSearch = () => scheduleBackgroundTask('panel:search', loadSearchOverlay, { priority: 'intent' });
  const prefetchNotifications = () => {
    if (currentUser) scheduleBackgroundTask('panel:notifications', loadNotificationsOverlay, { priority: 'intent' });
  };

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

  useEffect(() => {
    const open = (event: Event) => {
      const target = (event as CustomEvent<FriendUser>).detail;
      if (!target?.id) return;
      setIsNotificationsOpen(false);
      navigate(`/mensajes/${target.id}`);
    };

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
            setIsTimerModalOpen(false);
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

  const handleThemeToggle = () => toggleTheme();

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
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    navigate(`/auth/${view}?${new URLSearchParams({ returnTo })}`, { state: { returnTo } });
  };

  const openNotifications = () => {
    if (currentUser) setIsNotificationsOpen(true);
    else navigate('/auth/login', { state: { returnTo: '/notificaciones' } });
  };

  const renderMobileBell = () => (
    <button
      type="button"
      onClick={openNotifications}
      onPointerEnter={prefetchNotifications}
      onFocus={prefetchNotifications}
      aria-label="Notificaciones"
      title="Notificaciones"
      className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 motion-reduce:transition-none lg:hidden ${headerUsesDarkText ? 'text-black' : 'text-white'}`}
    >
      <NavbarBellIcon size={25.2} />

      {unreadNotifications > 0 && <span aria-label={`${unreadNotifications} sin leer`} className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ${headerUsesDarkText ? 'ring-white' : 'ring-black'}`} />}
    </button>
  );

  const handleLogoClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    setIsTimerModalOpen(false);
    setIsNotificationsOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    if (location.pathname === '/' && window.matchMedia('(max-width: 1023px)').matches) {
      event.preventDefault();
      window.location.reload();
    }
  };

  const desktopIconClass = "relative flex h-[23.52px] w-[23.52px] shrink-0 items-center justify-center text-ink transition-transform duration-200 hover:scale-110 motion-reduce:transition-none after:absolute after:-inset-2 after:content-['']";

  return { location, theme, isLightMode, isProfileRoute, currentUser, unreadNotifications, isHeaderHidden, isMobile, isStoreMode, headerUsesDarkText, hideHeaderOnMobile, isMessagesRoute, isSearchOpen, closeSearchOverlay, isNotificationsOpen, openNotifications, prefetchNotifications, closeNotificationsOverlay, isCartOpen, closeCartOverlay, cartCount, openSearch, prefetchSearch, openCart, isTimerModalOpen, setIsTimerModalOpen, isAlarmAlertOpen, setIsAlarmAlertOpen, timeLeft, isTimerActive, startTimer, stopTimer, handleThemeToggle, goToRecharge, openAuthPage, renderMobileBell, handleLogoClick, desktopIconClass };
};

export type NavbarViewProps = { model: ReturnType<typeof useNavbarState> };
