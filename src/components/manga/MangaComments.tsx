import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react';
import { getFluentEmojiCDN } from '@lobehub/fluent-emoji';
import { Bold, Italic, Loader2, Send, Smile, Sticker, Underline, User as UserIcon, X } from 'lucide-react';

import {
  getMangaComments,
  notifyCommentReaction,
  postMangaComment,
  setEntityReaction,
  type MangaComment,
} from '../../services/communityService';
import { getStoredToken, getStoredUser } from '../../services/authService';
import { PROFILE_UPDATED_EVENT, type ProfileUpdatedDetail } from '../../services/wordpressService';
import { useTheme } from '../../hooks/useTheme';
import {
  CommentFireActiveIcon,
  CommentFireIcon,
  CommentLaughActiveIcon,
  CommentLaughIcon,
  CommentLikeActiveIcon,
  CommentLikeIcon,
  CommentLoveActiveIcon,
  CommentLoveIcon,
  CommentReplyIcon,
  CommentsHeadingIcon,
  ComposerPromptIcon,
  PublishIcon,
  ShowAllIcon,
} from './designIcons';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

/** Reacciones de cada comentario, en el orden y los colores del diseño. */
const COMMENT_REACTIONS = [
  { id: 'like', Icon: CommentLikeIcon, ActiveIcon: CommentLikeActiveIcon, label: 'Me gusta', color: '#00C9F1' },
  { id: 'love', Icon: CommentLoveIcon, ActiveIcon: CommentLoveActiveIcon, label: 'Me encanta', color: '#FF008C' },
  { id: 'fire', Icon: CommentFireIcon, ActiveIcon: CommentFireActiveIcon, label: 'Candente', color: '#FB5937' },
  { id: 'haha', Icon: CommentLaughIcon, ActiveIcon: CommentLaughActiveIcon, label: 'Me divierte', color: '#FFCD0F' },
] as const;

type CommentReactionId = (typeof COMMENT_REACTIONS)[number]['id'];

const VISIBLE_COMMENTS = 4;

/** Stickers 3D de Fluent: el comentario los guarda como `[sticker:url]`. */
const COMMENT_STICKERS = ([
  ['🫶', 'Corazón con manos'], ['🫠', 'Derretido'], ['💀', 'Calavera'], ['💅', 'Icónico'],
  ['💯', 'Cien'], ['🤯', 'Impactado'], ['🥹', 'Emocionado'], ['😭', 'Llorando'],
  ['🔥', 'Fuego'], ['💜', 'Corazón morado'], ['💘', 'Flechazo'], ['😍', 'Me encanta'],
  ['🥳', 'Fiesta'], ['🎉', 'Confeti'], ['✨', 'Brillos'], ['🚀', 'Cohete'],
  ['👑', 'Corona'], ['😎', 'Genial'], ['🥶', 'Congelado'], ['🤡', 'Payaso'],
  ['🙄', 'Mirada'], ['🤝', 'Trato'], ['🤗', 'Abrazo'], ['🧋', 'Bubble tea'],
] as const).map(([emoji, name]) => ({ name, url: getFluentEmojiCDN(emoji, { cdn: 'unpkg', type: '3d' }) }));

type CommentSticker = (typeof COMMENT_STICKERS)[number];

const STICKER_TOKEN = /(\[sticker:https:\/\/[^\]]+\])/g;
/** Stickers de Twemoji de la versión anterior, que siguen en comentarios guardados. */
const LEGACY_STICKER_PREFIX = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@';

/** Solo se pintan como imagen los stickers conocidos; cualquier otra URL se queda como texto. */
const stickerFromToken = (token: string) => {
  const url = token.slice('[sticker:'.length, -1);
  const known = COMMENT_STICKERS.find((sticker) => sticker.url === url);
  if (known) return known;
  return url.startsWith(LEGACY_STICKER_PREFIX) ? { url, name: 'Sticker' } : null;
};

