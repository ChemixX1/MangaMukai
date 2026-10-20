import { Link, useLocation } from 'react-router-dom';
import { isMobileSectionRoute } from '../../utils/mobileSections';
import { useHideOnScrollDown } from '../../hooks/useHideOnScrollDown';

interface IconProps { active: boolean }

const base = { width: 24, height: 23, viewBox: '0 0 24 24', preserveAspectRatio: 'none', 'aria-hidden': true as const };

const BookIcon = ({ active }: IconProps) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3.5h10a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" fill={active ? 'currentColor' : 'none'} />
    <path d="M12 3.5v7l2-1.6 2 1.6v-7" fill={active ? 'var(--tabbar-bg)' : 'none'} stroke={active ? 'var(--tabbar-bg)' : 'currentColor'} />
    <path d="M20.5 7v13.5a1 1 0 0 1-1 1H8" />
  </svg>
);

const FLAME_PATH = 'M150 25 C165 45 185 55 205 85 C215 100 218 115 214 130 C228 112 225 95 222 82 C255 108 270 145 264 180 C258 220 232 250 205 270 C218 235 212 200 195 171 C182 149 167 135 155 126 C158 154 150 177 137 194 C140 172 134 157 127 146 C122 177 108 194 98 210 C86 229 86 248 96 270 C58 247 35 216 34 178 C33 148 50 120 62 94 C66 106 71 119 72 133 C108 100 138 67 150 25 Z';
const FlameIcon = ({ active }: IconProps) => (
  <svg width={24} height={23} viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">

    <path d={FLAME_PATH} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 18} strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

const BagIcon = ({ active }: IconProps) => (
  <svg {...base} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8h14l.8 12.3a1 1 0 0 1-1 1.1H5.2a1 1 0 0 1-1-1.1z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" />
  </svg>
);

const BubbleIcon = ({ active }: IconProps) => (
  <svg {...base} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.5 4h9A3.5 3.5 0 0 1 20 7.5v6a3.5 3.5 0 0 1-3.5 3.5H10l-2.6 2.6c-.4.4-1.1.1-1.1-.5V17A3.5 3.5 0 0 1 4 13.5v-6A3.5 3.5 0 0 1 7.5 4z" />
  </svg>
);

const MoreIcon = ({ active }: IconProps) => (
  <svg {...base} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.6" />
    <rect x="14" y="3" width="7" height="7" rx="1.6" />
    <rect x="3" y="14" width="7" height="7" rx="1.6" />
    <rect x="14" y="14" width="7" height="7" rx="1.6" />
  </svg>
);

const TABS = [
  { key: 'mangas', label: 'Mangas', to: '/', Icon: BookIcon, match: (path: string) => path === '/' || path.startsWith('/manga') || path.startsWith('/read/') },
  { key: 'character', label: 'Character', to: '/chat', Icon: FlameIcon, match: (path: string) => path.startsWith('/chat') },
  { key: 'tienda', label: 'Tienda', to: '/tienda', Icon: BagIcon, match: (path: string) => path.startsWith('/tienda') },

  { key: 'chat', label: 'Chat', to: '/comunidad', Icon: BubbleIcon, match: (path: string) => path.startsWith('/comunidad') || path.startsWith('/mensajes') },
  { key: 'more', label: 'Más', to: '/profile', Icon: MoreIcon, match: (path: string) => path.startsWith('/profile') },
] as const;

export const MobileTabBar = () => {
  const { pathname } = useLocation();
  const hidden = useHideOnScrollDown();

  if (pathname.startsWith('/read/') || pathname.startsWith('/comunidad/publicacion/') || /^\/usuarios\/[^/]+\/publicacion\/[^/]+$/.test(pathname) || /^\/chat\/.+/.test(pathname) || pathname === '/perfil/editar' || isMobileSectionRoute(pathname)) return null;

  const labelClass = (active: boolean) => `flex h-full w-full flex-col items-center justify-center gap-1.5 pb-0.5 font-[Montserrat] text-[10px] leading-none transition-colors ${active ? 'font-bold text-black dark:text-white' : 'font-semibold text-[#262626] dark:text-[#e4e4e7]'}`;

  return (
    <nav
      aria-label="Navegación inferior"
      className="mobile-tabbar fixed inset-x-0 bottom-0 z-[95] border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] text-black transition-transform duration-300 [--tabbar-bg:#fff] dark:border-white/10 dark:bg-black dark:text-white dark:[--tabbar-bg:#000] lg:hidden"
      style={{ transform: hidden ? 'translateY(100%)' : 'translateY(0)' }}
    >

      <ul className="mx-auto grid h-[64px] w-full max-w-md grid-cols-5 px-4">
        {TABS.map(({ key, label, to, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={key} className="min-w-0">
              <Link to={to} aria-current={active ? 'page' : undefined} className={labelClass(active)}>
                <Icon active={active} />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
