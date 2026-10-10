import { Bookmark, Coins, Crown, LogOut, MessageCircle, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { openSubscriptionModal } from '../../utils/subscriptionModal';
import { BellGlyph, DetailCoin3DIcon } from '../common';
import { AlarmIcon, MoonIcon, SearchLensIcon, SunIcon } from '../ui';
import type { NavbarViewProps } from './useNavbarState';
const DESKTOP_LINKS = [
  { to: '/manga-bn', label: 'Mangas BN' },
  { to: '/manga-19', label: 'Mangas +19' },
  { to: '/chat', label: 'Character' },
  { to: '/comunidad', label: 'Comunidad' },
  { to: '/tienda', label: 'Tienda Mukai' },
];


export function NavbarP({ model }: NavbarViewProps) {
  const { theme, isLightMode, isProfileRoute, currentUser, showUserMenu, setShowUserMenu, showNotifications, setShowNotifications, unreadMessages, unreadNotifications, isHeaderHidden, userMenuRef, headerUsesDarkText, openSearch, isTimerModalOpen, setIsTimerModalOpen, isTimerActive, prefetchAuth, handleThemeToggle, handleLogout, goToRecharge, handleLogoClick, desktopIconClass } = model;
  return (<header
      className={`${isProfileRoute ? 'sticky' : 'fixed'} site-navbar-surface site-navbar-desktop left-0 top-0 z-[100] h-[73px] w-full transition-transform duration-300`}
      style={{ transform: isHeaderHidden ? 'translateY(-100%)' : 'translateY(0)' }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center px-5 xl:pl-[36px] xl:pr-[57px]">
        <Link to="/" onClick={handleLogoClick} aria-label="Volver al inicio de MangaMukai" className="relative -top-px shrink-0 xl:w-[276px]">
          <span className="block select-none whitespace-nowrap font-montserrat text-[24px] font-black uppercase italic leading-5 text-ink xl:text-[30px]">
            MANGA<span className="text-mukai-magenta">MUKAI</span>
          </span>
        </Link>

        <nav aria-label="Secciones" className="ml-6 flex items-center gap-3 whitespace-nowrap xl:ml-0 xl:gap-8">
          {DESKTOP_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="whitespace-nowrap font-anta text-[13px] font-normal text-ink transition-colors hover:text-[#ff4a7d] xl:text-[15px]">{label}</Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center">
          <button type="button" onClick={openSearch} aria-label="Buscar mangas" title="Buscar mangas" className={desktopIconClass}>
            <SearchLensIcon size={20.16} />
          </button>
          <button
            type="button"
            onClick={() => setIsTimerModalOpen(!isTimerModalOpen)}
            aria-label="Abrir temporizador"
            title="Abrir temporizador"
            className={`${desktopIconClass} ml-3 xl:ml-4 ${isTimerActive ? '!text-[#ff4a7d]' : ''}`}
          >
            {/* Más pequeña que la lupa y el tema para verse del mismo tamaño; el desplazamiento compensa el margen interno de su SVG. */}
            <AlarmIcon size={18.48} className={`-translate-x-[0.35px] translate-y-[0.4px] ${isTimerActive ? 'animate-pulse' : ''}`} />
            {isTimerActive && <span className="absolute -right-1 -top-1 h-2 w-2 animate-ping rounded-full border border-[#02040a] bg-[#ff4a7d]" />}
          </button>
          <button
            type="button"
            onClick={handleThemeToggle}
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            className={`${desktopIconClass} ml-3 xl:ml-[17px]`}
          >
            {theme === 'light' ? <MoonIcon size={23.52} /> : <SunIcon size={23.52} />}
          </button>

          <div className="ml-3 flex w-[209px] shrink-0 items-center justify-end xl:ml-6">
            {currentUser ? (
              <div className="flex items-center gap-4">
                {/* ── Monedas ── */}
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
                {/* ── Perfil (menú) y notificaciones ── */}
                <div className="relative flex items-center gap-1" ref={userMenuRef}>
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
                  <button type="button" onClick={() => { setShowNotifications((value) => !value); setShowUserMenu(false); }} aria-label="Abrir notificaciones" aria-expanded={showNotifications} className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${headerUsesDarkText ? 'text-black hover:bg-black/5 hover:text-[#ff4a7d]' : 'text-white hover:bg-white/10 hover:text-[#ff4a7d]'}`}>
                    <BellGlyph size={26} />
                    {unreadNotifications > 0 && <span aria-label={`${unreadNotifications} sin leer`} className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ${headerUsesDarkText ? 'ring-white' : 'ring-black'}`} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-[11px]">
                <Link to="/auth/login" onPointerEnter={prefetchAuth} onFocus={prefetchAuth} className="flex h-8 w-[99px] items-center justify-center rounded-md bg-mukai-magenta font-montserrat text-xs font-semibold text-white shadow-[0_2px_4px_rgba(0,0,0,0.31)] transition hover:brightness-110">Iniciar Sesión</Link>
                <Link to="/auth/register" onPointerEnter={prefetchAuth} onFocus={prefetchAuth} className="flex h-8 w-[99px] items-center justify-center rounded-md border border-[#828282] font-montserrat text-xs font-semibold text-ink shadow-[0_2px_4px_rgba(0,0,0,0.31)] transition-colors hover:border-ink">Crear cuenta</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
