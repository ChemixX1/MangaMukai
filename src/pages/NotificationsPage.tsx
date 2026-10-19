import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobileViewport } from '../hooks/useIsMobileViewport';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { NotificationCard, notificationRoute } from '../components/social/NotificationCard';
import { getStoredToken } from '../services/authService';
import {
  getCachedNotifications,
  getNotifications,
  markNotificationsRead,
  SOCIAL_REFRESH_EVENT,
  type SocialNotification,
} from '../services/socialService';

/** Acento de la sección: el rosa de la marca con un mínimo de rojo. */
const ACCENT = '#ff4a7d';

/**
 * Notificaciones (sustituye al panel en móvil). Va sin navbar: solo la X de
 * cerrar y la lista. Con `embedded` se pinta dentro del panel deslizante de la
 * campana (NotificationsOverlay): la X cierra el panel en vez de navegar.
 */
export const NotificationsPage = ({ embedded = false, onClose }: { embedded?: boolean; onClose?: () => void }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isMobile = useIsMobileViewport();
  const loadingRequest = useRef(false);
  // Arranca con la última respuesta del navbar (si la hay) y refresca en segundo plano.
  const [notifications, setNotifications] = useState<SocialNotification[]>(() => getCachedNotifications() || []);
  const [loading, setLoading] = useState(() => getCachedNotifications() === null);
  const [error, setError] = useState('');

  useDocumentTitle('Notificaciones');

  useEffect(() => {
    if (!embedded && !getStoredToken()) navigate('/auth/login', { replace: true, state: { returnTo: '/notificaciones' } });
  }, [embedded, navigate]);

  const load = useCallback(async () => {
    if (loadingRequest.current || !getStoredToken()) return;
    loadingRequest.current = true;
    try {
      const result = await getNotifications();
      if (isMobile && result.unread > 0) {
        await markNotificationsRead();
        result.notifications = result.notifications.map((item) => ({ ...item, read: true }));
        window.dispatchEvent(new Event(SOCIAL_REFRESH_EVENT));
      }
      setNotifications(result.notifications);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las notificaciones.');
    } finally {
      loadingRequest.current = false;
      setLoading(false);
    }
  }, [isMobile]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 30000);
    const refresh = () => { void load(); };
    window.addEventListener(SOCIAL_REFRESH_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener(SOCIAL_REFRESH_EVENT, refresh); window.removeEventListener('focus', refresh); };
  }, [load]);

  const notifyNavbar = () => window.dispatchEvent(new Event(SOCIAL_REFRESH_EVENT));

  /* Los botones de las tarjetas son enlaces: aquí solo se marca como leída. */
  const open = (notification: SocialNotification) => {
    if (notification.read) return;
    void markNotificationsRead(notification.id).then(notifyNavbar).catch(() => undefined);
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
  };

  const openCard = (notification: SocialNotification) => {
    open(notification);
    navigate(notificationRoute(notification));
  };

  const markAll = async () => {
    await markNotificationsRead().catch(() => undefined);
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    notifyNavbar();
  };

  const unread = notifications.filter((item) => !item.read).length;
  const divider = isLight ? 'border-black/10' : 'border-white/10';
  const hover = isLight ? 'hover:bg-black/5' : 'hover:bg-white/[0.06]';

  return (
    <main className={`${embedded ? 'min-h-full' : 'min-h-screen'} pt-[env(safe-area-inset-top)] transition-colors ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}>
      <div className={`mx-auto w-full max-w-2xl lg:border-x ${divider}`}>
        <header className={`flex h-14 items-center gap-2 border-b px-2 sm:px-3 ${divider}`}>
          <button type="button" onClick={() => (embedded && onClose ? onClose() : navigate(-1))} aria-label="Cerrar" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${hover}`}><X size={24} strokeWidth={2.5} /></button>
          <h1 className="flex min-w-0 flex-1 items-center gap-2 font-[Montserrat] text-lg font-bold tracking-tight">
            Notificaciones
            {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white" style={{ backgroundColor: ACCENT }}>{unread}</span>}
          </h1>
          {!isMobile && unread > 0 && (
            <button type="button" onClick={() => void markAll()} aria-label="Marcar todas como leídas" className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold ${hover}`} style={{ color: ACCENT }}>
              <CheckCheck size={16} /> Leído
            </button>
          )}
        </header>

        {error && <p role="alert" className="px-4 pt-3 text-xs text-red-500">{error} <button type="button" onClick={() => void load()} className="underline">Reintentar</button></p>}

        {/* Mientras carga no se pinta nada; el vacío solo cuando ya se sabe que no hay novedades. */}
        {loading && notifications.length === 0 ? null : notifications.length === 0 ? (
          <div className="px-8 py-20 text-center">
            <Bell size={34} className={`mx-auto mb-3 ${isLight ? 'text-black/20' : 'text-white/20'}`} />
            <p className="text-base font-bold">Estás al día 😎</p>
          </div>
        ) : (
          <ul className="space-y-3 px-4 py-4">
            {notifications.map((notification) => (
              <li key={notification.id}>
                {/* Toda la tarjeta lleva al destino; el botón interior marca leída además. */}
                <div role="link" tabIndex={0} onClick={() => openCard(notification)} onKeyDown={(event) => { if (event.key === 'Enter') openCard(notification); }} className="cursor-pointer">
                  <NotificationCard notification={notification} onOpen={(item) => { open(item); }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default NotificationsPage;
