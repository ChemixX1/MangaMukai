import { PremiumElectricBorder } from '../ui/PremiumElectricBorder';
import { prefetchRoute } from '../../utils/prefetchRoute';
import { User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import coins1000 from '../../assets/recharge/icon-2.svg';
import { BellGlyph } from '../common';
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
  const { theme, currentUser, isNotificationsOpen, openNotifications, prefetchNotifications, closeNotificationsOverlay, unreadNotifications, isHeaderHidden, headerUsesDarkText, openSearch, prefetchSearch, isTimerModalOpen, setIsTimerModalOpen, isTimerActive, handleThemeToggle, goToRecharge, handleLogoClick, desktopIconClass } = model;
  const premium = Boolean(currentUser?.isPremium || currentUser?.is_premium);
  return (<header
      className="fixed site-navbar-surface site-navbar-desktop left-0 top-0 z-[100] h-[73px] w-full transition-transform duration-300"
      data-manga-detail={/^\/manga\/[^/]+/.test(model.location.pathname) || undefined}
      data-hidden={isHeaderHidden || undefined}
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
            <Link key={to} to={to} className="whitespace-nowrap font-koho text-[14px] font-semibold tracking-wide text-ink transition-transform duration-200 hover:scale-105 motion-reduce:transition-none xl:text-[16px]">{label}</Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center">
          <button type="button" onClick={openSearch} onPointerEnter={prefetchSearch} onFocus={prefetchSearch} aria-label="Buscar mangas" title="Buscar mangas" className={desktopIconClass}>
            <SearchLensIcon size={20.16} />
          </button>
          <button
            type="button"
            onClick={() => setIsTimerModalOpen(!isTimerModalOpen)}
            aria-label="Abrir temporizador"
            title="Abrir temporizador"
            className={`${desktopIconClass} ml-3 xl:ml-4 ${isTimerActive ? '!text-[#ff4a7d]' : ''}`}
          >

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

          <div className={`ml-3 flex shrink-0 items-center justify-end ${currentUser ? 'w-auto xl:ml-3' : 'w-[209px] xl:ml-6'}`}>
            {currentUser ? (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onPointerEnter={() => prefetchRoute('/recargar')}
                  onFocus={() => prefetchRoute('/recargar')}
                  onClick={() => goToRecharge()}
                  aria-label={`Abrir mercado de monedas. Saldo: ${currentUser.coins ?? 0}`}
                  title="Abrir mercado de monedas"
                  className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all duration-200 hover:-translate-y-px ${headerUsesDarkText ? 'bg-[#f1f1f4] text-zinc-900 hover:bg-[#e6e6eb]' : 'bg-[#232328] text-white hover:bg-[#2d2d34]'}`}
                >
                  <img src={coins1000} alt="" aria-hidden="true" className="h-[23px] w-[27px] object-contain transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95" />
                  <span className="font-[Montserrat] text-[15px] font-bold leading-none transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95">{currentUser.coins ?? 0}</span>
                </button>
                <div className="flex items-center gap-3">
                  <Link
                    to="/profile"
                    onClick={closeNotificationsOverlay}
                    aria-label={`Abrir perfil de ${currentUser.username}`}
                    title={currentUser.username}
                    className={`premium-avatar-frame ${premium ? 'premium-avatar-frame--active' : ''} flex h-10 w-10 items-center justify-center rounded-full bg-transparent transition-[transform,color] duration-200 ease-out hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none ${headerUsesDarkText ? 'text-black hover:text-[#ff4a7d]' : 'text-white hover:text-[#ff4a7d]'}`}
                  >
                    {currentUser.avatar ? <img src={currentUser.avatar} alt={`Foto de perfil de ${currentUser.username}`} className="h-10 w-10 rounded-full object-cover" /> : <UserIcon size={28} />}
                    {premium && <PremiumElectricBorder />}
                  </Link>
                  <span aria-hidden="true" className={`h-5 w-px shrink-0 ${headerUsesDarkText ? 'bg-black/15' : 'bg-white/20'}`} />
                  <button type="button" onClick={openNotifications} onPointerEnter={prefetchNotifications} onFocus={prefetchNotifications} aria-label="Abrir notificaciones" aria-haspopup="dialog" aria-expanded={isNotificationsOpen} className={desktopIconClass}>
                    <BellGlyph size={20.16} />
                    {unreadNotifications > 0 && <span aria-label={`${unreadNotifications} sin leer`} className={`absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ${headerUsesDarkText ? 'ring-white' : 'ring-black'}`} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-[11px]">
                <Link to="/auth/login" className="flex h-8 w-[99px] items-center justify-center rounded-md bg-mukai-magenta font-montserrat text-xs font-semibold text-white shadow-[0_2px_4px_rgba(0,0,0,0.31)] transition hover:brightness-110">Iniciar Sesión</Link>
                <Link to="/auth/register" className="flex h-8 w-[99px] items-center justify-center rounded-md border border-[#828282] font-montserrat text-xs font-semibold text-ink shadow-[0_2px_4px_rgba(0,0,0,0.31)] transition-colors hover:border-ink">Crear cuenta</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
