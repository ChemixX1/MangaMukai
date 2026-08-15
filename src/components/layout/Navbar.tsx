import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, ChevronDown, X, AlarmClock, ChevronRight, LogOut, User as UserIcon, Bookmark, Coins, ShoppingCart, Grid3X3, Moon, Sun, BookOpen, Flame, ArrowUpRight } from "lucide-react";
import { AlarmAlert, AuthModal, CoinMarketModal, SearchModal, TimerModal } from "../modals";
import { useTheme } from "../../hooks/useTheme";
import {
  AUTH_CHANGED_EVENT,
  AUTH_SESSION_EXPIRED_EVENT,
  getStoredUser,
  getStoredToken,
  clearAuth,
  refreshUser,
  type MMUser,
} from "../../services/authService";

const MOBILE_NAV_LINKS = [
  { name: "Inicio", href: "/" },
  { name: "Catálogo", href: "/catalog" },
  { name: "Mangas B&N", href: "/manga-bn" },
  { name: "🔥 Mangas +19", href: "/manga-19" },
];

const FEATURED_GENRES = [
  "Romance",
  "Fantasía",
  "Drama",
  "Reencarnación",
  "Manhwa",
  "CEO",
  "Otome",
  "Manga juvenil de acción",
];

const getCurrentStoredUser = () => (getStoredToken() ? getStoredUser() : null);

