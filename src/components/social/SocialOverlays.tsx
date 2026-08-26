import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Check,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { getStoredUser } from '../../services/authService';
import type { FriendUser } from '../../services/friendsService';
import {
  getConversationMessages,
  getConversations,
  getNotifications,
  markConversationRead,
  markNotificationsRead,
  OPEN_CHAT_EVENT,
  openChat,
  sendChatMessage,
  type ChatMessage,
  type Conversation,
  type SocialNotification,
} from '../../services/socialService';

const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  return `Hace ${Math.floor(seconds / 86400)} d`;
};

const Avatar = ({ user, size = 'h-10 w-10' }: { user: FriendUser; size?: string }) => user.avatar_url
  ? <img src={user.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-[#FF4D88]/25`} />
  : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#FF4D88] text-sm font-black text-white`}>{user.username.charAt(0).toUpperCase()}</span>;

interface PanelProps {
  isOpen: boolean;
  isLight: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export const MessagesPanel = ({ isOpen, isLight, onClose, onUnreadChange }: PanelProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const load = useCallback(async () => {
    try {
      const result = await getConversations();
      setConversations(result.conversations);
      onUnreadChange?.(result.unread);
    } catch {
      setConversations([]);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (!isOpen) return;
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [isOpen, load]);

  if (!isOpen) return null;
  return (
    <aside className={`fixed right-4 top-20 z-[180] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border shadow-2xl transition-colors ${isLight ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black text-white'}`} aria-label="Mensajes">
      <div className={`flex items-center justify-between border-b px-4 py-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
        <div className="flex items-center gap-2"><MessageCircle size={18} className="text-[#FF4D88]" /><h2 className="text-sm font-black">Mensajes</h2></div>
        <button type="button" onClick={onClose} aria-label="Cerrar mensajes" className={`rounded-lg p-2 ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}><X size={16} /></button>
      </div>
      <div className="max-h-[430px] overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="px-6 py-12 text-center"><Users size={28} className="mx-auto mb-3 text-[#FF4D88]" /><p className="text-sm font-bold">Aún no hay conversaciones</p><p className={`mt-1 text-xs ${isLight ? 'text-black/45' : 'text-white/40'}`}>Acepta una solicitud y abre el chat desde el perfil de tu amigo.</p></div>
        ) : conversations.map((conversation) => (
          <button
            type="button"
            key={conversation.other_user.id}
            onClick={() => { openChat(conversation.other_user); onClose(); }}
            className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/[0.06]'}`}
          >
            <Avatar user={conversation.other_user} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{conversation.other_user.username}</strong><small className={`shrink-0 text-[9px] ${isLight ? 'text-black/35' : 'text-white/35'}`}>{timeAgo(conversation.created_at)}</small></span>
              <span className={`mt-0.5 block truncate text-xs ${isLight ? 'text-black/50' : 'text-white/45'}`}>{conversation.body}</span>
            </span>
            {conversation.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF4D88] px-1 text-[9px] font-black text-white">{conversation.unread_count}</span>}
          </button>
        ))}
      </div>
    </aside>
  );
};

const notificationCopy = (notification: SocialNotification) => {
  const actor = notification.actor?.username || 'Alguien';
  if (notification.type === 'comment_like') return { icon: Heart, text: `${actor} indicó que le gusta tu comentario.` };
  if (notification.type === 'comment_reaction') {
    const reaction = ({ fire: '🔥', love: '❤️', haha: '😂', sad: '😢' } as Record<string, string>)[notification.payload.reaction || ''] || '✨';
    return { icon: Heart, text: `${actor} reaccionó ${reaction} a tu comentario.` };
  }
  if (notification.type === 'comment_reply') return { icon: MessageCircle, text: `${actor} respondió a tu comentario.` };
  if (notification.type === 'friend_request') return { icon: UserPlus, text: `${actor} te envió una solicitud de amistad.` };
  if (notification.type === 'friend_accepted') return { icon: Check, text: `${actor} aceptó tu solicitud de amistad.` };
  return { icon: BookOpen, text: `${notification.payload.title || 'Un manga guardado'} tiene una actualización.` };
};

export const NotificationsPanel = ({ isOpen, isLight, onClose, onUnreadChange }: PanelProps) => {
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
    if ((notification.type === 'comment_like' || notification.type === 'comment_reaction' || notification.type === 'comment_reply') && notification.payload.manga_id) navigate(`/manga/${notification.payload.manga_id}#comentarios`);
    else if (notification.type === 'manga_update' && notification.payload.manga_id) navigate(`/manga/${notification.payload.manga_id}`);
    else if (notification.actor) navigate(`/usuarios/${notification.actor.id}`);
  };

  const markAll = async () => {
    await markNotificationsRead();
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    onUnreadChange?.(0);
  };

  if (!isOpen) return null;
  return (
    <aside className={`fixed right-4 top-20 z-[180] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border shadow-2xl ${isLight ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black text-white'}`} aria-label="Notificaciones">
      <div className={`flex items-center justify-between border-b px-4 py-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
        <div className="flex items-center gap-2"><Bell size={18} className="text-[#FF4D88]" /><h2 className="text-sm font-black">Notificaciones</h2></div>
        <div className="flex items-center gap-1">
          {notifications.some((item) => !item.read) && <button type="button" onClick={() => void markAll()} className="rounded-lg px-2 py-1.5 text-[9px] font-bold text-[#FF4D88] hover:bg-[#FF4D88]/10">Marcar leídas</button>}
          <button type="button" onClick={onClose} aria-label="Cerrar notificaciones" className={`rounded-lg p-2 ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}><X size={16} /></button>
        </div>
      </div>
      <div className="max-h-[440px] overflow-y-auto p-2">
        {loading && notifications.length === 0 ? (
          <div className="flex h-32 items-center justify-center"><Loader2 size={20} className="animate-spin text-[#FF4D88]" /></div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-12 text-center"><Bell size={28} className={`mx-auto mb-3 ${isLight ? 'text-black/20' : 'text-white/20'}`} /><p className="text-sm font-bold">Todo está al día</p></div>
        ) : notifications.map((notification) => {
          const copy = notificationCopy(notification);
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
  );
};

export const ChatWindow = ({ isLight, onUnreadChange }: { isLight: boolean; onUnreadChange?: () => void }) => {
  const [friend, setFriend] = useState<FriendUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentUserId = Number(getStoredUser()?.id || 0);

  const load = useCallback(async (target: FriendUser) => {
    try {
      const items = await getConversationMessages(target.id);
      setMessages(items);
      void markConversationRead(target.id).then(() => onUnreadChange?.()).catch(() => undefined);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo abrir la conversación.');
    }
  }, [onUnreadChange]);

  useEffect(() => {
    const open = (event: Event) => {
      const target = (event as CustomEvent<FriendUser>).detail;
      if (!target?.id) return;
      setFriend(target);
      setMessages([]);
      void load(target);
    };
    window.addEventListener(OPEN_CHAT_EVENT, open);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, open);
  }, [load]);

  useEffect(() => {
    if (!friend) return;
    const timer = window.setInterval(() => void load(friend), 8000);
    return () => window.clearInterval(timer);
  }, [friend, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = content.trim();
    if (!friend || !body || sending) return;
    setSending(true);
    try {
      const sent = await sendChatMessage(friend.id, body);
      setMessages((current) => [...current, sent]);
      setContent('');
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  if (!friend) return null;
  return (
    <section className={`fixed bottom-4 right-4 z-[190] flex h-[min(520px,calc(100dvh-6rem))] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition-colors ${isLight ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black text-white'}`} aria-label={`Chat con ${friend.username}`}>
      <header className={`flex items-center gap-3 border-b px-4 py-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
        <Avatar user={friend} size="h-9 w-9" />
        <button type="button" onClick={() => window.location.assign(`/usuarios/${friend.id}`)} className="min-w-0 flex-1 text-left"><strong className="block truncate text-sm">{friend.username}</strong><small className="text-[9px] text-emerald-500">Amigo MangaMukai</small></button>
        <button type="button" onClick={() => setFriend(null)} aria-label="Cerrar chat" className={`rounded-lg p-2 ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}><X size={16} /></button>
      </header>
      <div className={`min-h-0 flex-1 overflow-y-auto p-4 ${isLight ? 'bg-zinc-50' : 'bg-[#070707]'}`}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center"><MessageCircle size={30} className="mb-3 text-[#FF4D88]" /><p className="text-sm font-bold">Comienza la conversación</p><p className={`mt-1 text-xs ${isLight ? 'text-black/45' : 'text-white/40'}`}>Un saludo siempre es un buen primer mensaje.</p></div>
        ) : <div className="space-y-2">{messages.map((message) => {
          const own = message.sender_id === currentUserId;
          return <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${own ? 'rounded-br-md bg-[#FF4D88] text-white' : isLight ? 'rounded-bl-md bg-white text-black shadow-sm' : 'rounded-bl-md bg-white/10 text-white'}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><small className={`mt-1 block text-right text-[8px] ${own ? 'text-white/65' : isLight ? 'text-black/35' : 'text-white/35'}`}>{timeAgo(message.created_at)}</small></div></div>;
        })}<div ref={bottomRef} /></div>}
      </div>
      {error && <p className="bg-red-500/10 px-4 py-2 text-[10px] text-red-400">{error}</p>}
      <form onSubmit={submit} className={`flex items-end gap-2 border-t p-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
        <textarea value={content} onChange={(event) => setContent(event.target.value.slice(0, 2000))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} placeholder="Escribe un mensaje..." className={`max-h-24 min-h-10 flex-1 resize-none rounded-xl border px-3 py-2.5 text-xs outline-none focus:border-[#FF4D88]/60 ${isLight ? 'border-black/10 bg-zinc-50 text-black' : 'border-white/10 bg-white/5 text-white'}`} />
        <button type="submit" disabled={!content.trim() || sending} aria-label="Enviar mensaje" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF4D88] text-white disabled:opacity-40">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
      </form>
    </section>
  );
};
