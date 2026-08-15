import { lazy, Suspense, useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, ChevronDown, X, AlarmClock, ChevronRight, LogOut, User as UserIcon, Bookmark, ShoppingCart, Moon, Sun, BookOpen, Flame, ArrowUpRight } from "lucide-react";
import { AlarmAlert, AuthModal, CoinMarketModal, SearchModal, TimerModal } from "../modals";
import { useTheme } from "../../hooks/useTheme";
import { getUltimosCapitulos } from "../../services/mangaService";
import { lockPageScroll } from "../../utils/scrollLock";
import modernCoinIcon from "../../assets/icons/modern-coin.svg";
import premiumCrownIcon from "../../assets/icons/premium-crown.svg";
import {
  AUTH_CHANGED_EVENT,
  AUTH_SESSION_EXPIRED_EVENT,
  getStoredUser,
  getStoredToken,
  clearAuth,
  refreshUser,
  type MMUser,
} from "../../services/authService";

const loadSubscriptionModal = () =>
  import("../modals/SubscriptionModal").then((module) => ({ default: module.SubscriptionModal }));
const SubscriptionModal = lazy(loadSubscriptionModal);

const MOBILE_NAV_LINKS = [
  { name: "Inicio", href: "/" },
  { name: "Biblioteca", href: "/biblioteca" },
  { name: "Mangas B&N", href: "/manga-bn" },
  { name: "Mangas +19", href: "/manga-19", isAdult: true },
];

const FacebookIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.436H7.078v-3.491h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.974h-1.513c-1.49 0-1.956.931-1.956 1.887v2.259h3.328l-.532 3.491h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
  </svg>
);

const XSocialIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

const TelegramIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="3.5 5 16 15" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z" />
  </svg>
);

const WhatsAppIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const MOBILE_SOCIAL_LINKS = [
  { name: "Facebook", href: "https://www.facebook.com/MangaAyanokouji/", icon: FacebookIcon },
  { name: "X", href: "https://x.com/MangaMukai", icon: XSocialIcon },
  { name: "Telegram", href: "https://t.me/+J6TE0l401vRhZTYx", icon: TelegramIcon },
  { name: "WhatsApp", href: "https://wa.me/51926615198", icon: WhatsAppIcon },
];

const DAILY_ROUTE_LIMIT = 8;
const DAILY_ROUTE_REFRESH_MS = 24 * 60 * 60 * 1000;
const FALLBACK_QUICK_ROUTES = [
  "Romance",
  "Drama",
  "Reencarnación",
  "Manhwa",
  "Romance obsesivo",
  "Comedia",
  "Venganza",
  "Magia",
];

const HIDDEN_QUICK_ROUTE_TAGS = new Set([
  "manga",
  "mujer",
  "hombre",
  "b/n",
  "+15",
  "+16",
  "+18",
  "+19",
]);

