import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  MessageCircle,
  MoreHorizontal,
  Search,
  User,
  X,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MukaiLoaderWheel } from '../components/common/MukaiLoaderWheel';
import { getStoredToken, getStoredUser } from '../services/authService';
import {
  CHAT_ACCENT,
  getConversationMessages,
  getConversations,
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

const formatTime = (date: Date) => new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);

/** "Hoy 1:25 p. m." / "Ayer 9:10 a. m." / "12 de mayo 8:00 p. m." */
const formatSeparator = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = sameDay(date, today)
    ? 'Hoy'
    : sameDay(date, yesterday)
      ? 'Ayer'
      : new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) }).format(date);
  return `${day} ${formatTime(date)}`;
};

const formatJoined = (value: string) => new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));

const formatCount = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K` : String(value);

const Avatar = ({ user, size = 'h-12 w-12', text = 'text-base' }: { user: Pick<FriendUser, 'avatar_url' | 'username'>; size?: string; text?: string }) => user.avatar_url
  ? <img src={user.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#FF4D88] font-black text-white ${text}`}>{user.username.charAt(0).toUpperCase()}</span>;

/**
 * Página de mensajes: lista de chats a la izquierda (o a pantalla completa en móvil) y conversación a la derecha.
 * Se abre desde el botón "Mensajes" de la Comunidad y va sin navbar: ocupa toda la altura y vuelve con su propia flecha.
 */
