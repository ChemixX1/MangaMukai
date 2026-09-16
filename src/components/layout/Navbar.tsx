import { useState, useEffect, useRef, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, X, AlarmClock, Bell, Coins, Crown, LogOut, MessageCircle, User as UserIcon, Bookmark, Moon, Sun, Flame } from "lucide-react";
import { AlarmAlert, TimerModal } from "../modals";
import { DetailCoin3DIcon } from "../common";
import { NotificationsPanel } from "../social";
import { useTheme } from "../../hooks/useTheme";
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

  const headerUsesDarkText = isLightMode;
  const [currentUser, setCurrentUser] = useState<MMUser | null>(getCurrentStoredUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      <header
        className={`${isProfileRoute ? 'sticky' : 'fixed'} site-navbar-surface left-0 top-0 z-[100] w-full py-3 transition-transform duration-300 sm:py-3`}
        style={{ transform: isHeaderHidden ? 'translateY(-100%)' : 'translateY(0)' }}
      >
        <div className="desktop-content-shell max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-16 flex justify-between items-center">
            
            {/* 1. IZQUIERDA */}
            <div className="flex items-center gap-4 lg:gap-10"> 
              <Link to="/" onClick={handleLogoClick} className="group flex h-10 items-center lg:-translate-y-0.5" aria-label="Volver al inicio de MangaMukai">
                <span className={`select-none text-[22px] min-[390px]:text-2xl font-[1000] uppercase italic leading-none tracking-tighter transition-colors sm:text-3xl ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                    MANGA<span className="text-[#FF4D88]">MUKAI</span>
                </span>
              </Link>

              <nav className="hidden h-10 items-center gap-8 lg:-translate-y-0.5 lg:flex">
                <Link to="/" className={`navbar-primary-link inline-flex h-full items-center text-[13px] leading-none hover:text-[#FF4D88] uppercase tracking-[0.045em] transition-colors ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                  Inicio
                </Link>

                <Link to="/biblioteca" className={`navbar-primary-link inline-flex h-full items-center text-[13px] leading-none hover:text-[#FF4D88] uppercase tracking-[0.045em] transition-colors ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                  Biblioteca
                </Link>

                <Link to="/manga-bn" className={`navbar-primary-link inline-flex h-full items-center text-[13px] leading-none hover:text-[#FF4D88] uppercase tracking-[0.045em] transition-colors ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                  Mangas B&N
                </Link>
                <Link to="/manga-19" className={`navbar-primary-link navbar-adult-link inline-flex h-full items-center text-[13px] leading-none hover:text-[#FF4D88] uppercase tracking-[0.045em] transition-colors ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                  <span className="navbar-adult-option inline-flex items-center gap-1.5">
                    <NavbarFire size={17} />
                    <span className="navbar-adult-label">Mangas <span className="navbar-adult-number">+19</span></span>
                  </span>
                </Link>
              </nav>
            </div>

            {/* 2. DERECHA */}
            <div className="flex items-center gap-0 sm:gap-1 lg:gap-6 lg:translate-y-0.5">
                
                <div className="contents">
                {/* Herramientas: la alarma móvil está en el menú principal. */}
                <div className={`relative hidden items-center gap-0 min-[360px]:flex lg:gap-2 ${headerUsesDarkText ? 'border-zinc-200' : 'border-white/10'} lg:border-r lg:mr-1 lg:pr-6`}>
                    {/* El buscador vive en la Biblioteca: la lupa lleva allí y enfoca el campo. */}
                    <button 
                        onClick={() => { setShowUserMenu(false); setShowNotifications(false); navigate('/biblioteca', { state: { focusSearch: true } }); }}
                        aria-label="Buscar mangas"
                        title="Buscar mangas"
                        className={`${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#FF4D88]' : 'text-white hover:bg-white/10 hover:text-[#FF4D88]'} mr-1 rounded-full p-2 transition-colors lg:mr-0`}
                    >
                        <Search size={20} strokeWidth={2.5} />
                    </button>

                    {/* Móvil: campana a la derecha de la lupa; abre la página de notificaciones. */}
                    <button
                      type="button"
                      onClick={() => { setShowUserMenu(false); setShowNotifications(false); navigate(currentUser ? '/notificaciones' : '/auth/login', currentUser ? undefined : { state: { returnTo: '/notificaciones' } }); }}
                      aria-label="Notificaciones"
                      title="Notificaciones"
                      className={`relative mr-1 rounded-full p-2 transition-colors lg:hidden ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#FF4D88]' : 'text-white hover:bg-white/10 hover:text-[#FF4D88]'}`}
                    >
                      <Bell size={20} strokeWidth={2.5} />
                      {unreadNotifications > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF4D88] px-1 text-[8px] font-black leading-none text-white">{Math.min(99, unreadNotifications)}</span>}
                    </button>
                    
                    <div className="relative hidden lg:block">
                        <button 
                            onClick={() => setIsTimerModalOpen(!isTimerModalOpen)}
                            aria-label="Abrir temporizador"
                            title="Abrir temporizador"
                            className={`transition-colors p-2 rounded-full relative group ${
                                isTimerActive 
                                    ? 'text-[#FF4D88] bg-white/5' 
                                    : headerUsesDarkText
                                    ? 'text-black hover:bg-black/5 hover:text-[#FF4D88]'
                                    : 'text-white hover:bg-white/10 hover:text-[#FF4D88]'
                            }`}
                        >
                            <AlarmClock size={20} strokeWidth={2.5} className={isTimerActive ? 'animate-pulse' : ''} />
                            
                            {isTimerActive && (
                                <span className="absolute top-1 right-2 w-2 h-2 bg-[#FF4D88] rounded-full border border-[#02040a] animate-ping"></span>
                            )}
                        </button>
                        
                    </div>

                    {/* En móvil el tema se cambia desde la página "Más". */}
                    <button
                      type="button"
                      onClick={handleThemeToggle}
                      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                      aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                      className={`hidden rounded-full p-2 transition-colors lg:block ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#FF4D88]' : 'text-white hover:bg-white/10 hover:text-[#FF4D88]'}`}
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
                        className={`flex h-10 w-10 items-center justify-center rounded-full bg-transparent transition-colors lg:border ${headerUsesDarkText ? 'text-black hover:text-[#FF4D88] lg:border-black/20 lg:hover:border-black/40' : 'text-white hover:text-[#FF4D88] lg:border-white/25 lg:hover:border-white/45'}`}
                      >
                        {currentUser.avatar ? <img src={currentUser.avatar} alt={`Foto de perfil de ${currentUser.username}`} className="h-8 w-8 rounded-full object-cover" /> : <UserIcon size={20} strokeWidth={2.4} />}
                      </button>

                      {showUserMenu && (
                        // Fondo sólido (blanco/negro según el tema), sin imagen ni degradado.
                        <div className={`profile-user-popover fixed inset-x-4 top-20 z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto overflow-x-hidden overscroll-contain lg:overflow-hidden rounded-2xl lg:absolute lg:inset-x-auto lg:right-0 lg:top-auto lg:mt-2 lg:max-h-[calc(100dvh-4.5rem)] lg:w-[300px] border shadow-2xl ${isLightMode ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black text-white'}`}>
                          <div className="relative z-10">
                            <div className={`flex items-center gap-3 border-b p-4 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                              <Link to="/perfil" onClick={() => setShowUserMenu(false)} aria-label="Ver mi perfil" className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF4D88]">
                              {currentUser.avatar ? <img src={currentUser.avatar} alt={`Foto de perfil de ${currentUser.username}`} className={`h-11 w-11 rounded-full border object-cover ${isLightMode ? 'border-black/20' : 'border-white/25'}`} /> : <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-transparent ${isLightMode ? 'border-black/20 text-black' : 'border-white/25 text-white'}`}><UserIcon size={20} /></span>}
                              </Link>
                              <div className="min-w-0"><p className="truncate font-[Montserrat] text-[15px] font-bold uppercase tracking-[0.035em]">{currentUser.username}</p><p className={`truncate font-[Montserrat] text-[11px] font-semibold ${isLightMode ? 'text-black/55' : 'text-white/55'}`}>{currentUser.email}</p></div>
                            </div>
                            <div className="flex flex-col gap-0.5 px-2 pb-2">
                              <button type="button" onClick={goToRecharge} className={`profile-user-menu-option flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors lg:hidden ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><Coins size={17} /> Recargar monedas</button>
                              <Link to="/perfil" onClick={() => setShowUserMenu(false)} className={`profile-user-menu-option hidden lg:flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><UserIcon size={17} /> Mi Perfil</Link>
                              <Link to="/saved" onClick={() => setShowUserMenu(false)} className={`profile-user-menu-option flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><Bookmark size={17} /> Guardados</Link>
                              <Link to="/mensajes" onClick={() => setShowUserMenu(false)} className={`profile-user-menu-option flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><MessageCircle size={17} /> Mensajes{unreadMessages > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF4D88] px-1 text-[9px] text-white">{unreadMessages}</span>}</Link>
                              <button type="button" onClick={() => { setShowUserMenu(false); openSubscriptionModal(); }} className={`profile-user-menu-option flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors lg:hidden ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}><Crown size={17} /> Suscripción</button>
                              {/* Cerrar sesión va aquí (antes estaba en el menú de hamburguesa en móvil). */}
                              <button type="button" onClick={handleLogout} className="profile-user-menu-option flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#FF4D88] transition-colors hover:bg-[#FF4D88]/10"><LogOut size={17} /> Cerrar Sesión</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => { setShowNotifications((value) => !value); setShowUserMenu(false); }} aria-label="Abrir notificaciones" aria-expanded={showNotifications} className={`relative hidden lg:flex h-10 w-10 items-center justify-center rounded-full transition-colors ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#FF4D88]' : 'text-white hover:bg-white/10 hover:text-[#FF4D88]'}`}>
                      <Bell size={20} strokeWidth={2.4} />
                      {unreadNotifications > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF4D88] px-1 text-[8px] font-black leading-none text-white">{Math.min(99, unreadNotifications)}</span>}
                    </button>
                  </div>
                ) : (
                  <div className="auth-google-sans relative hidden lg:block" ref={userMenuRef}>
                    <button type="button" aria-label="Abrir opciones de acceso" aria-expanded={showUserMenu} onClick={() => setShowUserMenu((visible) => !visible)} className={`flex h-10 w-10 items-center justify-center rounded-full bg-transparent transition-colors lg:border ${headerUsesDarkText ? 'text-zinc-800 hover:text-[#FF4D88] lg:border-black/10 lg:hover:border-[#FF4D88]' : 'text-white hover:text-[#FF4D88] lg:border-white/15 lg:hover:border-[#FF4D88]'}`}><UserIcon size={20} strokeWidth={2.4} /></button>
                    {showUserMenu && (
                      <div className={`auth-user-popover auth-user-popover-${isLightMode ? 'light' : 'dark'} fixed inset-x-4 top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto overflow-x-hidden overscroll-contain lg:overflow-hidden rounded-[24px] lg:absolute lg:inset-x-auto lg:right-0 lg:top-auto lg:mt-3 lg:max-h-[calc(100dvh-4.5rem)] lg:min-h-[290px] lg:w-[340px] border p-4 lg:p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)] ${headerUsesDarkText ? 'border-black/10 bg-white text-zinc-950' : 'border-white/10 bg-[#0a0a0d] text-white'}`}>
                        <img src={authPopoverBackground} alt="" aria-hidden="true" className="auth-user-popover-background absolute inset-0 h-full w-full object-cover" />
                        <div aria-hidden="true" className="auth-user-popover-scrim absolute inset-0" />
                        <div className="relative z-10">
                          <div className="mb-5 flex flex-col items-center px-3 pt-1 text-center">
                            <span aria-hidden="true" className="mb-3 block h-14 w-14 shrink-0 opacity-0" />
                            <p className={`text-[13px] font-normal leading-relaxed ${headerUsesDarkText ? 'text-zinc-700' : 'text-zinc-200'}`}>Listo para disfrutar de lo mejor en mangas</p>
                          </div>
                          <Link to="/auth/login" onClick={() => setShowUserMenu(false)} className="audiowide-library flex min-h-12 items-center justify-center rounded-[14px] bg-[#FF4D88] px-4 text-[12px] font-normal tracking-normal text-white transition-colors hover:bg-[#ff347b]">Iniciar sesión</Link>
                          <Link to="/auth/register" onClick={() => setShowUserMenu(false)} className={`audiowide-library mt-2 flex min-h-12 items-center justify-center rounded-[14px] border px-4 text-[12px] font-normal tracking-normal transition-colors ${headerUsesDarkText ? 'border-black/15 bg-white/45 text-zinc-900 hover:border-[#FF4D88] hover:text-[#FF4D88]' : 'border-white/15 bg-black/20 text-zinc-100 hover:border-[#FF4D88] hover:text-[#FF4D88]'}`}>Crear cuenta</Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                </div>
            </div>
        </div>
      </header>

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