const buildDailyQuickRoutes = (mangas: Awaited<ReturnType<typeof getUltimosCapitulos>>) => {
  const occurrences = new Map<string, number>();

  mangas.forEach((manga) => {
    new Set(manga.genres || []).forEach((tag) => {
      const cleanTag = tag.trim();
      if (!cleanTag || HIDDEN_QUICK_ROUTE_TAGS.has(cleanTag.toLocaleLowerCase('es'))) return;
      occurrences.set(cleanTag, (occurrences.get(cleanTag) || 0) + 1);
    });
  });

  const availableTags = [...occurrences.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .map(([tag]) => tag);

  if (availableTags.length < DAILY_ROUTE_LIMIT) return FALLBACK_QUICK_ROUTES;

  const today = new Date();
  const localDayNumber = Math.floor(
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / DAILY_ROUTE_REFRESH_MS
  );
  const start = (localDayNumber * DAILY_ROUTE_LIMIT) % availableTags.length;

  return Array.from(
    { length: DAILY_ROUTE_LIMIT },
    (_, index) => availableTags[(start + index) % availableTags.length]
  );
};

const getCurrentStoredUser = () => (getStoredToken() ? getStoredUser() : null);

export const Navbar = () => {
  
  // --- LÓGICA DE COLOR (DARK/LIGHT MODE) ---
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isLightMode = location.pathname === '/nosotros'
    || location.pathname === '/contacto'
    || (location.pathname === '/biblioteca' && theme === 'light');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerUsesDarkText = isLightMode && !isMobileMenuOpen;
  const [currentUser, setCurrentUser] = useState<MMUser | null>(getCurrentStoredUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(false);
  const [quickRoutes, setQuickRoutes] = useState(FALLBACK_QUICK_ROUTES);
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
    if (!window.matchMedia('(min-width: 1024px)').matches) return;

    let cancelled = false;

    const updateQuickRoutes = async () => {
      const mangas = await getUltimosCapitulos();
      if (!cancelled && mangas.length > 0) {
        setQuickRoutes(buildDailyQuickRoutes(mangas));
      }
    };

    updateQuickRoutes();
    const refreshTimer = window.setInterval(updateQuickRoutes, DAILY_ROUTE_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

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
    setIsMobileMenuOpen(false);
  };

  const openModal = (view: 'login' | 'register') => {
    setSessionNotice(false);
    setAuthView(view); setIsAuthModalOpen(true); setIsMobileMenuOpen(false);
  };

  const handleLogoClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsTimerModalOpen(false);
    setShowUserMenu(false);
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
      <header className={`${isMobileMenuOpen ? 'fixed lg:absolute' : 'absolute'} left-0 top-0 z-[100] w-full bg-transparent py-4 sm:py-6`}>
        <div className="desktop-content-shell max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-16 flex justify-between items-center">
            
            {/* 1. IZQUIERDA */}
            <div className="flex items-center gap-4 lg:gap-10"> 
              <Link to="/" onClick={handleLogoClick} className="block group" aria-label="Volver al inicio de MangaMukai">
                <span className={`text-2xl sm:text-3xl font-[1000] tracking-tighter uppercase italic select-none transition-colors ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                    MANGA<span className="text-[#FF4D88]">MUKAI</span>
                </span>
              </Link>

              <nav className="hidden lg:flex items-center gap-8">
                <Link to="/" className={`text-xs font-[900] hover:text-[#FF4D88] uppercase tracking-[0.15em] transition-colors ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                  Inicio
                </Link>

                <div className="group relative">
                  <button className={`text-xs font-[900] hover:text-[#FF4D88] uppercase tracking-[0.15em] transition-colors flex items-center gap-1.5 ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                    Mangas
                    <ChevronDown size={14} strokeWidth={3} className="opacity-70 transition-transform group-hover:rotate-180" />
                  </button>

                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 opacity-0 -translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200">
                    <div className="relative w-[700px] overflow-hidden rounded-lg border border-white/10 bg-[#050505] shadow-[0_24px_70px_rgba(0,0,0,0.62)]">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF4D88] to-transparent" />
                      <div className="grid grid-cols-[245px_1fr]">
                        <div className="relative flex min-h-[390px] flex-col overflow-hidden border-r border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,77,136,0.16),rgba(255,77,136,0.025)_58%,transparent)] p-7">
                          <span aria-hidden="true" className="absolute -bottom-14 -right-5 text-[190px] font-black italic leading-none text-white/[0.025]">M</span>
                          <div className="relative">
                            <h3 className="mt-2 text-[28px] font-black uppercase italic leading-[1.08] tracking-[-0.045em] text-white">
                              Tu próxima<br />historia<br /><span className="text-[#FF4D88]">empieza aquí</span>
                            </h3>
                            <p className="mt-5 max-w-[180px] text-[11px] font-medium leading-relaxed text-white/45">
                              Explora tus mangas favoritos y déjate llevar por las maravillosas historias que te esperan.
                            </p>
                          </div>
                          <Link
                            to="/biblioteca"
                            className="relative mt-auto flex w-full items-center justify-between border-y border-[#FF4D88]/30 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:text-[#FF4D88]"
                          >
                            Abrir biblioteca <ArrowUpRight size={15} strokeWidth={2.5} />
                          </Link>
                        </div>

                        <div className="p-6">
                          <div className="mb-3 flex items-center">
                        <p className="text-[9px] font-black uppercase tracking-normal text-[#FF4D88]">Colecciones</p>
                          </div>

                          <div className="border-t border-white/[0.08]">
                            {[
                              { label: 'Blanco & Negro', detail: 'Edición tradicional', href: '/manga-bn', icon: <BookOpen size={18} /> },
                              { label: 'Mangas +19', detail: 'Selección adulta', href: '/manga-19', icon: <Flame size={18} /> },
                            ].map((entry) => (
                              <Link key={entry.href} to={entry.href} className="grid grid-cols-[38px_1fr_auto] items-center gap-3 border-b border-white/[0.08] py-4">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/45">{entry.icon}</span>
                                <span>
                                  <strong className="block text-[11px] font-black uppercase tracking-wide text-white">{entry.label}</strong>
                                  <small className="mt-0.5 block text-[9px] text-white/35">{entry.detail}</small>
                                </span>
                                <ChevronRight size={14} className="text-white/20" />
                              </Link>
                            ))}
                          </div>

                          <div className="mt-6">
                        <p className="mb-3 text-[9px] font-black uppercase tracking-normal text-[#FF4D88]">Filtros rápidos</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {quickRoutes.map((genre) => (
                                <Link
                                  key={genre}
                                  to="/biblioteca"
                                  state={{ filterCategory: genre }}
                                  className="group/genre flex min-w-0 items-center gap-2 border-b border-white/[0.05] py-2 text-[9px] font-bold uppercase tracking-wide text-white/45 transition-colors hover:text-white"
                                  title={genre}
                                >
                                  <span className="h-px w-3 shrink-0 bg-white/15 transition-all group-hover/genre:w-5 group-hover/genre:bg-[#FF4D88]" />
                                  <span className="truncate">{genre}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Link to="/manga-bn" className={`text-xs font-[900] hover:text-[#FF4D88] uppercase tracking-[0.15em] transition-colors ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                  Mangas B&N
                </Link>
                <Link to="/manga-19" className={`text-xs font-[900] hover:text-[#FF4D88] uppercase tracking-[0.15em] transition-colors ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Flame aria-hidden="true" size={15} strokeWidth={2.5} className="navbar-fire" />
                    Mangas +19
                  </span>
                </Link>
              </nav>
            </div>

            {/* 2. DERECHA */}
            <div className="flex items-center gap-1 sm:gap-6">
                
                {/* Herramientas (Buscador y RELOJ) */}
                <div className={`relative flex items-center gap-0 sm:gap-2 ${headerUsesDarkText ? 'border-zinc-200' : 'border-white/10'} border-r pr-1 sm:mr-1 sm:pr-6`}>
                    <button 
                        onClick={() => setIsSearchOpen(true)}
                        aria-label="Buscar mangas"
                        title="Buscar mangas"
                        className={`${headerUsesDarkText ? 'text-zinc-600 hover:text-[#FF4D88] hover:bg-zinc-100' : 'text-white hover:text-white/75 hover:bg-white/10'} transition-colors p-2 rounded-full`}
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
                                    ? 'text-zinc-600 hover:text-[#FF4D88] hover:bg-zinc-100' 
                                    : 'text-white hover:text-white/75 hover:bg-white/10'
                            }`}
                        >
                            <AlarmClock size={20} strokeWidth={2.5} className={isTimerActive ? 'animate-pulse' : ''} />
                            
                            {isTimerActive && (
                                <span className="absolute top-1 right-2 w-2 h-2 bg-[#FF4D88] rounded-full border border-[#02040a] animate-ping"></span>
                            )}
                        </button>
                        
                        <TimerModal 
                            isOpen={isTimerModalOpen}
                            onClose={() => setIsTimerModalOpen(false)}
                            onStartTimer={startTimer}
                            onStopTimer={stopTimer}
                            activeTimer={timeLeft}
                            isActive={isTimerActive}
                        />
                    </div>

                    {(location.pathname === '/' || location.pathname === '/biblioteca') && (
                      <button
                        type="button"
                        onClick={toggleTheme}
                        title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                        aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                        className={`transition-colors p-2 rounded-full ${headerUsesDarkText ? 'text-zinc-700 hover:text-[#FF4D88] hover:bg-zinc-100' : 'text-white hover:text-white/75 hover:bg-white/10'}`}
                      >
                        {theme === 'light' ? <Moon size={20} strokeWidth={2.5} /> : <Sun size={20} strokeWidth={2.5} />}
                      </button>
                    )}
                </div>

                {/* ── Monedas en navbar (solo si hay sesión) ── */}
                {currentUser && (
                  <div className="hidden sm:flex items-center gap-2">
                    {/* Moneda 3D + cantidad */}
                    <div className="flex items-center gap-1.5">
                      <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <radialGradient id="nc-face" cx="38%" cy="32%" r="65%">
                            <stop offset="0%" stopColor="#FEF9C3" />
                            <stop offset="45%" stopColor="#FCD34D" />
                            <stop offset="100%" stopColor="#B45309" />
                          </radialGradient>
                          <linearGradient id="nc-edge" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#92400E" />
                            <stop offset="100%" stopColor="#451A03" />
                          </linearGradient>
                        </defs>
                        <ellipse cx="16" cy="20" rx="13" ry="4.5" fill="url(#nc-edge)" />
                        <ellipse cx="16" cy="14" rx="13" ry="9.5" fill="url(#nc-face)" />
                        <ellipse cx="11.5" cy="10" rx="3.5" ry="2" fill="rgba(255,255,255,0.45)" transform="rotate(-25,11.5,10)" />
                        <text x="16" y="16.5" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#78350F" fontFamily="sans-serif">M</text>
                      </svg>
                      <span className="text-[12px] font-black text-yellow-400 tracking-wide">{currentUser.coins ?? 0}</span>
                    </div>
                    {/* Botón Recargar */}
                    <button
                      onClick={() => setIsCoinModalOpen(true)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${headerUsesDarkText ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'}`}
                    >
                      <ShoppingCart size={11} />
                      Recargar
                    </button>
                  </div>
                )}

                {currentUser ? (
                  /* ── Usuario autenticado ── */
                  <div className="hidden sm:block relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu(v => !v)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all ${headerUsesDarkText ? 'bg-zinc-100 border-zinc-200 hover:border-zinc-300' : 'bg-[#0F1115] border-white/10 hover:border-white/20'}`}
                    >
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover ring-2 ring-[#FF4D88]/30" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#FF4D88] flex items-center justify-center">
                          <UserIcon size={14} className="text-white" />
                        </div>
                      )}
                      <span className={`text-[11px] font-black uppercase tracking-wider ${headerUsesDarkText ? 'text-black' : 'text-white'}`}>
                        {currentUser.username}
                      </span>
                      <ChevronDown size={12} strokeWidth={3} className={`${headerUsesDarkText ? 'text-zinc-500' : 'text-white/50'} transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-60 bg-[#0A0A0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                        {/* Cabecera: avatar + info */}
                        <div className="p-4 border-b border-white/5 flex items-center gap-3">
                          {currentUser.avatar ? (
                            <img src={currentUser.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF4D88]/40" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#FF4D88] flex items-center justify-center flex-shrink-0">
                              <UserIcon size={18} className="text-white" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white truncate">{currentUser.username}</p>
                            <p className="text-[10px] text-white/40 truncate">{currentUser.email}</p>
                          </div>
                        </div>

                        {/* Opciones de navegación */}
                        <div className="px-2 pb-2 flex flex-col gap-0.5">
                          <Link
                            to="/perfil"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider"
                          >
                            <UserIcon size={14} className="text-[#FF4D88]" /> Mi Perfil
                          </Link>
                          <Link
                            to="/saved"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider"
                          >
                            <Bookmark size={14} className="text-[#FF4D88]" /> Guardados
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="px-2 pb-2 border-t border-white/5 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold text-red-400 hover:bg-red-500/10 transition-colors uppercase tracking-wider"
                          >
                            <LogOut size={14} /> Cerrar Sesión
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Sin sesión ── */
                  <div className={`hidden sm:flex items-center ${headerUsesDarkText ? 'bg-zinc-100 border-zinc-200' : 'bg-[#0F1115] border-white/10'} rounded-full p-1 border`}>
                    <button onClick={() => openModal('login')} className={`px-5 py-2 text-[10px] sm:text-[11px] font-black ${headerUsesDarkText ? 'text-black' : 'text-white'} uppercase tracking-widest hover:text-[#FF4D88] transition-colors`}>Ingresar</button>
                    <button onClick={() => openModal('register')} className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-full hover:bg-[#FF4D88] hover:text-white transition-colors shadow-sm">
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">Crear Cuenta</span>
                      <ChevronRight size={14} strokeWidth={3} />
                    </button>
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
            onClick={() => openModal('login')}
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
          className="fixed inset-0 z-[90] isolate overflow-hidden bg-[#02040a]/90 backdrop-blur-[24px] backdrop-saturate-125 lg:hidden"
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
                    className={`mobile-nav-michroma group relative flex w-full max-w-sm items-center justify-center py-3.5 text-center text-[clamp(1.2rem,6vw,1.55rem)] font-black uppercase tracking-tight transition-colors ${isActive ? 'text-[#FF4D88]' : 'text-white hover:text-[#FF4D88]'}`}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {link.isAdult && <Flame aria-hidden="true" size={21} strokeWidth={2.5} className="navbar-fire" />}
                      {link.name}
                    </span>
                    <span aria-hidden="true" className={`absolute bottom-2 left-1/2 h-0.5 -translate-x-1/2 bg-[#FF4D88] transition-all duration-300 ${isActive ? 'w-20' : 'w-0 group-hover:w-20 group-focus-visible:w-20'}`} />
                  </Link>
                );
              })}

              {!currentUser && (
                <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2 border-t border-white/10 pt-5">
                  <button onClick={() => openModal('login')} className="michroma-regular h-12 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-white/5">
                    Ingresar
                  </button>
                  <button onClick={() => openModal('register')} className="michroma-regular h-12 rounded-xl bg-[#FF4D88] text-[10px] font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(255,77,136,0.28)]">
                    Crear Cuenta
                  </button>
                </div>
              )}
            </nav>

            {currentUser && (
              <div className="shrink-0 pt-2">
                <div className="mb-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-[#FF4D88]/40" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF4D88]">
                          <UserIcon size={18} className="text-white" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">{currentUser.username}</p>
                        <p className="truncate text-[10px] text-white/40">{currentUser.email}</p>
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

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#FF4D88]/20 bg-[#FF4D88]/[0.06] px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                          <img src={modernCoinIcon} alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="mobile-account-label truncate text-[9px] font-bold uppercase tracking-normal text-white">Monedas disponibles</p>
                          <p className="text-sm font-black leading-tight text-[#FF4D88]">{currentUser.coins ?? 0}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setIsMobileMenuOpen(false); setIsCoinModalOpen(true); }}
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#FF4D88] px-3 text-[9px] font-black uppercase tracking-wider text-white transition-colors hover:bg-[#e13c75]"
                      >
                        <ShoppingCart size={12} /> Recargar
                      </button>
                    </div>

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
                          <span className="mobile-account-label block truncate text-[9px] font-bold uppercase tracking-normal text-white">Suscripción</span>
                          <span className="block text-sm font-black leading-tight text-[#FF4D88]">Mukai PRO</span>
                        </span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-[#FF4D88]" />
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/perfil" onClick={() => setIsMobileMenuOpen(false)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-wider text-white/70">
                        <UserIcon size={15} className="text-[#FF4D88]" /> Mi Perfil
                      </Link>
                      <Link to="/saved" onClick={() => setIsMobileMenuOpen(false)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-wider text-white/70">
                        <Bookmark size={15} className="text-[#FF4D88]" /> Guardados
                      </Link>
                    </div>
                </div>
              </div>
            )}

            <div className="mt-auto shrink-0 pt-4">
              {currentUser && <div aria-hidden="true" className="mx-auto mb-4 h-px w-full max-w-xs bg-white/15" />}

              <div className="mx-auto grid w-full max-w-xs grid-cols-4 gap-2" aria-label="Redes sociales principales">
                {MOBILE_SOCIAL_LINKS.map(({ name, href, icon: SocialIcon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name}
                    title={name}
                    className="flex h-12 items-center justify-center rounded-xl border border-white/20 bg-transparent text-white transition-colors hover:border-white/40"
                  >
                    <SocialIcon size={20} className="text-white" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialView={authView} />
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
