import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Check,
  Heart,
  MessageCircle,
  UserPlus,
  X,
} from 'lucide-react';
import { MukaiLoaderWheel } from '../common/MukaiLoaderWheel';
import {
  getNotifications,
  markNotificationsRead,
  type FriendUser,
  type SocialNotification,
} from '../../services/socialService';

export const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  return `Hace ${Math.floor(seconds / 86400)} d`;
};

export const Avatar = ({ user, size = 'h-10 w-10' }: { user: FriendUser; size?: string }) => user.avatar_url
  ? <img src={user.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-[#FF4D88]/25`} />
  : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#FF4D88] text-sm font-black text-white`}>{user.username.charAt(0).toUpperCase()}</span>;

interface PanelProps {
  isOpen: boolean;
  isLight: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export const describeNotification = (notification: SocialNotification) => {
  const actor = notification.actor?.username || 'Alguien';
  if (notification.type === 'comment_like') return { icon: Heart, text: `${actor} indicó que le gusta tu comentario.` };
  if (notification.type === 'comment_reaction') {
    const reaction = ({ fire: '🔥', love: '❤️', haha: '😂', sad: '😢' } as Record<string, string>)[notification.payload.reaction || ''] || '✨';
    return { icon: Heart, text: `${actor} reaccionó ${reaction} a tu comentario.` };
  }
  if (notification.type === 'comment_reply') return { icon: MessageCircle, text: `${actor} respondió a tu comentario.` };
  if (notification.type === 'post_reaction') return { icon: Heart, text: `${actor} reaccionó a tu publicación.` };
  if (notification.type === 'post_comment') return { icon: MessageCircle, text: `${actor} comentó tu publicación.` };
  if (notification.type === 'post_share') return { icon: MessageCircle, text: `${actor} compartió tu publicación.` };
  if (notification.type === 'chapter_new') return { icon: BookOpen, text: `Nuevo capítulo de ${notification.payload.title || 'un manga que sigues'}.` };
  if (notification.type === 'manga_new') return { icon: BookOpen, text: `Nuevo manga: ${notification.payload.title || 'descúbrelo'}.` };
  if (notification.type === 'follow') return { icon: UserPlus, text: `${actor} empezó a seguirte.` };
  if (notification.type === 'friend_request') return { icon: UserPlus, text: `${actor} te envió una solicitud de amistad.` };
  if (notification.type === 'friend_accepted') return { icon: Check, text: `${actor} aceptó tu solicitud de amistad.` };
  return { icon: BookOpen, text: `${notification.payload.title || 'Un manga guardado'} tiene una actualización.` };
};

/** Ruta a la que lleva una notificación (comentario, manga o perfil de quien la generó). */
export const notificationTarget = (notification: SocialNotification): string | null => {
  const { type, payload } = notification;
  if ((type === 'comment_like' || type === 'comment_reaction' || type === 'comment_reply') && payload.manga_id) return `/manga/${payload.manga_id}#comentarios`;
  if ((type === 'manga_update' || type === 'chapter_new' || type === 'manga_new') && payload.manga_id) return `/manga/${payload.manga_id}`;
  if (type === 'post_reaction' || type === 'post_comment' || type === 'post_share') return '/perfil';
  if (notification.actor) return `/usuarios/${notification.actor.id}`;
  return null;
};

export const NotificationsPanel = ({ isOpen, isLight, onClose, onUnreadChange, onNavigate }: PanelProps & { onNavigate?: () => void }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getNotifications();
      setNotifications(result.notifications);
      onUnreadChange?.(result.unread);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const openNotification = async (notification: SocialNotification) => {
    if (!notification.read) {
      void markNotificationsRead(notification.id).catch(() => undefined);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
      onUnreadChange?.(Math.max(0, notifications.filter((item) => !item.read).length - 1));
    }
    onClose();
    onNavigate?.();
    const target = notificationTarget(notification);
    if (target) navigate(target);
  };

  const markAll = async () => {
    await markNotificationsRead();
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    onUnreadChange?.(0);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 p-4 lg:pointer-events-none lg:block lg:bg-transparent lg:p-0"
      onClick={(event) => { if (event.target === event.currentTarget && window.matchMedia('(max-width: 1023px)').matches) onClose(); }}>
    <aside role="dialog" className={`pointer-events-auto relative flex max-h-[calc(100dvh-2rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl lg:fixed lg:right-4 lg:top-20 lg:max-h-[calc(100dvh-6rem)] ${isLight ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black text-white'}`} aria-label="Notificaciones">
      <div className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
        <div className="flex items-center gap-2"><Bell size={18} className="text-[#FF4D88]" /><h2 className="text-sm font-black">Notificaciones</h2></div>
        <div className="flex items-center gap-1">
          {notifications.some((item) => !item.read) && <button type="button" onClick={() => void markAll()} className="rounded-lg px-2 py-1.5 text-[9px] font-bold text-[#FF4D88] hover:bg-[#FF4D88]/10">Marcar leídas</button>}
          <button type="button" onClick={onClose} aria-label="Cerrar notificaciones" className={`rounded-lg p-2 ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}><X size={16} /></button>
        </div>
      </div>
      <div className="min-h-0 max-h-[440px] overflow-y-auto p-2">
        {loading && notifications.length === 0 ? (
          <div className="flex h-32 items-center justify-center"><MukaiLoaderWheel isLight={isLight} /></div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-12 text-center"><Bell size={28} className={`mx-auto mb-3 ${isLight ? 'text-black/20' : 'text-white/20'}`} /><p className="text-sm font-bold">Todo está al día</p></div>
        ) : notifications.map((notification) => {
          const copy = describeNotification(notification);
          const Icon = copy.icon;
          return (
            <button type="button" key={notification.id} onClick={() => void openNotification(notification)} className={`relative flex w-full gap-3 rounded-xl p-3 text-left transition-colors ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/[0.06]'} ${notification.read ? 'opacity-60' : ''}`}>
              {notification.actor ? <Avatar user={notification.actor} /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF4D88]/15 text-[#FF4D88]"><Icon size={18} /></span>}
              <span className="min-w-0 flex-1"><span className="block text-xs leading-relaxed">{copy.text}</span><small className={`mt-1 block text-[9px] ${isLight ? 'text-black/35' : 'text-white/35'}`}>{timeAgo(notification.created_at)}</small></span>
              {!notification.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FF4D88]" />}
            </button>
          );
        })}
      </div>
    </aside>
    </div>
  );
};
