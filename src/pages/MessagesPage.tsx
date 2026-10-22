import { getCachedMessageHistory, loadMessageHistory } from '../services/messageHistory';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  PenLine,
  MessageCircle,
  MoreHorizontal,
  Search,
  User,
  X,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CommunityIcon } from '../components/community/CommunityIcons';
import { MessageComposer } from '../components/community/MessageComposer';
import { chatMessagePreview, formatChatDate, parseChatMessage } from '../utils/chatMessage';
import '../styles/messages.css';
import { getStoredToken, getStoredUser } from '../services/authService';
import { getCachedMessageInbox, loadMessageInbox } from '../services/messageInbox';
import { getCommunityPosition } from '../services/communityViewState';
import {
  CHAT_ACCENT,
  getPublicProfile,
  markConversationRead,
  sendChatMessage,
  SOCIAL_REFRESH_EVENT,
  type ChatMessage,
  type Conversation,
  type FriendUser,
  type PublicProfile,
} from '../services/socialService';

const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  const days = Math.floor(seconds / 86400);
  if (days <= 31) return `${days} ${days === 1 ? 'Día' : 'Días'}`;
  const months = Math.floor(days / 31);
  return `${months} ${months === 1 ? 'Mes' : 'Meses'}`;
};

const Avatar = ({ user, size = 'h-12 w-12', text = 'text-base' }: { user: Pick<FriendUser, 'avatar_url' | 'username'>; size?: string; text?: string }) => user.avatar_url
  ? <img src={user.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[var(--mm-accent-pink)] font-black text-white ${text}`}>{user.username.charAt(0).toUpperCase()}</span>;

export const MessagesPage = () => {
  const navigate = useNavigate();
  const { userId = '' } = useParams();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const currentUser = useMemo(() => getStoredUser(), []);
  const currentUserId = Number(currentUser?.id || 0);
  const activeId = Number(userId) || 0;

  const [conversations, setConversations] = useState<Conversation[]>(() => getCachedMessageInbox()?.conversations ?? []);
  const [listLoading, setListLoading] = useState(() => getCachedMessageInbox() === null);
  const [listError, setListError] = useState('');
  const [query, setQuery] = useState('');

  const [partner, setPartner] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const hasLoaded = useRef(false);
  const activeIdRef = useRef(activeId);

  useDocumentTitle(partner ? `Chat con ${partner.username}` : 'Mensajes');

  useEffect(() => {
    if (!currentUser || !getStoredToken()) {
      navigate('/auth/login', { replace: true, state: { returnTo: activeId ? `/mensajes/${activeId}` : '/mensajes' } });
    }
  }, [activeId, currentUser, navigate]);

  const notifyNavbar = () => window.dispatchEvent(new Event(SOCIAL_REFRESH_EVENT));

  const communityReturn = getCommunityPosition(String(currentUserId))?.url || '/comunidad';
  const goBack = () => navigate(communityReturn, { state: { restoreCommunityScroll: true } });

  const loadConversations = useCallback(async (force = false) => {
    try {
      const result = await loadMessageInbox(force);
      setConversations(result.conversations);
      setListError('');
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : 'No se pudo conectar con los mensajes.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => { if (!document.hidden) void loadConversations(); }, 15000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    activeIdRef.current = activeId;
    setPartner(null);
    if (!activeId) return;
    let active = true;
    const loadPartner = () => getPublicProfile(activeId).then((profile) => { if (active && activeIdRef.current === activeId) setPartner(profile); }).catch(() => undefined);
    void loadPartner();
    const timer = window.setInterval(() => { if (!document.hidden) void loadPartner(); }, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [activeId]);

  const loadMessages = useCallback(async (target: number, before?: number) => {
    try {
      const result = await loadMessageHistory(target, before);
      if (activeIdRef.current !== target) return;
      setMessages((current) => [...new Map([...current, ...result.messages].map((message) => [message.id, message])).values()].sort((a, b) => a.id - b.id));
      if (before || !hasLoaded.current) setHasMore(result.hasMore);
      hasLoaded.current = true;

      const pendingRead = result.messages.some((message) => message.sender_id === target && !message.read_at);
      if (pendingRead && !document.hidden) void markConversationRead(target).then(() => { notifyNavbar(); void loadConversations(true); }).catch(() => undefined);
      setChatError('');
    } catch (caught) {
      if (activeIdRef.current !== target) return;
      setChatError(caught instanceof Error ? caught.message : 'No se pudo abrir la conversación.');
    } finally {
      if (activeIdRef.current === target) setChatLoading(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    const cached = getCachedMessageHistory(activeId);
    setMessages(cached?.messages ?? []);
    setChatError('');
    setHasMore(cached?.hasMore ?? false);
    hasLoaded.current = false;
    stickToBottom.current = true;
    if (!activeId) return;
    setChatLoading(!cached);
    void loadMessages(activeId);
    const timer = window.setInterval(() => { if (!document.hidden) void loadMessages(activeId); }, 5000);
    return () => window.clearInterval(timer);
  }, [activeId, loadMessages]);

  const lastMessageId = messages.at(-1)?.id;
  const partnerId = partner?.id;
  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastMessageId, partnerId]);

  const submit = async (body: string) => {
    if (!activeId || !body) return;
    const sent = await sendChatMessage(activeId, body);
    if (activeIdRef.current !== activeId) return;
    stickToBottom.current = true;
    setMessages((current) => [...current.filter((message) => message.id !== sent.id), sent]);
    setChatError('');
    void loadConversations(true);
  };

  const visibleConversations = conversations.filter((conversation) =>
    conversation.other_user.username.toLowerCase().includes(query.trim().toLowerCase()));

  const headerUser = partner || conversations.find((conversation) => conversation.other_user.id === activeId)?.other_user || null;
  const isOnline = Boolean(headerUser?.is_online);

  const surface = isLight ? 'bg-white text-black' : 'bg-black text-white';
  const divider = isLight ? 'border-black/10' : 'border-white/10';
  const muted = isLight ? 'text-black/50' : 'text-white/50';
  const pill = isLight ? 'bg-[#eff3f4] text-black' : 'bg-white/10 text-white';
  const hover = isLight ? 'hover:bg-black/5' : 'hover:bg-white/[0.06]';

  const rows: Array<{ type: 'separator'; key: string; label: string } | { type: 'message'; message: ChatMessage }> = [];
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    const gap = previous ? new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() : Infinity;
    if (!previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString() || gap > 30 * 60 * 1000) {
      rows.push({ type: 'separator', key: `sep-${message.id}`, label: formatChatDate(message.created_at) });
    }
    rows.push({ type: 'message', message });
  });
  const lastOwnRead = [...messages].reverse().find((message) => message.sender_id === currentUserId && message.read_at);

  return (
    <main className={`messages-page ${isLight ? 'is-light' : ''} pt-[env(safe-area-inset-top)] transition-colors ${surface}`}>

      <div className={`mx-auto flex h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-6xl lg:grid lg:h-[100dvh] lg:grid-cols-[76px_320px_minmax(0,1fr)] lg:border-x ${divider}`}>
        <nav className="messages-rail" aria-label="Navegación de comunidad">
          {([
            ['home', 'Inicio', communityReturn],
            ['search', 'Explorar', '/comunidad?explorar=1'],
            ['messages', 'Mensajes', '/mensajes'],
            ['bookmark', 'Guardados', '/comunidad/guardados'],
            ['pro', 'MukaiPro', '/pro'],
            ['profile', 'Ver perfil', '/profile'],
          ] as const).map(([icon, label, to]) => <Link key={icon} to={to} state={icon === 'home' ? { restoreCommunityScroll: true } : undefined} aria-label={label} title={label} aria-current={icon === 'messages' ? 'page' : undefined}><CommunityIcon name={icon} size={28} /></Link>)}
          <Link to="/comunidad?publicar=1" className="messages-rail-publish" aria-label="Publicar" title="Publicar"><PenLine size={24} /></Link>
        </nav>
        <section className={`relative flex min-h-0 w-full min-w-0 flex-col lg:border-r ${divider} ${activeId ? 'hidden lg:flex' : 'flex'}`} aria-label="Chats">
          <header className={`flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3 ${divider}`}>
            <div className="flex items-center gap-1">
              <button type="button" onClick={goBack} aria-label="Volver a Comunidad" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${hover}`}><ArrowLeft size={20} /></button>
              <Link to="/profile" aria-label="Ir a mi perfil" className="shrink-0 rounded-full">
                {currentUser?.avatar
                  ? <img src={currentUser.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  : <span className={`flex h-8 w-8 items-center justify-center rounded-full ${pill}`}><User size={16} /></span>}
              </Link>
            </div>
            <h1 className="font-[Montserrat] text-lg font-extrabold tracking-tight">Chat</h1>
            <span aria-hidden="true" className="w-[68px]" />
          </header>

          <label className={`messages-search mx-4 mt-3 flex h-11 items-center gap-3 rounded-[8px] px-4 ${pill}`}>
            <Search size={18} className={muted} />
            <input aria-label="Buscar chat" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:opacity-60" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={16} /></button>}
          </label>

          {listError && <p role="alert" className="px-4 pt-3 text-xs text-red-500">{listError} <button type="button" onClick={() => void loadConversations()} className="underline">Reintentar</button></p>}

          <div className="min-h-0 flex-1 overflow-y-auto pb-24 pt-2 lg:pb-4">

            {!listLoading && !listError && conversations.length === 0 && (
              <div className="px-8 py-16 text-center">
                <MessageCircle size={34} className="mx-auto mb-3" style={{ color: CHAT_ACCENT }} />
                <p className="text-base font-bold">Aún no hay conversaciones</p>
                <p className={`mt-1 text-sm ${muted}`}>Escribe a cualquier lector desde su perfil o con el botón de nuevo mensaje.</p>
              </div>
            )}
            {visibleConversations.map((conversation) => {
              const other = conversation.other_user;
              const own = conversation.sender_id === currentUserId;
              const isActive = other.id === activeId;
              return (
                <button
                  key={other.id}
                  type="button"
                  onClick={() => navigate(`/mensajes/${other.id}`)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${hover} ${isActive ? (isLight ? 'bg-black/[0.04]' : 'bg-white/[0.06]') : ''}`}
                >
                  <span className="relative shrink-0">
                    <Avatar user={other} size="h-11 w-11" text="text-base" />
                    {other.is_online && <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 bg-emerald-500 ${isLight ? 'border-white' : 'border-black'}`} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate text-[14px] font-bold">{other.username}</strong>
                      <small className={`shrink-0 text-xs ${muted}`}>{timeAgo(conversation.created_at)}</small>
                    </span>
                    <span className={`mt-0.5 block truncate text-sm ${conversation.unread_count > 0 ? 'font-semibold' : muted}`} style={conversation.unread_count > 0 ? { color: CHAT_ACCENT } : undefined}>
                      {own ? 'Tú: ' : ''}{chatMessagePreview(conversation.body)}
                    </span>
                  </span>
                  {conversation.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white" style={{ backgroundColor: CHAT_ACCENT }}>{conversation.unread_count}</span>}
                </button>
              );
            })}
          </div>
        </section>


        <section className={`min-h-0 w-full min-w-0 flex-col ${activeId ? 'flex' : 'hidden lg:flex'}`} aria-label={headerUser ? `Chat con ${headerUser.username}` : 'Conversación'}>
          {!activeId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <MessageCircle size={40} className="mb-4" style={{ color: CHAT_ACCENT }} />
              <p className="text-lg font-bold">Selecciona una conversación</p>
              <p className={`mt-1 max-w-xs text-sm ${muted}`}>Elige un chat de la lista o escribe a un lector nuevo.</p>
            </div>
          ) : (
            <>
              <header className={`flex h-14 shrink-0 items-center gap-2 border-b px-2 sm:px-3 ${divider}`}>
                <button type="button" onClick={() => navigate('/mensajes')} aria-label="Volver a los chats" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full lg:hidden ${hover}`}><ArrowLeft size={20} /></button>
                {headerUser && <Link to={`/usuarios/${headerUser.id}`} className="shrink-0"><Avatar user={headerUser} size="h-8 w-8" text="text-xs" /></Link>}
                <div className="min-w-0 flex-1">
                  <Link to={headerUser ? `/usuarios/${headerUser.id}` : '/mensajes'} className="block truncate font-[Montserrat] text-[15px] font-extrabold leading-tight hover:underline">{headerUser?.username || ''}</Link>
                  <p className={`flex items-center gap-1.5 text-[11px] font-semibold leading-tight ${isOnline ? 'text-emerald-500' : muted}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : isLight ? 'bg-black/25' : 'bg-white/25'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                {headerUser && <Link to={`/usuarios/${headerUser.id}`} aria-label="Ver perfil" title="Ver perfil" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${hover}`}><MoreHorizontal size={20} /></Link>}
              </header>

              <div ref={scrollRef} onScroll={() => { const element = scrollRef.current; if (element) stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-6">

                {!hasMore && (
                  <div className="mb-8 flex flex-col items-center text-center">
                    {partner ? (
                      <>
                        <Link to={`/usuarios/${partner.id}`} aria-label={`Ver perfil de ${partner.username}`} className="mb-3 block h-[84px] w-[84px] overflow-hidden rounded-full">
                          <Avatar user={partner} size="h-full w-full" text="text-xl" />
                        </Link>
                        <p className="font-[Montserrat] text-base font-extrabold">{partner.username}</p>
                      </>
                    ) : null}
                  </div>
                )}
                {hasMore && <button type="button" disabled={chatLoading} onClick={() => { stickToBottom.current = false; setChatLoading(true); void loadMessages(activeId, messages[0]?.id); }} className="mx-auto mb-4 block text-xs font-bold" style={{ color: CHAT_ACCENT }}>Ver mensajes anteriores</button>}

                <div className="space-y-1.5">
                  {rows.map((row) => row.type === 'separator' ? (
                    <p key={row.key} className={`messages-date py-3 text-center text-[13px] ${muted}`}>{row.label}</p>
                  ) : (() => {
                    const own = row.message.sender_id === currentUserId;
                    const parsed = parseChatMessage(row.message.body);
                    return (
                      <div key={row.message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[78%] rounded-[22px] px-4 py-2.5 text-[15px] leading-snug ${own ? 'rounded-br-md text-white' : `rounded-bl-md ${isLight ? 'bg-[#eff3f4] text-black' : 'bg-[#2f3336] text-white'}`}`}
                          style={own ? { backgroundColor: CHAT_ACCENT } : undefined}
                          title={formatChatDate(row.message.created_at)}
                        >
                          {parsed.media && <a href={parsed.media.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${parsed.media.label}`}><img src={parsed.media.url} alt={parsed.media.label} className="mb-1 max-h-72 max-w-full rounded-xl object-contain" onLoad={() => { if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' }); }} /></a>}
                          {parsed.text && <p className="whitespace-pre-wrap break-words">{parsed.text}</p>}
                        </div>
                      </div>
                    );
                  })())}
                  {lastOwnRead && lastOwnRead.id === messages.at(-1)?.id && <p className={`pr-1 text-right text-[11px] ${muted}`}>Visto</p>}
                </div>
                <div ref={bottomRef} />
              </div>

              {chatError && <p className="bg-red-500/10 px-4 py-2 text-xs text-red-500">{chatError}</p>}

              <MessageComposer key={activeId} onSend={submit} />
            </>
          )}
        </section>
      </div>

    </main>
  );
};

export default MessagesPage;