export const MessagesPage = () => {
  const navigate = useNavigate();
  const { userId = '' } = useParams();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const currentUser = useMemo(() => getStoredUser(), []);
  const currentUserId = Number(currentUser?.id || 0);
  const activeId = Number(userId) || 0;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [query, setQuery] = useState('');

  const [partner, setPartner] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
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

  const goBack = () => {
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1);
    else navigate('/comunidad');
  };

  const loadConversations = useCallback(async () => {
    try {
      const result = await getConversations();
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

  /* Perfil del interlocutor: cabecera del chat (estado) y bloque "Se unió". */
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
      const result = await getConversationMessages(target, before);
      if (activeIdRef.current !== target) return;
      setMessages((current) => [...new Map([...current, ...result.messages].map((message) => [message.id, message])).values()].sort((a, b) => a.id - b.id));
      if (before || !hasLoaded.current) setHasMore(result.hasMore);
      hasLoaded.current = true;
      // Solo se marca como leído cuando hay mensajes nuevos del otro lado; así el sondeo no dispara escrituras.
      const pendingRead = result.messages.some((message) => message.sender_id === target && !message.read_at);
      if (pendingRead && !document.hidden) void markConversationRead(target).then(() => { notifyNavbar(); void loadConversations(); }).catch(() => undefined);
      setChatError('');
    } catch (caught) {
      if (activeIdRef.current !== target) return;
      setChatError(caught instanceof Error ? caught.message : 'No se pudo abrir la conversación.');
    } finally {
      if (activeIdRef.current === target) setChatLoading(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    setMessages([]);
    setContent('');
    setChatError('');
    setHasMore(false);
    hasLoaded.current = false;
    stickToBottom.current = true;
    if (!activeId) return;
    setChatLoading(true);
    void loadMessages(activeId);
    const timer = window.setInterval(() => { if (!document.hidden) void loadMessages(activeId); }, 5000);
    return () => window.clearInterval(timer);
  }, [activeId, loadMessages]);

  const lastMessageId = messages.at(-1)?.id;
  const partnerId = partner?.id;
  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastMessageId, partnerId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = content.trim();
    if (!activeId || !body || sending) return;
    setSending(true);
    try {
      const sent = await sendChatMessage(activeId, body);
      if (activeIdRef.current !== activeId) return;
      stickToBottom.current = true;
      setMessages((current) => [...current.filter((message) => message.id !== sent.id), sent]);
      setContent('');
      setChatError('');
      void loadConversations();
    } catch (caught) {
      if (activeIdRef.current !== activeId) return;
      setChatError(caught instanceof Error ? caught.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
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

  /* Separadores de fecha: uno por día o cuando pasan más de 30 min entre mensajes. */
  const rows: Array<{ type: 'separator'; key: string; label: string } | { type: 'message'; message: ChatMessage }> = [];
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    const gap = previous ? new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() : Infinity;
    if (!previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString() || gap > 30 * 60 * 1000) {
      rows.push({ type: 'separator', key: `sep-${message.id}`, label: formatSeparator(message.created_at) });
    }
    rows.push({ type: 'message', message });
  });
  const lastOwnRead = [...messages].reverse().find((message) => message.sender_id === currentUserId && message.read_at);

  return (
    <main className={`messages-page pt-[env(safe-area-inset-top)] transition-colors ${surface}`}>
      {/* Sin navbar: toda la altura menos la barra inferior en móvil; en escritorio, la pantalla completa. */}
      <div className={`mx-auto flex h-[calc(100dvh-64px-env(safe-area-inset-bottom)-env(safe-area-inset-top))] w-full max-w-6xl lg:grid lg:h-[100dvh] lg:grid-cols-[360px_minmax(0,1fr)] lg:border-x ${divider}`}>
        {/* ───────── Lista de chats ───────── */}
        <section className={`relative flex min-h-0 w-full min-w-0 flex-col lg:border-r ${divider} ${activeId ? 'hidden lg:flex' : 'flex'}`} aria-label="Chats">
          <header className={`flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3 ${divider}`}>
            <div className="flex items-center gap-1">
              <button type="button" onClick={goBack} aria-label="Volver" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${hover}`}><ArrowLeft size={20} /></button>
              <Link to="/perfil" aria-label="Ir a mi perfil" className="shrink-0 rounded-full">
                {currentUser?.avatar
                  ? <img src={currentUser.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  : <span className={`flex h-8 w-8 items-center justify-center rounded-full ${pill}`}><User size={16} /></span>}
              </Link>
            </div>
            <h1 className="font-[Montserrat] text-lg font-extrabold tracking-tight">Chat</h1>
            <span aria-hidden="true" className="w-[68px]" />
          </header>

          <label className={`mx-4 mt-3 flex h-11 items-center gap-3 rounded-[8px] px-4 ${pill}`}>
            <Search size={18} className={muted} />
            <input aria-label="Buscar chat" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:opacity-60" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={16} /></button>}
          </label>

          {listError && <p role="alert" className="px-4 pt-3 text-xs text-red-500">{listError} <button type="button" onClick={() => void loadConversations()} className="underline">Reintentar</button></p>}

          <div className="min-h-0 flex-1 overflow-y-auto pb-24 pt-2 lg:pb-4">
            {/* Mientras carga no se pinta nada; el aviso solo cuando ya se sabe que no hay chats. */}
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
                      {own ? 'Tú: ' : ''}{conversation.body}
                    </span>
                  </span>
                  {conversation.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white" style={{ backgroundColor: CHAT_ACCENT }}>{conversation.unread_count}</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* ───────── Conversación ───────── */}
        {/* w-full: como hijo flex sin ancho se encogía al contenido y el chat quedaba pegado a la izquierda en móvil. */}
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
                  <Link to={headerUser ? `/usuarios/${headerUser.id}` : '/mensajes'} className="block truncate font-[Montserrat] text-[15px] font-extrabold leading-tight hover:underline">{headerUser?.username || 'Cargando…'}</Link>
                  <p className={`flex items-center gap-1.5 text-[11px] font-semibold leading-tight ${isOnline ? 'text-emerald-500' : muted}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : isLight ? 'bg-black/25' : 'bg-white/25'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                {headerUser && <Link to={`/usuarios/${headerUser.id}`} aria-label="Ver perfil" title="Ver perfil" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${hover}`}><MoreHorizontal size={20} /></Link>}
              </header>

              <div ref={scrollRef} onScroll={() => { const element = scrollRef.current; if (element) stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-6">
                {/* Bloque de presentación, como en los DM de X: foto, "Se unió", seguidores y Ver perfil. */}
                {!hasMore && (
                  <div className="mb-8 flex flex-col items-center text-center">
                    {partner ? (
                      <>
                        <div className={`relative mb-3 h-[76px] w-[76px] overflow-hidden rounded-full ring-4 ${isLight ? 'ring-black/5' : 'ring-white/10'}`}>
                          {partner.banner_url && <img src={partner.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
                          <div className="absolute inset-0 flex items-center justify-center"><Avatar user={partner} size="h-16 w-16" text="text-xl" /></div>
                        </div>
                        <p className="font-[Montserrat] text-base font-extrabold">{partner.username}</p>
                        <p className={`mt-1 text-sm ${muted}`}>Se unió en {formatJoined(partner.created_at)}</p>
                        <p className={`text-sm ${muted}`}>{formatCount(partner.followers_count)} {partner.followers_count === 1 ? 'seguidor' : 'seguidores'}</p>
                        <Link to={`/usuarios/${partner.id}`} className={`mt-3 rounded-full px-5 py-2.5 text-sm font-bold ${pill}`}>Ver perfil</Link>
                      </>
                    ) : null}
                  </div>
                )}
                {hasMore && <button type="button" disabled={chatLoading} onClick={() => { stickToBottom.current = false; setChatLoading(true); void loadMessages(activeId, messages[0]?.id); }} className="mx-auto mb-4 block text-xs font-bold" style={{ color: CHAT_ACCENT }}>Ver mensajes anteriores</button>}

                <div className="space-y-1.5">
                  {rows.map((row) => row.type === 'separator' ? (
                    <p key={row.key} className={`py-3 text-center text-[13px] ${muted}`}>{row.label}</p>
                  ) : (() => {
                    const own = row.message.sender_id === currentUserId;
                    return (
                      <div key={row.message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[78%] rounded-[22px] px-4 py-2.5 text-[15px] leading-snug ${own ? 'rounded-br-md text-white' : `rounded-bl-md ${isLight ? 'bg-[#eff3f4] text-black' : 'bg-[#2f3336] text-white'}`}`}
                          style={own ? { backgroundColor: CHAT_ACCENT } : undefined}
                          title={formatTime(new Date(row.message.created_at))}
                        >
                          <p className="whitespace-pre-wrap break-words">{row.message.body}</p>
                        </div>
                      </div>
                    );
                  })())}
                  {lastOwnRead && lastOwnRead.id === messages.at(-1)?.id && <p className={`pr-1 text-right text-[11px] ${muted}`}>Visto</p>}
                </div>
                <div ref={bottomRef} />
              </div>

              {chatError && <p className="bg-red-500/10 px-4 py-2 text-xs text-red-500">{chatError}</p>}
              {/* Rejilla [campo | botón] con el mismo margen a ambos lados y hueco para la barra del sistema. */}
              <form onSubmit={submit} className={`grid shrink-0 grid-cols-[minmax(0,1fr)_44px] items-end gap-2 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 ${divider}`}>
                <label className={`flex min-h-11 w-full items-center rounded-[24px] border px-4 ${isLight ? 'border-black/15 bg-white' : 'border-white/20 bg-black'}`}>
                  <textarea
                    aria-label="Mensaje"
                    value={content}
                    onChange={(event) => setContent(event.target.value.slice(0, 2000))}
                    onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
                    rows={1}
                    placeholder="Escribe un mensaje"
                    className="max-h-28 min-h-[22px] w-full resize-none bg-transparent py-2.5 text-[15px] leading-[22px] outline-none placeholder:opacity-60"
                  />
                </label>
                <button type="submit" disabled={!content.trim() || sending} aria-label="Enviar mensaje" className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40" style={{ backgroundColor: CHAT_ACCENT }}>
                  {sending ? <MukaiLoaderWheel size={20} isLight={false} /> : <ArrowUp size={21} strokeWidth={2.6} />}
                </button>
              </form>
            </>
          )}
        </section>
      </div>

    </main>
  );
};

export default MessagesPage;