/** Variables del selector de emojis con los colores de la web. */
const EMOJI_PICKER_STYLE = {
  '--epr-emoji-size': '30px',
  '--epr-picker-border-color': 'rgba(255, 0, 140, 0.25)',
  '--epr-picker-border-radius': '14px',
  fontFamily: 'Montserrat, sans-serif',
} as CSSProperties;

/** "14/06": día y mes, como en el diseño. */
const formatCommentDate = (value: string) => {
  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};

/**
 * El editor escribe HTML (negrita, cursiva y subrayado, como en un procesador
 * de textos). Al guardar y al pintar solo se dejan pasar esas marcas: el resto
 * se escapa, así nada de lo que escriba un lector llega al DOM como etiqueta.
 */
const RICH_TAGS = ['b', 'strong', 'i', 'em', 'u', 'br'];
const sanitizeRichText = (html: string) => {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  const walk = (node: Node): string => Array.from(node.childNodes).map((child) => {
    if (child.nodeType === Node.TEXT_NODE) return (child.textContent || '').replace(/[<>&]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[character] as string));
    if (child.nodeType !== Node.ELEMENT_NODE) return '';
    const element = child as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === 'br') return '<br>';
    if (tag === 'div' || tag === 'p') return `${walk(element)}<br>`;
    const inner = walk(element);
    return RICH_TAGS.includes(tag) ? `<${tag}>${inner}</${tag}>` : inner;
  }).join('');
  return walk(holder).replace(/(<br>)+$/, '').trim();
};

/** Texto plano del editor, para saber si hay algo que publicar. */
const richTextToPlain = (html: string) => html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();

const readActiveFormats = () => new Set(['bold', 'italic', 'underline'].filter((command) => document.queryCommandState(command)));

const handleOf = (username: string) => `@${username.toLocaleLowerCase('es').replace(/\s+/g, '_')}`;

/** Cuerpo del nombre y de la arroba: bajan con los nombres largos y en las respuestas para caber en una línea. */
const headSizes = (isReply: boolean, isLongName: boolean) => {
  if (isReply) return isLongName ? ['text-[10px] lg:text-sm', 'text-[8px] lg:text-xs'] : ['text-[11px] lg:text-sm', 'text-[9px] lg:text-xs'];
  return isLongName ? ['text-[11px] lg:text-base', 'text-[9px] lg:text-sm'] : ['text-[13px] lg:text-base', 'text-[11px] lg:text-sm'];
};

/** Texto del comentario con sus stickers intercalados. */
const CommentBody = ({ content, className }: { content: string; className: string }) => (
  <p className={className}>
    {content.split(STICKER_TOKEN).filter(Boolean).map((part, index) => {
      const sticker = part.startsWith('[sticker:') ? stickerFromToken(part) : null;
      return sticker
        ? <img key={index} src={sticker.url} alt={sticker.name} title={sticker.name} loading="lazy" className="my-1 mr-2 inline-block h-12 w-12 object-contain align-middle lg:h-[72px] lg:w-[72px]" />
        : <span key={index} dangerouslySetInnerHTML={{ __html: sanitizeRichText(part) }} />;
    })}
  </p>
);

/**
 * Comentarios de la ficha y del lector (móvil y escritorio): el cuadro para
 * escribir con su barra de formato, emojis y stickers y, debajo, los hilos con
 * el rail rosa que baja del avatar hasta las respuestas, sangradas en una
 * tarjeta más estrecha. Con `chapterId` son los comentarios de ese capítulo.
 */
