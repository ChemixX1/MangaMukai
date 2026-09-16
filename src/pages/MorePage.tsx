import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlarmClock,
  Bookmark,
  ChevronRight,
  Coins,
  Contrast,
  Crown,
  Flame,
  Info,
  LogIn,
  LogOut,
  Mail,
  Moon,
  Scale,
  Sun,
  User as UserIcon,
  UserPlus,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { OPEN_TIMER_EVENT } from '../components/layout/Navbar';
import { AUTH_CHANGED_EVENT, clearAuth, getStoredToken, getStoredUser, type MMUser } from '../services/authService';
import { openSubscriptionModal } from '../utils/subscriptionModal';

type Row = {
  key: string;
  label: string;
  icon: typeof Bookmark;
  to?: string;
  onClick?: () => void;
  badge?: number;
  accent?: string;
  trailing?: 'chevron' | 'switch';
  on?: boolean;
};

/**
 * Página "Más" (móvil): reúne lo que antes colgaba del icono de perfil y del
 * menú de hamburguesa: cuenta, colecciones B&N y +19, alarma, tema, recargas,
 * suscripción, redes y enlaces del sitio.
 */
export const MorePage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const [user, setUser] = useState<MMUser | null>(() => (getStoredToken() ? getStoredUser() : null));

  useDocumentTitle('Más');

  useEffect(() => {
    const sync = () => setUser(getStoredToken() ? getStoredUser() : null);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  const logout = () => {
    // Recarga completa para no dejar en memoria nada de la cuenta (monedas, guardados, mensajes).
    void clearAuth().finally(() => window.location.reload());
  };

  const card = isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-[#0b0b0e]';
  const muted = isLight ? 'text-black/50' : 'text-white/50';
  const rowHover = isLight ? 'hover:bg-black/[0.04]' : 'hover:bg-white/[0.06]';

  const account: Row[] = user ? [
    { key: 'profile', label: 'Mi perfil', icon: UserIcon, to: '/perfil' },
    { key: 'saved', label: 'Guardados', icon: Bookmark, to: '/saved' },
    { key: 'coins', label: 'Recargar monedas', icon: Coins, to: '/recargar', accent: '#D99A16' },
    { key: 'subscription', label: 'Suscripción Mukai PRO', icon: Crown, onClick: openSubscriptionModal, accent: '#FF4D88' },
  ] : [
    { key: 'login', label: 'Iniciar sesión', icon: LogIn, to: '/auth/login', accent: '#FF4D88' },
    { key: 'register', label: 'Crear cuenta', icon: UserPlus, to: '/auth/register' },
  ];

  const explore: Row[] = [
    { key: 'bn', label: 'Mangas B&N', icon: Contrast, to: '/manga-bn' },
    { key: 'hot', label: 'Mangas +19', icon: Flame, to: '/manga-19', accent: '#FF4D88' },
  ];

  const tools: Row[] = [
    { key: 'timer', label: 'Alarma de lectura', icon: AlarmClock, onClick: () => window.dispatchEvent(new Event(OPEN_TIMER_EVENT)) },
    { key: 'theme', label: isLight ? 'Modo oscuro' : 'Modo claro', icon: isLight ? Moon : Sun, onClick: toggleTheme, trailing: 'switch', on: !isLight },
  ];

  const site: Row[] = [
    { key: 'about', label: 'Nosotros', icon: Info, to: '/nosotros' },
    { key: 'contact', label: 'Contacto', icon: Mail, to: '/contacto' },
    { key: 'legal', label: 'Términos y privacidad', icon: Scale, to: '/legal' },
  ];

  const renderRow = (row: Row) => {
    const Icon = row.icon;
    const content = (
      <>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${row.accent || (isLight ? '#000000' : '#ffffff')}14`, color: row.accent || (isLight ? '#000' : '#fff') }}>
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1 truncate font-[Montserrat] text-[14px] font-semibold">{row.label}</span>
        {row.badge ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF4D88] px-1.5 text-[10px] font-black text-white">{Math.min(99, row.badge)}</span> : null}
        {row.trailing === 'switch' ? (
          <span role="switch" aria-checked={row.on} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${row.on ? 'bg-[#FF4D88]' : isLight ? 'bg-black/15' : 'bg-white/20'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${row.on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </span>
        ) : <ChevronRight size={16} className={muted} />}
      </>
    );
    const className = `flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${rowHover}`;
    return row.to
      ? <Link key={row.key} to={row.to} className={className}>{content}</Link>
      : <button key={row.key} type="button" onClick={row.onClick} className={className}>{content}</button>;
  };

  const section = (title: string, rows: Row[]) => (
    <section aria-label={title} className="mt-5">
      <h2 className={`mb-2 px-1 font-[Montserrat] text-[11px] font-bold uppercase tracking-[0.18em] ${muted}`}>{title}</h2>
      <div className={`divide-y overflow-hidden rounded-2xl border ${card} ${isLight ? 'divide-black/[0.06]' : 'divide-white/[0.06]'}`}>
        {rows.map(renderRow)}
      </div>
    </section>
  );

  return (
    <main className={`min-h-screen pt-16 transition-colors ${isLight ? 'bg-[#f4f4f5] text-black' : 'bg-black text-white'}`}>
      <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4">
        <h1 className="sr-only">Más</h1>

        {/* Tarjeta de cuenta */}
        <div className={`flex items-center gap-3 rounded-2xl border p-4 ${card}`}>
          {user?.avatar
            ? <img src={user.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
            : <span className={`flex h-14 w-14 items-center justify-center rounded-full ${isLight ? 'bg-black/[0.06]' : 'bg-white/10'}`}><UserIcon size={24} /></span>}
          <div className="min-w-0 flex-1">
            {user ? (
              <>
                <p className="truncate font-[Montserrat] text-[15px] font-bold uppercase tracking-[0.03em]">{user.username}</p>
                <p className={`truncate font-[Montserrat] text-[11px] font-semibold ${muted}`}>{user.email}</p>
                <button type="button" onClick={() => navigate('/recargar')} className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#FFC53D]/15 px-2.5 py-1 font-[Montserrat] text-[12px] font-bold text-[#D99A16]">
                  <Coins size={13} strokeWidth={2.6} /> {user.coins ?? 0} monedas
                </button>
              </>
            ) : (
              <>
                <p className="font-[Montserrat] text-[15px] font-bold">Bienvenido a MangaMukai</p>
                <p className={`font-[Montserrat] text-[12px] font-semibold ${muted}`}>Inicia sesión para guardar, chatear y comprar capítulos.</p>
              </>
            )}
          </div>
        </div>

        {section('Cuenta', account)}
        {section('Explorar', explore)}
        {section('Herramientas', tools)}
        {section('MangaMukai', site)}

        {user && (
          <button type="button" onClick={logout} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 font-[Montserrat] text-[13px] font-bold uppercase tracking-[0.04em] text-red-500 transition-colors hover:bg-red-500/10 ${card}`}>
            <LogOut size={17} /> Cerrar sesión
          </button>
        )}

      </div>
    </main>
  );
};

export default MorePage;
