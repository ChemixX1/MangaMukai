import { useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  BadgeCheck,
  ChevronRight,
  Crown,
  Info,
  LogIn,
  LogOut,
  Mail,
  Moon,
  Scale,
  Sun,
  X,
  User as UserIcon,
  UserPlus,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { OPEN_TIMER_EVENT } from '../components/layout/Navbar';
import { AUTH_CHANGED_EVENT, clearAuth, getStoredToken, getStoredUser, type MMUser } from '../services/authService';
import { getPublicProfile } from '../services/socialService';
import { readerRankName } from '../utils/readerRank';
import { openSubscriptionModal } from '../utils/subscriptionModal';
import { CoinsStack, EditPencilGlyph } from '../components/common/BrandIcons';
import { lockPageScroll } from '../utils/scrollLock';
import { isPlaceholderAvatar } from '../services/wordpressService';
import { MoreLibraryTabs } from '../components/social/MoreLibraryTabs';
import profileBanner from '../assets/banners/illustration-anime-character-rain.jpg';

type Row = {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  to?: string;
  onClick?: () => void;
  /** Cifra a la derecha (guardados, monedas, sin leer…). */
  value?: string | number;
  accent?: string;
  /** En el panel lateral: no cerrarlo al tocar la fila (p. ej. cambiar el tema). */
  keepOpen?: boolean;
};

const formatCount = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K` : String(value));

const isPremiumUser = (user: MMUser | null) => Boolean(user?.isPremium || user?.is_premium);

/* La biografía se muestra recortada a este largo bajo las cifras. */
const BIO_MAX_LENGTH = 160;
const clampBio = (value: string) => (value.length > BIO_MAX_LENGTH ? `${value.slice(0, BIO_MAX_LENGTH - 1).trimEnd()}…` : value);

/**
 * Página "Más" (móvil), con estructura de perfil: banner, foto y usuario,
 * tres cifras (seguidores, rango, capítulos leídos) y grupos de opciones con
 * su cifra a la derecha (cuenta) y las pestañas Post · Guardado · Me gusta ·
 * Leyendo. Ajustes, enlaces del sitio y cerrar sesión están en el panel
 * lateral "Recursos" (botón de la esquina); mensajes y notificaciones no van
 * aquí: ya tienen su pestaña y su campana.
 */
export const MorePage = () => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const [user, setUser] = useState<MMUser | null>(() => (getStoredToken() ? getStoredUser() : null));
  const [followers, setFollowers] = useState(0);
  const [chaptersRead, setChaptersRead] = useState(0);
  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useDocumentTitle('Más');

  useEffect(() => {
    const sync = () => setUser(getStoredToken() ? getStoredUser() : null);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  // Seguidores y capítulos leídos salen del perfil social; el rango se deriva de los capítulos.
  useEffect(() => {
    if (!user) {
      setFollowers(0);
      setChaptersRead(0);
      setBio('');
      setBannerUrl('');
      return;
    }
    let active = true;
    void getPublicProfile(user.id)
      .then((profile) => {
        if (!active) return;
        setFollowers(profile.followers_count ?? 0);
        setChaptersRead(profile.chapters_read_count ?? 0);
        setBio((profile.bio || '').trim());
        setBannerUrl(profile.banner_url || '');
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!menuOpen) return;
    const release = lockPageScroll();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { release(); window.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  const logout = () => {
    // Recarga completa para no dejar en memoria nada de la cuenta (monedas, guardados, mensajes).
    void clearAuth().finally(() => window.location.reload());
  };

  const premium = isPremiumUser(user);
  const card = isLight ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'bg-[#121216]';
  const muted = isLight ? 'text-black/45' : 'text-white/45';
  const rowHover = isLight ? 'hover:bg-black/[0.03]' : 'hover:bg-white/[0.05]';
  const divide = isLight ? 'divide-black/[0.06]' : 'divide-white/[0.06]';

  const account: Row[] = [
    { key: 'coins', label: 'Recargar monedas', icon: CoinsStack, to: '/recargar', value: user?.coins ?? 0, accent: '#D99A16' },
    { key: 'subscription', label: premium ? 'Mukai PRO' : 'Suscripción Mukai PRO', icon: Crown, onClick: openSubscriptionModal, value: premium ? 'Activa' : undefined, accent: '#FF4D88' },
  ];

  // Panel lateral "Recursos" (botón de la esquina): opciones agrupadas por clase.
  const menuGroups: Array<{ label: string; rows: Row[] }> = [
    { label: 'Ajustes', rows: [
      { key: 'timer', label: 'Alarma de lectura', icon: AlarmClock, onClick: () => window.dispatchEvent(new Event(OPEN_TIMER_EVENT)) },
      { key: 'theme', label: 'Tema', icon: isLight ? Sun : Moon, onClick: toggleTheme, value: isLight ? 'Claro' : 'Oscuro', keepOpen: true },
    ] },
    { label: 'Social', rows: [{ key: 'about', label: 'Nosotros', icon: Info, to: '/nosotros' }] },
    { label: 'Ayuda y soporte', rows: [{ key: 'contact', label: 'Contacto', icon: Mail, to: '/contacto' }] },
    { label: 'Privacidad', rows: [{ key: 'legal', label: 'Términos y privacidad', icon: Scale, to: '/legal' }] },
    ...(user ? [{ label: 'Cuenta', rows: [{ key: 'logout', label: 'Cerrar sesión', icon: LogOut, onClick: logout, accent: '#ff3b5c' } satisfies Row] }] : []),
  ];

  const renderRow = (row: Row) => {
    const Icon = row.icon;
    const content = (
      <>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${row.accent || (isLight ? '#000000' : '#ffffff')}14`, color: row.accent || (isLight ? '#000' : '#fff') }}>
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1 truncate font-[Montserrat] text-[14px] font-semibold">{row.label}</span>
        {row.value !== undefined && (
          <span className={`font-[Montserrat] text-[13px] font-semibold tabular-nums ${muted}`}>
            {typeof row.value === 'number' ? formatCount(row.value) : row.value}
          </span>
        )}
        <ChevronRight size={16} className={muted} />
      </>
    );
    const className = `flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${rowHover}`;
    return row.to
      ? <Link key={row.key} to={row.to} onClick={() => setMenuOpen(false)} className={className}>{content}</Link>
      : <button key={row.key} type="button" onClick={() => { if (!row.keepOpen) setMenuOpen(false); row.onClick?.(); }} className={className}>{content}</button>;
  };

  const group = (label: string, rows: Row[]) => (
    <section aria-label={label} className={`mt-4 divide-y overflow-hidden rounded-2xl ${card} ${divide}`}>
      {rows.map(renderRow)}
    </section>
  );

  return (
    <main className={`min-h-screen transition-colors ${isLight ? 'bg-[#f4f4f5] text-black' : 'bg-black text-white'}`}>
      <h1 className="sr-only">Más</h1>

      {/* Banner a sangre con la foto y el usuario montados sobre su borde inferior. */}
      <div className="relative">
        <div className="relative h-[240px] w-full overflow-hidden">
          <img src={bannerUrl || profileBanner} alt="" aria-hidden="true" className="h-full w-full object-cover object-[center_30%]" />
          <div className={`absolute inset-0 bg-gradient-to-b from-black/10 via-transparent ${isLight ? 'to-[#f4f4f5]' : 'to-black'}`} />
        </div>
        {/* Botón cuadrado pegado a la esquina: tres líneas discontinuas; abre el panel lateral. */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir recursos"
          aria-expanded={menuOpen}
          aria-controls="more-menu"
          className="absolute right-0 top-[env(safe-area-inset-top)] flex h-12 w-12 items-center justify-center rounded-bl-2xl bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/65"
        >
          {/* Tres líneas alineadas a la derecha, cada una más corta que la anterior, con trazo grueso. */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h18M10 12h11M15.5 18h5.5" />
          </svg>
        </button>

        {/* Posicionado para pintarse encima del banner (que es relative). */}
        <div className="relative z-10 mx-auto -mt-14 flex w-full max-w-2xl items-start gap-4 px-5">
          <span className={`shrink-0 rounded-full p-[3px] ${isLight ? 'bg-[#f4f4f5]' : 'bg-black'}`}>
            {user?.avatar && !isPlaceholderAvatar(user.avatar)
              ? <img src={user.avatar} alt="" className="h-24 w-24 rounded-full object-cover" />
              : <span className={`flex h-24 w-24 items-center justify-center rounded-full ${isLight ? 'bg-black/[0.08] text-black/60' : 'bg-white/10 text-white/70'}`}><UserIcon size={38} /></span>}
          </span>
          {/* Nombre y @ a la izquierda; a la derecha el lápiz de editar perfil sobre Hazte PRO; debajo, las cifras. */}
          <div className="min-w-0 flex-1 pt-0">
            {user ? (
              <>
                <div className="flex items-start gap-3">
                  {/* El nombre y el @usuario llevan al perfil (el engranaje ya no). */}
                  <Link to="/perfil" className="block min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-[Montserrat] text-[22px] font-bold leading-tight">
                      <span className="truncate">{user.display_name || user.username}</span>
                      {premium && <BadgeCheck size={20} className="shrink-0 fill-[#1d9bf0] text-white" aria-label="Cuenta PRO" />}
                    </p>
                    <p className={`truncate font-[Montserrat] text-[13px] font-semibold ${muted}`}>@{user.username}</p>
                  </Link>
                  {/* Lápiz y Hazte PRO alineados a la derecha y algo más arriba que el nombre. */}
                  <div className="-mt-9 flex shrink-0 flex-col items-end gap-1">
                    <Link to="/perfil/editar" aria-label="Editar perfil" title="Editar perfil" className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isLight ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}>
                      <EditPencilGlyph size={30} />
                    </Link>
                    <button
                      type="button"
                      onClick={openSubscriptionModal}
                      className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#ffd95a] via-[#f5c032] to-[#e8ad1c] px-2.5 py-2 font-[Montserrat] text-[11px] font-bold text-[#5a4200] transition-transform hover:-translate-y-px"
                    >
                      <Crown size={13} strokeWidth={2.6} className="animate-bounce" /> {premium ? 'Mukai PRO' : 'Hazte PRO'}
                    </button>
                  </div>
                </div>
                {/* Seguidores · Rango · Leídos (capítulos): sin recuadro, Montserrat medium, cada cifra alineada a la izquierda con su texto. */}
                <section aria-label="Resumen de la cuenta" className="mt-4 flex items-start justify-between gap-3 pr-1">
                  {[
                    { label: 'Seguidores', value: formatCount(followers) },
                    { label: 'Rango', value: readerRankName(chaptersRead) },
                    { label: 'Leídos', value: formatCount(chaptersRead) },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-left">
                      <p className="font-[Montserrat] text-[15px] font-semibold leading-none tabular-nums">{value}</p>
                      <p className={`-mt-px font-[Montserrat] text-[11px] font-normal leading-tight ${muted}`}>{label}</p>
                    </div>
                  ))}
                </section>
                {/* Biografía (máx. 160 caracteres), del borde de "Seguidores" al de "Leídos"; sin texto, "No bio yet". */}
                <p className={`mt-4 whitespace-pre-line pr-1 font-[Montserrat] text-[13px] font-normal leading-snug ${isLight ? 'text-black' : 'text-white'}`}>
                  {bio ? clampBio(bio) : 'No bio yet'}
                </p>
              </>
            ) : (
              <>
                <p className="font-[Montserrat] text-[19px] font-bold leading-tight">Bienvenido a MangaMukai</p>
                <p className={`font-[Montserrat] text-[12px] font-semibold ${muted}`}>Inicia sesión para guardar, chatear y comprar capítulos.</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pb-10">
        {!user && (
          <section aria-label="Acceso" className="mt-5 grid grid-cols-2 gap-2">
            <Link to="/auth/login" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF4D88] font-[Montserrat] text-[13px] font-bold text-white transition-colors hover:bg-[#ff347b]">
              <LogIn size={16} /> Iniciar sesión
            </Link>
            <Link to="/auth/register" className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl font-[Montserrat] text-[13px] font-bold transition-colors ${card} ${isLight ? 'hover:bg-zinc-50' : 'hover:bg-white/[0.06]'}`}>
              <UserPlus size={16} /> Crear cuenta
            </Link>
          </section>
        )}

        {user && group('Cuenta', account)}
        {user && <MoreLibraryTabs user={user} isLight={isLight} />}
      </div>

      {/* Panel lateral: entra desde la derecha como un abanico y se cierra tocando fuera, la X o Escape. */}
      <div
        className={`fixed inset-0 z-[120] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="more-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Recursos"
        aria-hidden={!menuOpen}
        className={`fixed inset-y-0 right-0 z-[121] flex w-[78%] max-w-xs origin-right flex-col pt-[env(safe-area-inset-top)] shadow-[-16px_0_40px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-[cubic-bezier(.22,.9,.3,1)] ${menuOpen ? 'translate-x-0' : 'translate-x-full'} ${isLight ? 'bg-white text-black' : 'bg-[#0b0b0e] text-white'}`}
      >
        <div className={`flex h-14 items-center justify-between border-b px-4 ${isLight ? 'border-black/[0.06]' : 'border-white/[0.08]'}`}>
          <p className="font-[Montserrat] text-[14px] font-semibold">Recursos</p>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar" className={`-mr-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}>
            <X size={22} strokeWidth={2.4} />
          </button>
        </div>
        <nav aria-label="Opciones" className="overflow-y-auto pb-6">
          {menuGroups.map((group) => (
            <div key={group.label} className="mt-4">
              <p className={`px-4 pb-1 font-[Montserrat] text-[11px] font-normal uppercase tracking-[0.12em] ${muted}`}>{group.label}</p>
              <div className={`divide-y ${divide}`}>{group.rows.map(renderRow)}</div>
            </div>
          ))}
        </nav>
      </aside>
    </main>
  );
};

export default MorePage;