export const MangaComments = ({ mangaId, initialComments, chapterId, loading = false, loadError = '', forceDark = false }: {
  loading?: boolean;
  loadError?: string;
  mangaId: string;
  initialComments: MangaComment[];
  chapterId?: string;
  /** La ficha móvil va siempre en oscuro: el selector de emojis también. */
  forceDark?: boolean;
}) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [comments, setComments] = useState<MangaComment[]>(initialComments);
  const [content, setContent] = useState('');
  const [sticker, setSticker] = useState<CommentSticker | null>(null);
  const [tool, setTool] = useState<'emojis' | 'stickers' | null>(null);
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<MangaComment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  // Reacción que se está pintando ahora mismo (comentario:reaccion).
  const [painted, setPainted] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  // Última posición del cursor en el editor: los emojis se insertan ahí aunque el foco pase al selector.
  const savedRange = useRef<Range | null>(null);
  // Solo la última petición de cada comentario puede reconciliar su reacción.
  const reactionSequences = useRef(new Map<number, number>());
  const currentUser = getStoredUser();
  const isEmpty = !richTextToPlain(content);

  useEffect(() => { setComments(initialComments); }, [initialComments]);

  // Nombre y foto al día si el lector edita su perfil con la ficha abierta.
  useEffect(() => {
    const updateProfile = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      if (!detail?.userId) return;
      setComments((current) => current.map((comment) => (String(comment.user_id) === detail.userId
        ? {
            ...comment,
            profiles: {
              ...comment.profiles,
              ...(detail.username ? { username: detail.username } : {}),
              ...(detail.avatarUrl ? { avatar_url: detail.avatarUrl } : {}),
            },
          }
        : comment)));
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, updateProfile);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, updateProfile);
  }, []);

  // Formato activo donde está el cursor, para resaltar sus botones, y la posición del cursor.
  useEffect(() => {
    const sync = () => {
      const editor = editorRef.current;
      const selection = document.getSelection();
      if (!editor || !selection?.rangeCount || !editor.contains(selection.anchorNode)) return;
      savedRange.current = selection.getRangeAt(0).cloneRange();
      setActiveFormats(readActiveFormats());
    };
    document.addEventListener('selectionchange', sync);
    return () => document.removeEventListener('selectionchange', sync);
  }, []);

  // Los selectores de emojis y stickers se cierran al pulsar fuera de ellos.
  useEffect(() => {
    if (!tool) return;
    const close = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) setTool(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tool]);

  const applyFormat = (command: 'bold' | 'italic' | 'underline') => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command);
    setContent(editor.innerHTML);
    setActiveFormats(readActiveFormats());
  };

  /** Escribe en el cursor guardado o, si aún no se ha tocado el editor, al final. */
  const insertAtCaret = (text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (selection) {
      const saved = savedRange.current && editor.contains(savedRange.current.startContainer) ? savedRange.current : null;
      const range = saved ?? document.createRange();
      if (!saved) {
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
    document.execCommand('insertText', false, text);
    setContent(editor.innerHTML);
  };

  const repliesByParent = useMemo(() => {
    const map = new Map<number, MangaComment[]>();
    comments.forEach((comment) => {
      if (!comment.parent_id) return;
      map.set(comment.parent_id, [...(map.get(comment.parent_id) || []), comment]);
    });
    return map;
  }, [comments]);

  const topLevel = useMemo(() => comments.filter((comment) => !comment.parent_id), [comments]);
  const visible = showAll ? topLevel : topLevel.slice(0, VISIBLE_COMMENTS);

  const requireSession = () => {
    if (getStoredToken()) return true;
    navigate('/auth/login', { state: { returnTo: `${window.location.pathname}${window.location.search}` } });
    return false;
  };

  const reload = async () => setComments(await getMangaComments(mangaId, chapterId));

  const publish = async (body: string, parentId: number | null) => {
    const trimmed = body.trim();
    if (!richTextToPlain(trimmed) || posting) return false;
    if (!requireSession()) return false;
    setPosting(true);
    setError('');
    const created = await postMangaComment(mangaId, trimmed, parentId, chapterId);
    setPosting(false);
    if (!created) { setError('No se pudo publicar tu comentario. Inténtalo otra vez.'); return false; }
    await reload();
    return true;
  };

  // Optimista: el contador cambia en el mismo toque y la red solo confirma.
  const react = async (comment: MangaComment, reactionId: CommentReactionId) => {
    if (!requireSession()) return;
    const next = comment.my_reaction === reactionId ? '' : reactionId;
    if (next) {
      const key = `${comment.id}:${reactionId}`;
      setPainted(key);
      window.setTimeout(() => setPainted((current) => (current === key ? null : current)), 520);
    }
    const sequence = (reactionSequences.current.get(comment.id) || 0) + 1;
    reactionSequences.current.set(comment.id, sequence);
    setComments((current) => current.map((item) => {
      if (item.id !== comment.id) return item;
      const reactions = { ...(item.reactions || {}) };
      if (item.my_reaction) reactions[item.my_reaction] = Math.max(0, (reactions[item.my_reaction] || 0) - 1);
      if (next) reactions[next] = (reactions[next] || 0) + 1;
      return { ...item, reactions, my_reaction: next };
    }));
    try {
      const result = await setEntityReaction('comment', comment.id, next);
      if (reactionSequences.current.get(comment.id) !== sequence) return;
      setComments((current) => current.map((item) => (item.id === comment.id
        ? { ...item, reactions: result.reactions, my_reaction: result.my_reaction }
        : item)));
      // El autor recibe el aviso de la reacción (el "me gusta" lo avisa el propio servidor).
      void notifyCommentReaction(comment.id, next && next !== 'like' ? next : null);
    } catch {
      if (reactionSequences.current.get(comment.id) === sequence) await reload();
    }
  };

  const renderComment = (comment: MangaComment, isReply = false) => {
    const replies = repliesByParent.get(comment.id) || [];
    const username = comment.profiles?.username || 'Lector';
    const isLong = richTextToPlain(comment.content.replace(STICKER_TOKEN, '')).length > (isReply ? 90 : 150);
    const isExpanded = expanded.has(comment.id);
    const [authorSize, handleSize] = headSizes(isReply, username.length > 12);
    const avatarSize = isReply ? 40 : 48;

    return (
      <li key={comment.id} className="relative">
        <div className="flex items-stretch gap-3">
          {/* Columna del avatar: se estira hasta el final de la tarjeta para que
              el rail rosa arranque justo debajo de la foto y llegue a las respuestas. */}
          <div className="relative flex shrink-0 flex-col items-center self-stretch">
            <Link
              to={`/usuarios/${comment.user_id}`}
              aria-label={`Ver perfil de ${username}`}
              className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-300 text-black/40 transition-transform hover:scale-105"
              style={{ height: avatarSize, width: avatarSize }}
            >
              {comment.profiles?.avatar_url
                ? <img src={comment.profiles.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                : <UserIcon size={avatarSize / 2} />}
            </Link>
            {replies.length > 0 && <span aria-hidden="true" className="absolute bottom-0 left-1/2 w-px -translate-x-1/2 bg-mukai-magenta" style={{ top: avatarSize }} />}
          </div>

          <article className={`flex min-w-0 flex-1 flex-col rounded-2xl border-[0.5px] border-zinc-300/60 bg-surface px-3.5 py-2 max-[400px]:px-2.5 lg:px-5 lg:py-3 ${isReply ? 'min-h-28' : 'min-h-[119px]'}`}>
            <header className="flex min-w-0 items-baseline gap-x-1.5">
              <h3 className={`min-w-0 max-w-[58%] flex-[0_1_auto] truncate pr-0.5 font-montserrat font-black italic leading-[30px] text-ink ${authorSize}`}>
                <Link to={`/usuarios/${comment.user_id}`} className="transition-colors hover:text-mukai-magenta">{username}</Link>
              </h3>
              {comment.profiles?.is_pro && (
                <span className="shrink-0 self-center rounded-full bg-mukai-magenta/15 px-1.5 font-montserrat text-[7px] font-black uppercase leading-4 text-mukai-magenta lg:text-[9px]">Pro</span>
              )}
              <span className={`min-w-0 flex-[0_1_auto] truncate pr-0.5 text-center font-montserrat font-extralight italic leading-[30px] text-ink/[.64] ${handleSize}`}>{handleOf(username)}</span>
              <span className="ml-auto shrink-0 text-justify font-montserrat text-[8px] font-normal not-italic leading-3 text-ink lg:text-[11px]">{formatCommentDate(comment.created_at)}</span>
            </header>

            <div className="relative mt-1">
              <CommentBody
                content={comment.content}
                className={`whitespace-pre-wrap text-justify font-montserrat font-normal leading-3 text-ink [overflow-wrap:anywhere] lg:leading-5 ${isReply ? 'text-[8px] lg:text-xs' : 'text-[9px] lg:text-[13px]'} ${isLong && !isExpanded ? (isReply ? 'line-clamp-2' : 'line-clamp-3') : ''}`}
              />
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next; })}
                  className="absolute bottom-0 right-0 bg-surface pl-2.5 font-montserrat text-[7px] font-normal leading-3 text-mukai-magenta underline lg:text-[11px] lg:leading-5"
                >
                  {isExpanded ? 'Ver menos' : 'Ver Todo'}
                </button>
              )}
            </div>

            <footer className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-0 lg:gap-x-4">
              {COMMENT_REACTIONS.map((reaction) => {
                const count = comment.reactions?.[reaction.id] || 0;
                const mine = comment.my_reaction === reaction.id;
                const painting = painted === `${comment.id}:${reaction.id}`;
                return (
                  <button
                    key={reaction.id}
                    type="button"
                    onClick={() => void react(comment, reaction.id)}
                    aria-label={`${reaction.label}: ${count}`}
                    aria-pressed={mine}
                    title={reaction.label}
                    className="flex items-center gap-1 font-anta text-sm font-normal leading-4 text-ink"
                    style={mine ? { color: reaction.color } : undefined}
                  >
                    <span className="relative inline-flex h-[15px] w-[15px]">
                      <reaction.Icon size={15} className="absolute inset-0 text-ink" />
                      {/* La versión a color se pinta de abajo arriba al elegirla. */}
                      <span className={`absolute inset-0 block ${painting ? 'animate-paint opacity-100 motion-reduce:animate-none motion-reduce:[clip-path:inset(0)]' : mine ? 'opacity-100 [clip-path:inset(0)]' : 'opacity-0 [clip-path:inset(100%_0_0_0)]'}`}>
                        <reaction.ActiveIcon size={15} />
                      </span>
                    </span>
                    {count}
                  </button>
                );
              })}
              {!isReply && (
                <button
                  type="button"
                  onClick={() => { if (requireSession()) { setReplyTo(replyTo?.id === comment.id ? null : comment); setReplyContent(''); } }}
                  className="ml-auto flex shrink-0 items-center gap-1.5 font-montserrat text-xs font-semibold leading-8 text-ink transition-colors hover:text-mukai-magenta lg:text-[13px]"
                >
                  <CommentReplyIcon size={20} />
                  Responder
                </button>
              )}
            </footer>

            {replyTo?.id === comment.id && (
              <form
                className="mt-2 border-t border-ink/10 pt-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (await publish(replyContent, comment.id)) { setReplyContent(''); setReplyTo(null); }
                }}
              >
                <textarea
                  value={replyContent}
                  onChange={(event) => setReplyContent(event.target.value)}
                  maxLength={500}
                  rows={2}
                  autoFocus
                  placeholder={`Responder a ${username}`}
                  className="w-full resize-none rounded-lg bg-ink/[0.06] p-2 font-montserrat text-[11px] text-ink caret-mukai-magenta outline-none placeholder:text-ink/30 lg:text-sm"
                />
                <div className="mt-1.5 flex justify-end gap-2">
                  <button type="button" onClick={() => setReplyTo(null)} className="rounded-full px-3 py-1 font-montserrat text-[10px] text-ink/60 lg:text-xs">Cancelar</button>
                  <button type="submit" disabled={!replyContent.trim() || posting} className="inline-flex items-center gap-1.5 rounded-lg bg-mukai-magenta px-3 py-1.5 font-montserrat text-[10px] font-bold text-white disabled:opacity-40 lg:text-xs">
                    {posting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Responder
                  </button>
                </div>
              </form>
            )}
          </article>
        </div>

        {/* Respuestas: sangradas, con el codo que sale del rail del comentario. */}
        {replies.length > 0 && (
          <ul className="mt-[31px] flex flex-col gap-5 pl-[60px] max-[400px]:pl-[30px]">
            {replies.map((reply) => (
              // El codo: continúa el rail del comentario y dobla hacia el avatar de la respuesta.
              <div key={reply.id} className="relative before:absolute before:-left-[38px] before:-top-5 before:h-10 before:w-px before:bg-mukai-magenta before:content-[''] first:before:-top-[31px] first:before:h-[51px] after:absolute after:-left-[38px] after:top-5 after:h-px after:w-[38px] after:bg-mukai-magenta after:content-['']">
                {renderComment(reply, true)}
              </div>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <section id="comentarios" aria-label="Comentarios" className="scroll-mt-4 text-ink lg:scroll-mt-28">
      <h2 className="flex items-center justify-center gap-2.5 font-montserrat text-xl font-black leading-5 lg:text-2xl">
        <CommentsHeadingIcon size={44} className="text-ink" />
        {chapterId ? 'COMENTARIOS DEL CAPÍTULO' : 'COMENTARIOS'} <span className="text-mukai-magenta">({loading ? '…' : comments.length})</span>
      </h2>

      {/* Caja para escribir */}
      <form
        className="ml-[7.0455%] mt-[41px] min-h-[164px] w-[87.2727%] rounded-2xl border-[0.5px] border-zinc-400/60 bg-surface py-[15px] pl-[22px] pr-4 lg:ml-0 lg:mt-8 lg:w-full lg:px-6 lg:py-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const html = sanitizeRichText(content);
          const body = sticker ? `${html}${html ? '<br>' : ''}[sticker:${sticker.url}]` : html;
          if (await publish(body, null)) {
            setContent('');
            setSticker(null);
            setTool(null);
            if (editorRef.current) editorRef.current.innerHTML = '';
          }
        }}
      >
        {/* Editor con formato: negrita, cursiva y subrayado se aplican sobre el
            texto seleccionado, como en un procesador de textos. */}
        <div className="relative">
          {/* Marcador de posición: reaparece en cuanto la caja vuelve a quedar vacía. */}
          {isEmpty && (
            <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 flex items-start gap-2 pl-6 font-montserrat text-xs font-medium leading-5 text-ink/50 lg:text-sm lg:leading-6">
              <ComposerPromptIcon size={16} className="absolute left-0 top-0.5 mt-0.5 shrink-0 lg:top-1" />
              ¿Qué te pareció{currentUser?.username ? `, ${currentUser.username}` : ''}?
            </span>
          )}
          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Escribe tu comentario"
            contentEditable
            suppressContentEditableWarning
            onInput={(event) => setContent((event.target as HTMLDivElement).innerHTML)}
            className="min-h-20 w-full bg-transparent pl-6 font-montserrat text-xs font-medium leading-5 text-ink caret-mukai-magenta outline-none lg:min-h-24 lg:text-sm lg:leading-6"
          />
        </div>

        {sticker && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-zinc-400/40 px-1.5 py-1">
            <img src={sticker.url} alt={sticker.name} className="h-[46px] w-[46px] object-contain" />
            <button type="button" onClick={() => setSticker(null)} aria-label="Quitar sticker" className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink">
              <X size={14} />
            </button>
          </div>
        )}

        {/* La línea separadora solo cubre los botones de formato, no todo el ancho. */}
        <div ref={toolsRef} className="relative mt-[19px] flex items-center gap-2 before:absolute before:left-0 before:top-0 before:w-36 before:border-t-[0.5px] before:border-neutral-400/30 before:content-[''] max-[400px]:flex-wrap">
          {([['Negrita', Bold, 'bold'], ['Cursiva', Italic, 'italic'], ['Subrayado', Underline, 'underline']] as const).map(([label, Icon, command]) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-pressed={activeFormats.has(command)}
              // En mousedown, para que el editor no pierda la selección al pulsar.
              onMouseDown={(event) => { event.preventDefault(); applyFormat(command); }}
              className={`inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-ink transition-colors duration-[180ms] ${activeFormats.has(command) ? 'bg-ink/[.16]' : 'bg-transparent'}`}
            >
              <Icon size={18} strokeWidth={2.4} />
            </button>
          ))}
          <button
            type="button"
            aria-label="Emojis"
            aria-expanded={tool === 'emojis'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setTool((current) => (current === 'emojis' ? null : 'emojis'))}
            className={`transition-colors ${tool === 'emojis' ? 'text-mukai-magenta' : 'text-ink'}`}
          >
            <Smile size={18} />
          </button>
          <button
            type="button"
            aria-label="Stickers"
            aria-expanded={tool === 'stickers'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setTool((current) => (current === 'stickers' ? null : 'stickers'))}
            className={`transition-colors ${tool === 'stickers' ? 'text-mukai-magenta' : 'text-ink'}`}
          >
            <Sticker size={18} />
          </button>
          <button type="submit" disabled={(isEmpty && !sticker) || posting} className="ml-auto inline-flex h-8 items-center gap-2 rounded-lg bg-ink px-3 font-montserrat text-sm font-bold text-surface shadow-[1px_2px_1px_0_rgba(127,127,127,0.55)] disabled:opacity-40">
            {posting ? <Loader2 size={16} className="animate-spin" /> : <PublishIcon size={18} />}
            Publicar
          </button>

          {tool === 'emojis' && (
            <div className="absolute bottom-full left-0 z-30 mb-2 w-[min(360px,calc(100vw-32px))] drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
              <Suspense fallback={null}>
                <EmojiPicker
                  onEmojiClick={(data: EmojiClickData) => { insertAtCaret(data.emoji); setTool(null); }}
                  theme={(forceDark || theme === 'dark' ? 'dark' : 'light') as Theme}
                  emojiStyle={'native' as EmojiStyle}
                  lazyLoadEmojis
                  searchPlaceHolder="Buscar emoji"
                  previewConfig={{ showPreview: false }}
                  width="100%"
                  height={420}
                  style={EMOJI_PICKER_STYLE}
                />
              </Suspense>
            </div>
          )}
          {tool === 'stickers' && (
            <div className="absolute bottom-full left-0 z-30 mb-2 max-h-[360px] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-zinc-400/40 bg-surface p-3 shadow-xl">
              <div className="grid grid-cols-4 gap-2">
                {COMMENT_STICKERS.map((item) => (
                  <button key={item.url} type="button" onClick={() => { setSticker(item); setTool(null); }} title={item.name} aria-label={item.name} className="flex aspect-square items-center justify-center rounded-xl border border-zinc-400/25 p-2 transition-colors hover:border-mukai-magenta/60">
                    <img src={item.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {error && <p role="alert" className="mt-2 font-montserrat text-[10px] text-red-400 lg:text-xs">{error}</p>}
      </form>

      {loading ? <p role="status" className="py-12 text-center text-sm text-ink/50">Cargando comentarios…</p> : loadError ? <p role="alert" className="py-12 text-center text-sm text-red-500">{loadError}</p> : topLevel.length === 0 ? (
        <p className="mt-6 text-center font-montserrat text-xs text-ink/50 lg:text-sm">Aún no hay comentarios. ¡Sé el primero en compartir tu opinión!</p>
      ) : (
        <>
          <ul className="ml-[6.8182%] mt-[31px] flex w-[87.2727%] flex-col gap-[41px] max-[400px]:[&>li>div]:gap-2 lg:ml-0 lg:mt-10 lg:w-full lg:gap-10">{visible.map((comment) => renderComment(comment))}</ul>
          {topLevel.length > VISIBLE_COMMENTS && (
            <button type="button" onClick={() => setShowAll((current) => !current)} className="mx-auto mt-6 flex h-12 w-48 items-center justify-center gap-2 rounded-[20px] border-[0.5px] border-zinc-400/25 font-montserrat text-xs text-ink/75 lg:text-sm">
              {showAll ? 'Mostrar Menos' : 'Mostrar Todos'}
              <ShowAllIcon size={20} className={showAll ? 'rotate-180' : ''} />
            </button>
          )}
        </>
      )}
    </section>
  );
};