export const Navbar = () => {
  
  // --- LÓGICA DE COLOR (DARK/LIGHT MODE) ---
  const location = useLocation();
  const isLightMode = location.pathname === '/nosotros' || location.pathname === '/contacto';
  const { theme, toggleTheme } = useTheme();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<MMUser | null>(getCurrentStoredUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // --- LÓGICA DEL TEMPORIZADOR ---
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isAlarmAlertOpen, setIsAlarmAlertOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<number | null>(null);

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

  return (
    <>
      <header className="absolute top-0 left-0 z-[100] w-full bg-transparent py-4 sm:py-6">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-16 flex justify-between items-center">
            
            {/* 1. IZQUIERDA */}
            <div className="flex items-center gap-4 lg:gap-10"> 
              <Link to="/" className="block group">
                <span className="text-2xl sm:text-3xl font-[1000] tracking-tighter uppercase italic select-none text-white">
                    MANGA<span className="text-[#FF4D88]">MUKAI</span>
                </span>
              </Link>

              <nav className="hidden lg:flex items-center gap-8">
                <Link to="/" className="text-xs font-[900] text-white hover:text-[#FF4D88] uppercase tracking-[0.15em] transition-colors">
                  Inicio
                </Link>

                <div className="group relative">
                  <button className="text-xs font-[900] text-white hover:text-[#FF4D88] uppercase tracking-[0.15em] transition-colors flex items-center gap-1.5">
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
                            <p className="text-[9px] font-black uppercase tracking-[0.32em] text-[#FF4D88]">Mukai Directory / 01</p>
                            <h3 className="mt-6 text-[28px] font-black uppercase italic leading-[0.96] tracking-[-0.045em] text-white">
                              Tu próxima<br />historia<br /><span className="text-[#FF4D88]">empieza aquí.</span>
                            </h3>
                            <p className="mt-5 max-w-[180px] text-[11px] font-medium leading-relaxed text-white/45">
                              Explora el archivo completo con búsqueda y filtros avanzados.
                            </p>
                          </div>
                          <Link
                            to="/catalog"
                            className="relative mt-auto flex w-full items-center justify-between border-y border-[#FF4D88]/30 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:text-[#FF4D88]"
                          >
                            Abrir catálogo <ArrowUpRight size={15} strokeWidth={2.5} />
                          </Link>
                        </div>

                        <div className="p-6">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/35">Colecciones</p>
                            <span className="font-mono text-[9px] text-white/20">03 accesos</span>
                          </div>

                          <div className="border-t border-white/[0.08]">
                            {[
                              { number: '01', label: 'Todo el catálogo', detail: 'Todos los títulos', href: '/catalog', icon: <Grid3X3 size={17} /> },
                              { number: '02', label: 'Blanco & Negro', detail: 'Edición tradicional', href: '/manga-bn', icon: <BookOpen size={17} /> },
                              { number: '03', label: 'Mangas +19', detail: 'Selección adulta', href: '/manga-19', icon: <Flame size={17} /> },
                            ].map((entry) => (
                              <Link key={entry.number} to={entry.href} className="group/item grid grid-cols-[32px_34px_1fr_auto] items-center gap-3 border-b border-white/[0.08] py-3.5 transition-colors hover:bg-white/[0.035]">
                                <span className="font-mono text-[9px] text-white/25 group-hover/item:text-[#FF4D88]">{entry.number}</span>
                                <span className="text-white/45 transition-colors group-hover/item:text-[#FF4D88]">{entry.icon}</span>
                                <span>
                                  <strong className="block text-[11px] font-black uppercase tracking-wide text-white">{entry.label}</strong>
                                  <small className="mt-0.5 block text-[9px] text-white/35">{entry.detail}</small>
                                </span>
                                <ChevronRight size={14} className="text-white/20 transition-transform group-hover/item:translate-x-1 group-hover/item:text-white" />
                              </Link>
                            ))}
                          </div>

                          <div className="mt-6">
                            <p className="mb-3 text-[9px] font-black uppercase tracking-[0.28em] text-white/35">Rutas rápidas</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {FEATURED_GENRES.map((genre) => (
                                <Link
                                  key={genre}
                                  to="/catalog"
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

                <Link to="/manga-bn" className="text-xs font-[900] text-white hover:text-[#FF4D88] uppercase tracking-[0.15em] transition-colors">
                  Mangas B&N
                </Link>
                <Link to="/manga-19" className="text-xs font-[900] text-white hover:text-[#FF4D88] uppercase tracking-[0.15em] transition-colors">
                  🔥 Mangas +19
                </Link>
              </nav>
            </div>

            {/* 2. DERECHA */}
            <div className="flex items-center gap-2 sm:gap-6">
                
                {/* Herramientas (Buscador y RELOJ) */}
                <div className={`flex items-center gap-1 sm:gap-2 ${isLightMode ? 'border-zinc-200' : 'border-white/10'} border-r pr-3 sm:pr-6 mr-1 relative`}>
                    <button 
                        onClick={() => setIsSearchOpen(true)}
                        aria-label="Buscar mangas"
                        title="Buscar mangas"
                        className={`${isLightMode ? 'text-zinc-600 hover:text-[#FF4D88] hover:bg-zinc-100' : 'text-white hover:text-white/75 hover:bg-white/10'} transition-colors p-2 rounded-full`}
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
                                    : isLightMode 
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

                    {location.pathname === '/' && (
                      <button
                        type="button"
                        onClick={toggleTheme}
                        title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                        aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                        className="transition-colors p-2 rounded-full text-white hover:text-white/75 hover:bg-white/10"
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
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${isLightMode ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'}`}
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
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all ${isLightMode ? 'bg-zinc-100 border-zinc-200 hover:border-zinc-300' : 'bg-[#0F1115] border-white/10 hover:border-white/20'}`}
                    >
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover ring-2 ring-[#FF4D88]/30" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#FF4D88] flex items-center justify-center">
                          <UserIcon size={14} className="text-white" />
                        </div>
                      )}
                      <span className={`text-[11px] font-black uppercase tracking-wider ${isLightMode ? 'text-black' : 'text-white'}`}>
                        {currentUser.username}
                      </span>
                      <ChevronDown size={12} strokeWidth={3} className={`${isLightMode ? 'text-zinc-500' : 'text-white/50'} transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
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
                  <div className={`hidden sm:flex items-center ${isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-[#0F1115] border-white/10'} rounded-full p-1 border`}>
                    <button onClick={() => openModal('login')} className={`px-5 py-2 text-[10px] sm:text-[11px] font-black ${isLightMode ? 'text-black' : 'text-white'} uppercase tracking-widest hover:text-[#FF4D88] transition-colors`}>Ingresar</button>
                    <button onClick={() => openModal('register')} className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-full hover:bg-[#FF4D88] hover:text-white transition-colors shadow-sm">
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">Crear Cuenta</span>
                      <ChevronRight size={14} strokeWidth={3} />
                    </button>
                  </div>
                )}
                
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`lg:hidden ${isLightMode ? 'text-black border-zinc-200 bg-zinc-50' : 'text-white border-white/10 bg-[#02040a]'} p-2 border rounded-lg hover:opacity-70 transition-colors`}>
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
        <div className="fixed inset-0 z-[90] bg-[#02040a]/95 backdrop-blur-xl pt-28 px-8 flex flex-col">
             <div className="flex flex-col gap-6">
                 {MOBILE_NAV_LINKS.map(link => {
                     const linkClasses = "text-2xl font-black text-white uppercase tracking-tighter border-b border-white/10 pb-4 flex items-center justify-between group";
                     return (
                         <Link 
                             key={link.name} 
                             to={link.href} 
                             onClick={() => setIsMobileMenuOpen(false)} 
                             className={linkClasses}
                         >
                            {link.name}
                            <ChevronRight size={20} className="text-[#FF4D88] opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                         </Link>
                     );
                 })}
                 
                 <div className="flex gap-4 mt-2">
                    <button 
                        onClick={() => { setIsMobileMenuOpen(false); setIsSearchOpen(true); }}
                        className="flex-1 py-3 border border-white/10 rounded-lg flex items-center justify-center gap-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                    >
                        <Search size={18} /> <span className="text-xs font-bold uppercase">Buscar</span>
                    </button>
                    <button 
                         onClick={() => { setIsMobileMenuOpen(false); setIsTimerModalOpen(true); }}
                         className="flex-1 py-3 border border-white/10 rounded-lg flex items-center justify-center gap-2 text-zinc-400 relative hover:bg-white/5 hover:text-white"
                    >
                        <AlarmClock size={18} /> <span className="text-xs font-bold uppercase">Timer</span>
                    </button>
                    {location.pathname === '/' && (
                      <button
                        onClick={toggleTheme}
                        className="flex-1 py-3 border border-white/10 rounded-lg flex items-center justify-center gap-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                      >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        <span className="text-xs font-bold uppercase">{theme === 'light' ? 'Oscuro' : 'Claro'}</span>
                      </button>
                    )}
                 </div>

                 <div className="mt-8 flex flex-col gap-4">
                   {currentUser ? (
                     <>
                       <div className="flex items-center gap-3 px-1">
                         {currentUser.avatar ? (
                           <img src={currentUser.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF4D88]/40" />
                         ) : (
                           <div className="w-10 h-10 rounded-full bg-[#FF4D88] flex items-center justify-center">
                             <UserIcon size={18} className="text-white" />
                           </div>
                         )}
                         <div>
                           <p className="text-white font-black text-sm">{currentUser.username}</p>
                           <p className="text-white/40 text-[10px]">{currentUser.email}</p>
                         </div>
                       </div>

                       {/* Monedas */}
                       <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                         <div className="flex items-center gap-2">
                           <Coins size={14} className="text-yellow-400" />
                           <span className="text-[11px] font-black text-yellow-400 uppercase tracking-wider">
                             {currentUser.coins ?? 0} monedas
                           </span>
                         </div>
                         <button
                           onClick={() => {
                             setIsMobileMenuOpen(false);
                             setIsCoinModalOpen(true);
                           }}
                           className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 px-2 py-1 rounded-lg transition-colors"
                         >
                           <ShoppingCart size={9} /> Comprar
                         </button>
                       </div>

                       <Link to="/perfil" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-white/10 text-sm font-bold text-white/70 hover:text-white hover:bg-white/5 uppercase tracking-wider transition-colors">
                         <UserIcon size={16} className="text-[#FF4D88]" /> Mi Perfil
                       </Link>
                       <Link to="/saved" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-white/10 text-sm font-bold text-white/70 hover:text-white hover:bg-white/5 uppercase tracking-wider transition-colors">
                         <Bookmark size={16} className="text-[#FF4D88]" /> Guardados
                       </Link>
                       <button onClick={handleLogout} className="w-full py-4 border border-red-500/30 text-red-400 font-black uppercase tracking-widest rounded-xl hover:bg-red-500/10 flex items-center justify-center gap-2">
                         <LogOut size={16} /> Cerrar Sesión
                       </button>
                     </>
                   ) : (
                     <>
                       <button onClick={() => openModal('login')} className="w-full py-4 border border-white/20 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/5">Ingresar</button>
                       <button onClick={() => openModal('register')} className="w-full py-4 bg-[#FF4D88] text-white font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(255,77,136,0.4)]">Crear Cuenta</button>
                     </>
                   )}
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
    </>
  );
};
