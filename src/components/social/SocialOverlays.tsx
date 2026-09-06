import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Check,
  Heart,
  MessageCircle,
  Minus,
  Search,
  Send,
  UserPlus,
  X,
} from 'lucide-react';
import { getStoredUser } from '../../services/authService';
import { MukaiLoaderWheel } from '../common/MukaiLoaderWheel';
import { getFriendsOverview, type FriendUser } from '../../services/friendsService';
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
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const desktop = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (desktop.matches && event.button === 0 && event.target instanceof Node && panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [isOpen, onClose]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [result, overview] = await Promise.all([getConversations(), getFriendsOverview()]);
      setConversations(result.conversations);
      setFriends(overview.friends.map(entry => entry.user));
      setError('');
      onUnreadChange?.(result.unread);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo conectar con los mensajes.'); }
    finally { setLoading(false); }
  }, [onUnreadChange]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    return () => window.clearInterval(timer);
  }, [isOpen, load]);

  if (!isOpen) return null;
  return (
    <aside ref={panelRef} className={`fixed right-4 top-20 z-[180] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border shadow-2xl transition-colors ${isLight ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-black text-white'}`} aria-label="Mensajes">
      <div className={`flex items-center justify-between border-b px-4 py-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
        <div className="flex items-center gap-2"><MessageCircle size={22} className="text-[#0084ff]" /><h2 className="text-xl font-bold">Chats</h2></div>
        <button type="button" onClick={onClose} aria-label="Cerrar mensajes" className={`rounded-lg p-2 ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}><X size={16} /></button>
      </div>
      <label className={`mx-3 mt-3 flex items-center gap-2 rounded-full px-3 py-2 ${isLight ? 'bg-[#f0f2f5]' : 'bg-white/10'}`}><Search size={17} /><input aria-label="Buscar chat o amigo" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar chat o amigo" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      {error && <p role="alert" className="px-4 pt-3 text-xs text-red-500">{error} <button type="button" onClick={() => void load()} className="underline">Reintentar</button></p>}
      <div className="max-h-[430px] overflow-y-auto p-2">
        {loading && <div className="my-4 flex justify-center"><MukaiLoaderWheel isLight={isLight} /></div>}
        {!loading && !error && conversations.length === 0 && friends.length === 0 ? (
          <div className="px-6 py-12 text-center"><p className="text-sm font-bold">Aún no hay conversaciones</p></div>
        ) : conversations.filter(conversation => conversation.other_user.username.toLowerCase().includes(query.toLowerCase())).map((conversation) => (
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
        {friends.filter(friend => !conversations.some(conversation => conversation.other_user.id === friend.id) && friend.username.toLowerCase().includes(query.toLowerCase())).map(friend => <button key={friend.id} type="button" onClick={() => { openChat(friend); onClose(); }} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}><Avatar user={friend} /><span><strong className="block text-sm">{friend.username}</strong><small className="text-xs text-[#0084ff]">Iniciar conversación</small></span></button>)}
      </div>
    </aside>
  );
};

const describeNotification = (notification: SocialNotification) => {
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

export const ChatWindow = ({ isLight, onUnreadChange }: { isLight: boolean; onUnreadChange?: () => void }) => {
  const [friend, setFriend] = useState<FriendUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const friendIdRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const hasLoaded = useRef(false);
  const currentUserId = Number(getStoredUser()?.id || 0);

  const load = useCallback(async (target: FriendUser, before?: number) => {
    try {
      const result = await getConversationMessages(target.id, before);
      if (friendIdRef.current !== target.id) return;
      setMessages(current => [...new Map([...current, ...result.messages].map(message => [message.id, message])).values()].sort((a, b) => a.id - b.id));
      if (before || !hasLoaded.current) setHasMore(result.hasMore);
      hasLoaded.current = true;
      if (!document.hidden) void markConversationRead(target.id).then(() => onUnreadChange?.()).catch(() => undefined);
      setError('');
    } catch (caught) {
      if (friendIdRef.current !== target.id) return;
      setError(caught instanceof Error ? caught.message : 'No se pudo abrir la conversación.');
    } finally { if (friendIdRef.current === target.id) setLoading(false); }
  }, [onUnreadChange]);

  useEffect(() => {
    const open = (event: Event) => {
      const target = (event as CustomEvent<FriendUser>).detail;
      if (!target?.id) return;
      friendIdRef.current = target.id;
      hasLoaded.current = false;
      stickToBottom.current = true;
      setFriend(target);
      setContent(''); setError(''); setMinimized(false); setLoading(true); setHasMore(false);
      setMessages([]);
      void load(target);
    };
    window.addEventListener(OPEN_CHAT_EVENT, open);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, open);
  }, [load]);

  useEffect(() => {
    if (!friend || minimized) return;
    const timer = window.setInterval(() => { if (!document.hidden) void load(friend); }, 5000);
    return () => window.clearInterval(timer);
  }, [friend, load, minimized]);

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.at(-1)?.id, minimized]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = content.trim();
    if (!friend || !body || sending) return;
    setSending(true);
    try {
      const sent = await sendChatMessage(friend.id, body);
      if (friendIdRef.current !== friend.id) return;
      stickToBottom.current = true;
      setMessages((current) => [...current.filter(message => message.id !== sent.id), sent]);
      setContent('');
      setError('');
    } catch (caught) {
      if (friendIdRef.current !== friend.id) return;
      setError(caught instanceof Error ? caught.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  if (!friend) return null;
  return (
    <section className={`fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-[190] flex ${minimized ? 'h-auto' : 'h-[min(560px,calc(100dvh-6rem))]'} w-[min(380px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition-colors ${isLight ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-[#242526] text-white'}`} aria-label={`Chat con ${friend.username}`}>
      <header className={`flex items-center gap-3 border-b px-4 py-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
        <Avatar user={friend} size="h-9 w-9" />
        <button type="button" onClick={() => setMinimized(false)} className="min-w-0 flex-1 text-left"><strong className="block truncate text-sm">{friend.username}</strong><small className="text-[10px] opacity-50">Mensajes privados</small></button>
        <button type="button" onClick={() => setMinimized(value => !value)} aria-label={minimized ? 'Restaurar chat' : 'Minimizar chat'} className="rounded-full p-2 text-[#0084ff]"><Minus size={18} /></button>
        <button type="button" onClick={() => { friendIdRef.current = null; setFriend(null); }} aria-label="Cerrar chat" className={`rounded-lg p-2 text-[#0084ff] ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}><X size={18} /></button>
      </header>
      {!minimized && <><div ref={scrollRef} onScroll={() => { const element = scrollRef.current; if (element) stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }} className={`min-h-0 flex-1 overflow-y-auto p-4 ${isLight ? 'bg-white' : 'bg-[#18191a]'}`}>
        {hasMore && <button type="button" disabled={loading} onClick={() => { stickToBottom.current = false; setLoading(true); void load(friend, messages[0]?.id); }} className="mx-auto mb-3 block text-xs font-bold text-[#0084ff]">Ver mensajes anteriores</button>}
        {loading && <div className="my-3 flex justify-center"><MukaiLoaderWheel isLight={isLight} /></div>}
        {!loading && messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center"><MessageCircle size={30} className="mb-3 text-[#FF4D88]" /><p className="text-sm font-bold">Comienza la conversación</p><p className={`mt-1 text-xs ${isLight ? 'text-black/45' : 'text-white/40'}`}>Un saludo siempre es un buen primer mensaje.</p></div>
        ) : <div className="space-y-2">{messages.map((message) => {
          const own = message.sender_id === currentUserId;
          return <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${own ? 'rounded-br-md bg-[#0084ff] text-white' : isLight ? 'rounded-bl-md bg-[#f0f2f5] text-black' : 'rounded-bl-md bg-[#3a3b3c] text-white'}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><small className={`mt-1 block text-right text-[9px] ${own ? 'text-white/70' : isLight ? 'text-black/45' : 'text-white/45'}`}>{timeAgo(message.created_at)}{own && message.read_at ? ' · Visto' : ''}</small></div></div>;
        })}<div ref={bottomRef} /></div>}
      </div>
      {error && <p className="bg-red-500/10 px-4 py-2 text-[10px] text-red-400">{error}</p>}
      <form onSubmit={submit} className={`flex items-end gap-2 border-t p-3 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
        <textarea aria-label="Mensaje" value={content} onChange={(event) => setContent(event.target.value.slice(0, 2000))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} placeholder="Escribe un mensaje..." className={`max-h-24 min-h-10 min-w-0 flex-1 resize-none rounded-full border-0 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0084ff]/40 ${isLight ? 'bg-[#f0f2f5] text-black' : 'bg-[#3a3b3c] text-white'}`} />
        <button type="submit" disabled={!content.trim() || sending} aria-label="Enviar mensaje" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0084ff] disabled:opacity-40">{sending ? <MukaiLoaderWheel size={20} isLight={isLight} /> : <Send size={20} />}</button>
      </form></>}
    </section>
  );
};
