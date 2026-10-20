import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobileViewport } from '../hooks/useIsMobileViewport';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Trash2, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { NotificationCard, notificationRoute } from '../components/social/NotificationCard';
import { getStoredToken } from '../services/authService';
import {
  getCachedNotifications,
  deleteNotifications,
  getNotifications,
  markNotificationsRead,
  SOCIAL_REFRESH_EVENT,
  type SocialNotification,
} from '../services/socialService';

const ACCENT = '#ff4a7d';

export const NotificationsPage = ({ embedded = false, onClose }: { embedded?: boolean; onClose?: () => void }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isMobile = useIsMobileViewport();
  const loadingRequest = useRef(false);
  const clearingRef = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);
  const trashRef = useRef<HTMLButtonElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const mounted = useRef(true);
  const [clearing, setClearing] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; animationsRef.current.forEach(animation => animation.cancel()); };
  }, []);

  const [notifications, setNotifications] = useState<SocialNotification[]>(() => getCachedNotifications() || []);
  const [loading, setLoading] = useState(() => getCachedNotifications() === null);
  const [error, setError] = useState('');

  useDocumentTitle(embedded ? undefined : 'Notificaciones');

  useEffect(() => {
    if (!embedded && !getStoredToken()) navigate('/auth/login', { replace: true, state: { returnTo: '/notificaciones' } });
  }, [embedded, navigate]);

  const load = useCallback(async () => {
    if (loadingRequest.current || clearingRef.current || !getStoredToken()) return;
    loadingRequest.current = true;
    try {
      const result = await getNotifications();
      if (clearingRef.current || !mounted.current) return;
      if (isMobile && result.unread > 0) {
        await markNotificationsRead();
        result.notifications = result.notifications.map((item) => ({ ...item, read: true }));
        window.dispatchEvent(new Event(SOCIAL_REFRESH_EVENT));
      }
      if (clearingRef.current || !mounted.current) return;
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
  const clearAll = async () => {
    if (clearingRef.current || !notifications.length) return;
    clearingRef.current = true;
    setClearing(true);
    setError('');
    const throughId = Math.max(...notifications.map(item => item.id));
    try {
      await deleteNotifications(throughId);
      if (!mounted.current) return;
      const target = trashRef.current?.getBoundingClientRect();
      if (target && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animationsRef.current = Array.from(listRef.current?.children ?? []).map((element, index) => {
          const rect = element.getBoundingClientRect();
          const x = target.left + target.width / 2 - rect.left - rect.width / 2;
          const y = target.top + target.height / 2 - rect.top - rect.height / 2;
          return element.animate([
            { transform: 'scale(1)', opacity: 1, clipPath: 'inset(0 round 24px)', offset: 0 },
            { transform: 'scale(.72, .85) rotate(-5deg) skew(8deg)', opacity: 1, clipPath: 'polygon(4% 12%, 33% 0, 53% 15%, 85% 2%, 100% 30%, 87% 62%, 96% 90%, 60% 100%, 35% 85%, 8% 96%, 0 55%)', offset: .3 },
            { transform: `translate(${x * .3}px, ${y * .25}px) scale(.3, .45) rotate(18deg)`, opacity: .9, offset: .55 },
            { transform: `translate(${x}px, ${y}px) scale(.015) rotate(100deg)`, opacity: 0, clipPath: 'inset(18% round 45%)', offset: 1 },
          ], { duration: 800, delay: Math.min(index * 35, 280), easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });
        });
        await Promise.allSettled(animationsRef.current.map(animation => animation.finished));
      }
      if (mounted.current) setNotifications(current => current.filter(item => item.id > throughId));
    } catch (caught) {
      if (mounted.current) setError(caught instanceof Error ? caught.message : 'No se pudieron borrar las notificaciones.');
    } finally {
      clearingRef.current = false;
      if (mounted.current) { setClearing(false); notifyNavbar(); }
    }
  };
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
            <button type="button" disabled={clearing} onClick={() => void markAll()} aria-label="Marcar todas como leídas" className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold ${hover}`} style={{ color: ACCENT }}>
              <CheckCheck size={16} /> Leído
            </button>
          )}
          <button ref={trashRef} type="button" onClick={() => void clearAll()} disabled={clearing || !notifications.length} aria-label="Borrar todas las notificaciones" title="Borrar todas las notificaciones" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 motion-reduce:transform-none">
            <Trash2 size={21} />
          </button>
        </header>

        {error && <p role="alert" className="px-4 pt-3 text-xs text-red-500">{error} <button type="button" onClick={() => void load()} className="underline">Reintentar</button></p>}


        {loading && notifications.length === 0 ? null : notifications.length === 0 ? (
          <div className="px-8 py-20 text-center">
            <p role="status" className="text-base font-normal" style={{ fontFamily: 'MuseoModerno, sans-serif' }}>Sigue disfrutando de los mejores mangas</p>
          </div>
        ) : (
          <ul ref={listRef} aria-busy={clearing} inert={clearing} className="space-y-3 px-4 py-4">
            {notifications.map((notification) => (
              <li key={notification.id}>

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
