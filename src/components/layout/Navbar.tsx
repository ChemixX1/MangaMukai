import { lazy, Suspense, useState, useEffect, useRef, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, X, AlarmClock, Bell, ChevronRight, LogOut, MessageCircle, User as UserIcon, Bookmark, Moon, Sun, Flame } from "lucide-react";
import { AlarmAlert, CoinMarketModal, SearchModal, TimerModal } from "../modals";
import { DetailCoin3DIcon } from "../common";
import { ChatWindow, MessagesPanel, NotificationsPanel } from "../social";
import { useTheme } from "../../hooks/useTheme";
import { getUltimosCapitulos } from "../../services/mangaService";
import { lockPageScroll } from "../../utils/scrollLock";
import premiumCrownIcon from "../../assets/icons/premium-crown.svg";
import authPopoverBackground from "../../assets/modals/auth-login.webp";
import profilePopoverBackground from "../../assets/modals/auth-register.jpg";
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
import { getConversations, getNotifications, syncMangaSubscriptions } from "../../services/socialService";

const loadSubscriptionModal = () =>
  import("../modals/SubscriptionModal").then((module) => ({ default: module.SubscriptionModal }));
const SubscriptionModal = lazy(loadSubscriptionModal);

const MOBILE_NAV_LINKS = [
  { name: "Inicio", href: "/" },
  { name: "Biblioteca", href: "/biblioteca" },
  { name: "Mangas B&N", href: "/manga-bn" },
  { name: "Mangas +19", href: "/manga-19", isAdult: true },
];

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

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerUsesDarkText = isLightMode;
  const [currentUser, setCurrentUser] = useState<MMUser | null>(getCurrentStoredUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isMobileScrolled, setIsMobileScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // --- LÓGICA DEL TEMPORIZADOR ---
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isAlarmAlertOpen, setIsAlarmAlertOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    return lockPageScroll();
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!currentUser || !isMobileMenuOpen) return;
    void loadSubscriptionModal();
  }, [currentUser, isMobileMenuOpen]);

  useEffect(() => {
    const updateMobileScrollState = () => setIsMobileScrolled(window.scrollY > 12);
    updateMobileScrollState();
    window.addEventListener('scroll', updateMobileScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateMobileScrollState);
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
    return () => window.clearInterval(interval);
  }, [currentUser, refreshSocialCounts]);

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
    const handleExpired = () => {
      setCurrentUser(null);
      setShowUserMenu(false);
      setSessionNotice(true);
    };

    window.addEventListener(AUTH_CHANGED_EVENT, update);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpired);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, update);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpired);
    };
  }, []);

  useEffect(() => {
    if (currentUser || (!showUserMenu && !isMobileMenuOpen)) return;

    void getUltimosCapitulos().then((mangas) => {
      const covers = seedSharedAuthCovers(mangas);
      void preloadImages(covers.slice(0, 24).map((cover) => cover.src));
    });
    void import('../../pages/AuthPage');
  }, [currentUser, isMobileMenuOpen, showUserMenu]);

  const handleThemeToggle = () => {
    const root = document.documentElement;
    const viewTransitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };

    if (!viewTransitionDocument.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      toggleTheme();
      return;
    }

    root.classList.add('theme-transition-capture');
    const transition = viewTransitionDocument.startViewTransition(() => {
      flushSync(() => toggleTheme());
    });
    void transition.finished.finally(() => root.classList.remove('theme-transition-capture'));
  };

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
    clearAuth();
    setSessionNotice(false);
    setShowUserMenu(false);
    setShowMessages(false);
    setShowNotifications(false);
    setIsMobileMenuOpen(false);
  };

  const openAuthPage = (view: 'login' | 'register') => {
    setSessionNotice(false);
    setIsMobileMenuOpen(false);
    navigate(`/auth/${view}`);
  };

  const handleLogoClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsTimerModalOpen(false);
    setShowUserMenu(false);
    setShowMessages(false);
    setShowNotifications(false);
    setIsCoinModalOpen(false);
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
      <header className={`${isMobileMenuOpen ? 'fixed' : isProfileRoute ? 'sticky' : 'absolute'} site-navbar-surface left-0 top-0 z-[100] w-full py-3 sm:py-3`}>
        <div className="desktop-content-shell max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-16 flex justify-between items-center">
            
            {/* 1. IZQUIERDA */}
            <div className="flex items-center gap-4 lg:gap-10"> 
              <Link to="/" onClick={handleLogoClick} className="group flex h-10 items-center lg:-translate-y-0.5" aria-label="Volver al inicio de MangaMukai">
                <span className={`select-none text-2xl font-[1000] uppercase italic leading-none tracking-tighter transition-colors sm:text-3xl ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                    MANGA<span className="text-[#FF4D88]">MUKAI</span>
                </span>
              </Link>

              <nav className="hidden h-10 items-center gap-8 lg:translate-y-0.5 lg:flex">
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
            <div className="flex items-center gap-1 sm:gap-6 lg:translate-y-0.5">
                
                {/* Herramientas (Buscador y RELOJ) */}
                <div className={`relative hidden items-center gap-0 min-[360px]:flex sm:gap-2 ${headerUsesDarkText ? 'border-zinc-200' : 'border-white/10'} border-r pr-1 sm:mr-1 sm:pr-6`}>
                    <button 
                        onClick={() => setIsSearchOpen(true)}
                        aria-label="Buscar mangas"
                        title="Buscar mangas"
                        className={`${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#FF4D88]' : 'text-white hover:bg-white/10 hover:text-[#FF4D88]'} rounded-full p-2 transition-colors`}
                    >
                        <Search size={20} strokeWidth={2.5} />
                    </button>
                    
                    <div className="relative">
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

                    <button
                      type="button"
                      onClick={handleThemeToggle}
                      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                      aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                      className={`rounded-full p-2 transition-colors ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#FF4D88]' : 'text-white hover:bg-white/10 hover:text-[#FF4D88]'}`}
                    >
                      {theme === 'light' ? <Moon size={20} strokeWidth={2.5} /> : <Sun size={20} strokeWidth={2.5} />}
                    </button>
                </div>

                {/* ── Monedas en navbar (solo si hay sesión) ── */}
                {currentUser && (
                  <div className="hidden sm:flex items-center">
                    <button
                      type="button"
                      onClick={() => setIsCoinModalOpen(true)}
                      aria-label={`Abrir mercado de monedas. Saldo: ${currentUser.coins ?? 0}`}
                      title="Abrir mercado de monedas"
                      className={`group flex items-center gap-2 rounded-xl border px-2.5 py-1.5 shadow-sm transition-all duration-200 hover:-translate-y-px ${headerUsesDarkText ? 'border-[#D99A16]/35 bg-[#FFF5D8]/95 hover:border-[#D99A16]/55 hover:bg-[#ffefbf]' : 'border-[#FFC53D]/25 bg-[#FFC53D]/10 hover:border-[#FFC53D]/45 hover:bg-[#FFC53D]/15'}`}
                    >
                      <DetailCoin3DIcon size={27} className="h-[27px] w-[27px] object-contain drop-shadow-[0_5px_7px_rgba(180,83,9,0.28)] transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95" />
                      <span className={`font-[Montserrat] text-[15px] font-bold leading-none tracking-wide transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95 ${headerUsesDarkText ? 'text-[#D99A16]' : 'text-[#FFC53D]'}`}>{currentUser.coins ?? 0}</span>
                    </button>
                  </div>
                )}

                {currentUser ? (
                  <div className="relative hidden items-center gap-1 sm:flex" ref={userMenuRef}>
                    <div className="relative">
                      <button
                        onClick={() => { setShowUserMenu((value) => !value); setShowMessages(false); setShowNotifications(false); }}
                        aria-label={`Abrir perfil de ${currentUser.username}`}
                        aria-expanded={showUserMenu}
                        title={currentUser.username}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${headerUsesDarkText ? 'border-zinc-200 bg-zinc-100 hover:border-[#FF4D88]' : 'border-white/10 bg-black hover:border-[#FF4D88]'}`}
                      >
                        {currentUser.avatar ? <img src={currentUser.avatar} alt="avatar" className="h-7 w-7 rounded-full object-cover ring-2 ring-[#FF4D88]/30" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF4D88]"><UserIcon size={14} className="text-white" /></span>}
                      </button>

                      {showUserMenu && (
                        <div className={`auth-user-popover auth-user-popover-${isLightMode ? 'light' : 'dark'} absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border shadow-2xl ${isLightMode ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black text-white'}`}>
                          <img src={profilePopoverBackground} alt="" aria-hidden="true" className="auth-user-popover-background absolute inset-0 h-full w-full object-cover object-[55%_center]" />
                          <div aria-hidden="true" className="auth-user-popover-scrim absolute inset-0" />
                          <div className="relative z-10">
                            <div className={`flex items-center gap-3 border-b p-4 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                              {currentUser.avatar ? <img src={currentUser.avatar} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-[#FF4D88]/40" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF4D88]"><UserIcon size={18} className="text-white" /></span>}
                              <div className="min-w-0"><p className="truncate text-sm font-black">{currentUser.username}</p><p className={`truncate text-[10px] ${isLightMode ? 'text-black/55' : 'text-white/55'}`}>{currentUser.email}</p></div>
                            </div>
                            <div className="flex flex-col gap-0.5 px-2 pb-2">
                              <Link to="/perfil" onClick={() => setShowUserMenu(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${isLightMode ? 'text-black/75 hover:bg-white/45 hover:text-black' : 'text-white/75 hover:bg-black/30 hover:text-white'}`}><UserIcon size={14} className="text-[#FF4D88]" /> Mi Perfil</Link>
                              <Link to="/saved" onClick={() => setShowUserMenu(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${isLightMode ? 'text-black/75 hover:bg-white/45 hover:text-black' : 'text-white/75 hover:bg-black/30 hover:text-white'}`}><Bookmark size={14} className="text-[#FF4D88]" /> Guardados</Link>
                              <button type="button" onClick={() => { setShowUserMenu(false); setShowMessages(true); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${isLightMode ? 'text-black/75 hover:bg-white/45 hover:text-black' : 'text-white/75 hover:bg-black/30 hover:text-white'}`}><MessageCircle size={14} className="text-[#FF4D88]" /> Mensajes{unreadMessages > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF4D88] px-1 text-[9px] text-white">{unreadMessages}</span>}</button>
                            </div>
                            <div className={`border-t px-2 pb-2 pt-1 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}><button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/10"><LogOut size={14} /> Cerrar Sesión</button></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => { setShowNotifications((value) => !value); setShowUserMenu(false); setShowMessages(false); }} aria-label="Abrir notificaciones" aria-expanded={showNotifications} className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#FF4D88]' : 'text-white hover:bg-white/10 hover:text-[#FF4D88]'}`}>
                      <Bell size={20} strokeWidth={2.4} />
                      {unreadNotifications > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF4D88] px-1 text-[8px] font-black leading-none text-white">{Math.min(99, unreadNotifications)}</span>}
                    </button>
                  </div>
                ) : (
                  <div className="auth-google-sans relative hidden sm:block" ref={userMenuRef}>
                    <button type="button" aria-label="Abrir opciones de acceso" aria-expanded={showUserMenu} onClick={() => setShowUserMenu((visible) => !visible)} className={`flex h-10 w-10 items-center justify-center rounded-full border bg-transparent transition-colors ${headerUsesDarkText ? 'border-black/10 text-zinc-800 hover:border-[#FF4D88] hover:text-[#FF4D88]' : 'border-white/15 text-white hover:border-[#FF4D88] hover:text-[#FF4D88]'}`}><UserIcon size={20} strokeWidth={2.4} /></button>
                    {showUserMenu && (
                      <div className={`auth-user-popover auth-user-popover-${isLightMode ? 'light' : 'dark'} absolute right-0 mt-3 w-[300px] overflow-hidden rounded-[24px] border p-4 shadow-[0_22px_60px_rgba(0,0,0,0.22)] ${headerUsesDarkText ? 'border-black/10 bg-white text-zinc-950' : 'border-white/10 bg-[#0a0a0d] text-white'}`}>
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
                
                <span aria-hidden="true" className="h-10 w-10 shrink-0 lg:hidden" />

                <button
                  type="button"
                  aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
                  aria-expanded={isMobileMenuOpen}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`fixed right-4 top-4 z-[120] rounded-lg border p-2 sm:right-8 sm:top-6 lg:hidden transition-[background-color,border-color,color,opacity,box-shadow,backdrop-filter] duration-300 ${isMobileScrolled ? 'opacity-[0.85] shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md' : 'opacity-100 shadow-lg'} ${theme === 'light' || isLightMode ? (isMobileScrolled ? 'border-black/10 bg-white/75 text-black' : 'border-zinc-200 bg-white text-black') : (isMobileScrolled ? 'border-white/15 bg-black/65 text-white' : 'border-white/10 bg-black text-white')}`}
                >
                    {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
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

      {/* --- MENÚ MÓVIL FULL SCREEN --- */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
          className={`fixed inset-0 z-[90] isolate overflow-hidden lg:hidden ${isLightMode ? 'bg-white text-black' : 'bg-black text-white'}`}
        >
          <div aria-hidden="true" className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#FF4D88]/10 blur-[90px]" />
          <div aria-hidden="true" className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#6d28d9]/10 blur-[90px]" />

          <div className="relative flex h-[100dvh] flex-col overflow-y-auto overscroll-contain px-6 pb-6 pt-32 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav aria-label="Navegación móvil" className={`flex flex-col items-center justify-center ${currentUser ? 'min-h-[250px] shrink-0 py-2' : 'min-h-[310px] flex-1 py-4'}`}>
              {MOBILE_NAV_LINKS.map(link => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`navbar-primary-link group relative flex w-full max-w-sm items-center justify-center py-3.5 text-center text-[clamp(1.1rem,5.4vw,1.35rem)] tracking-[0.02em] transition-colors ${isActive ? 'text-[#FF4D88]' : isLightMode ? 'text-black hover:text-[#FF4D88]' : 'text-white hover:text-[#FF4D88]'}`}
                  >
                    <span className={`inline-flex items-center justify-center gap-2 ${link.isAdult ? 'navbar-adult-option' : ''}`}>
                      {link.isAdult && <NavbarFire size={22} />}
                      {link.name}
                    </span>
                    <span aria-hidden="true" className={`absolute bottom-2 left-1/2 h-0.5 -translate-x-1/2 bg-[#FF4D88] transition-all duration-300 ${isActive ? 'w-20' : 'w-0 group-hover:w-20 group-focus-visible:w-20'}`} />
                  </Link>
                );
              })}

              {!currentUser && (
                <div className={`mt-4 grid w-full max-w-sm grid-cols-2 gap-2 border-t pt-5 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                  <button onClick={() => openAuthPage('login')} className={`audiowide-library h-[52px] rounded-xl border text-[12px] font-normal uppercase tracking-normal transition-colors ${isLightMode ? 'border-black/20 text-black hover:bg-black/5' : 'border-white/20 text-white hover:bg-white/5'}`}>
                    Ingresar
                  </button>
                  <button onClick={() => openAuthPage('register')} className="audiowide-library h-[52px] rounded-xl bg-[#FF4D88] text-[12px] font-normal uppercase tracking-normal text-white shadow-[0_0_20px_rgba(255,77,136,0.28)]">
                    Crear Cuenta
                  </button>
                </div>
              )}
            </nav>

            {currentUser && (
              <div className="shrink-0 pt-2">
                <div className="mb-4 flex flex-col gap-3">
                    <div className={`flex items-center gap-3 rounded-xl border p-3 ${isLightMode ? 'border-black/10 bg-white/35' : 'border-white/10 bg-white/[0.03]'}`}>
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-[#FF4D88]/40" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF4D88]">
                          <UserIcon size={18} className="text-white" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-black ${isLightMode ? 'text-black' : 'text-white'}`}>{currentUser.username}</p>
                        <p className={`truncate text-[10px] ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>{currentUser.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        aria-label="Cerrar sesión"
                        title="Cerrar sesión"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                      >
                        <LogOut size={16} strokeWidth={2.4} />
                      </button>
                    </div>

                    <button type="button" onClick={() => { setIsMobileMenuOpen(false); setIsCoinModalOpen(true); }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#FF4D88]/20 bg-[#FF4D88]/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-[#FF4D88]/10">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                          <DetailCoin3DIcon size={40} className="h-10 w-10 object-contain drop-shadow-[0_7px_10px_rgba(180,83,9,0.3)]" />
                        </div>
                        <div className="min-w-0">
                          <p className={`mobile-account-label truncate text-[9px] font-bold uppercase tracking-normal ${isLightMode ? 'text-black' : 'text-white'}`}>Monedas disponibles</p>
                          <p className="font-[Montserrat] text-base font-bold leading-tight text-[#E4A11B]">{currentUser.coins ?? 0}</p>
                        </div>
                      </div>
                      <ChevronRight size={17} className="shrink-0 text-[#FF4D88]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsMobileMenuOpen(false); setIsSubscriptionModalOpen(true); }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#FF4D88]/20 bg-[#FF4D88]/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-[#FF4D88]/10"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                          <img src={premiumCrownIcon} alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
                        </span>
                        <span className="min-w-0">
                          <span className={`mobile-account-label block truncate text-[9px] font-bold uppercase tracking-normal ${isLightMode ? 'text-black' : 'text-white'}`}>Suscripción</span>
                          <span className="block text-sm font-black leading-tight text-[#FF4D88]">Mukai PRO</span>
                        </span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-[#FF4D88]" />
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/perfil" onClick={() => setIsMobileMenuOpen(false)} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[10px] font-black uppercase tracking-wider ${isLightMode ? 'border-black/10 text-black/70' : 'border-white/10 text-white/70'}`}>
                        <UserIcon size={15} className="text-[#FF4D88]" /> Mi Perfil
                      </Link>
                      <Link to="/saved" onClick={() => setIsMobileMenuOpen(false)} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[10px] font-black uppercase tracking-wider ${isLightMode ? 'border-black/10 text-black/70' : 'border-white/10 text-white/70'}`}>
                        <Bookmark size={15} className="text-[#FF4D88]" /> Guardados
                      </Link>
                      <button type="button" onClick={() => { setIsMobileMenuOpen(false); setShowMessages(true); }} className={`relative flex h-11 items-center justify-center gap-2 rounded-xl border text-[10px] font-black uppercase tracking-wider ${isLightMode ? 'border-black/10 text-black/70' : 'border-white/10 text-white/70'}`}>
                        <MessageCircle size={15} className="text-[#FF4D88]" /> Mensajes
                        {unreadMessages > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#FF4D88]" />}
                      </button>
                      <button type="button" onClick={() => { setIsMobileMenuOpen(false); setShowNotifications(true); }} className={`relative flex h-11 items-center justify-center gap-2 rounded-xl border text-[10px] font-black uppercase tracking-wider ${isLightMode ? 'border-black/10 text-black/70' : 'border-white/10 text-white/70'}`}>
                        <Bell size={15} className="text-[#FF4D88]" /> Alertas
                        {unreadNotifications > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#FF4D88]" />}
                      </button>
                    </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <MessagesPanel isOpen={showMessages} isLight={isLightMode} onClose={() => setShowMessages(false)} onUnreadChange={setUnreadMessages} />
      <NotificationsPanel isOpen={showNotifications} isLight={isLightMode} onClose={() => setShowNotifications(false)} onUnreadChange={setUnreadNotifications} />
      {currentUser && <ChatWindow isLight={isLightMode} onUnreadChange={refreshSocialCounts} />}

      <TimerModal
        isOpen={isTimerModalOpen}
        onClose={() => setIsTimerModalOpen(false)}
        onStartTimer={startTimer}
        onStopTimer={stopTimer}
        activeTimer={timeLeft}
        isActive={isTimerActive}
      />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <AlarmAlert isOpen={isAlarmAlertOpen} onClose={() => setIsAlarmAlertOpen(false)} />
      <CoinMarketModal 
        isOpen={isCoinModalOpen} 
        onClose={() => setIsCoinModalOpen(false)} 
        username={currentUser?.username || ''} 
        userId={currentUser?.id?.toString() || ''} 
      />
      {isSubscriptionModalOpen && (
        <Suspense fallback={<div aria-hidden="true" className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xl" />}>
          <SubscriptionModal
            isOpen={isSubscriptionModalOpen}
            onClose={() => setIsSubscriptionModalOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
};
