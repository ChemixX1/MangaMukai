import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react';
import { getFluentEmojiCDN } from '@lobehub/fluent-emoji';
import { ChevronDown, CornerDownRight, Loader2, User as UserIcon, X } from 'lucide-react';

import {
  getMangaComments,
  notifyCommentReaction,
  postMangaComment,
  setEntityReaction,
  type MangaComment,
} from '../../services/communityService';
import { getStoredToken } from '../../services/authService';
import { PROFILE_UPDATED_EVENT, type ProfileUpdatedDetail } from '../../services/wordpressService';
import { useTheme } from '../../hooks/useTheme';
import {
  CommentFireActiveIcon,
  CommentReplyIcon,
  CommentsHeadingIcon,
  PublishIcon,
  ShowAllIcon,
} from './designIcons';

import { EditorUndoIcon, EditorRedoIcon, EditorBoldIcon, EditorItalicIcon, EditorUnderlineIcon, EditorStrikeIcon, EditorSmileIcon, EditorGifIcon } from './referenceIcons';
import { MANGA_REACTIONS, ReactionIcon, type MangaReactionId } from './reactions';
import '../../styles/manga-comments.css';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

type CommentReactionId = MangaReactionId | 'fire';

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

/** Antigüedad del comentario, conservando la fecha completa en el atributo title. */
const formatCommentDate = (value: string) => {
  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  if (!Number.isFinite(date.getTime())) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Hace un momento';
  const [amount, unit] = seconds < 3600 ? [Math.floor(seconds / 60), 'minuto'] : seconds < 86400 ? [Math.floor(seconds / 3600), 'hora'] : seconds < 2592000 ? [Math.floor(seconds / 86400), 'día'] : seconds < 31536000 ? [Math.floor(seconds / 2592000), 'mes'] : [Math.floor(seconds / 31536000), 'año'];
  return 'Hace ' + amount + ' ' + unit + (amount === 1 ? '' : unit === 'mes' ? 'es' : 's');
};

/**
 * El editor escribe HTML (negrita, cursiva y subrayado, como en un procesador
 * de textos). Al guardar y al pintar solo se dejan pasar esas marcas: el resto
 * se escapa, así nada de lo que escriba un lector llega al DOM como etiqueta.
 */
const RICH_TAGS = ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'br'];
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

const readActiveFormats = () => new Set(['bold', 'italic', 'underline', 'strikeThrough'].filter((command) => document.queryCommandState(command)));

/** Editor compartido por comentarios y respuestas, con formato y selectores reales. */
const CommentEditor = ({ value, onChange, sticker, onStickerChange, label, placeholder, forceDark, autoFocus = false, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  sticker: CommentSticker | null;
  onStickerChange: (sticker: CommentSticker | null) => void;
  label: string;
  placeholder: string;
  forceDark: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}) => {
  const { theme } = useTheme();
  const [tool, setTool] = useState<'emojis' | 'stickers' | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const isEmpty = !richTextToPlain(value);

  useEffect(() => {
    if (!value && editorRef.current) editorRef.current.innerHTML = '';
  }, [value]);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

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

  const applyFormat = (command: 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'undo' | 'redo') => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    editor.focus();
    const selection = window.getSelection();
    if (savedRange.current && editor.contains(savedRange.current.startContainer) && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    document.execCommand(command);
    onChange(editor.innerHTML);
    setActiveFormats(readActiveFormats());
  };

  /** Escribe en el cursor guardado o, si aún no se ha tocado el editor, al final. */
  const insertAtCaret = (text: string) => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
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
    onChange(editor.innerHTML);
  };

  return (
        <div className="manga-comment-editor-box">
          <div ref={toolsRef} className="manga-comment-toolbar">
            {([['Deshacer', EditorUndoIcon, 'undo'], ['Rehacer', EditorRedoIcon, 'redo'], ['Negrita', EditorBoldIcon, 'bold'], ['Cursiva', EditorItalicIcon, 'italic'], ['Subrayado', EditorUnderlineIcon, 'underline'], ['Tachado', EditorStrikeIcon, 'strikeThrough']] as const).map(([label, Icon, command]) => (
              <button key={label} type="button" disabled={disabled} aria-label={label} title={label} aria-pressed={command === 'undo' || command === 'redo' ? undefined : activeFormats.has(command)} onMouseDown={event => event.preventDefault()} onClick={() => applyFormat(command)}><Icon size={12} /></button>
            ))}
            <span className="flex-1" />
            <button type="button" disabled={disabled} aria-label="Emojis" aria-expanded={tool === 'emojis'} onMouseDown={event => event.preventDefault()} onClick={() => setTool(current => current === 'emojis' ? null : 'emojis')}><EditorSmileIcon size={14} /></button>
            <button type="button" disabled={disabled} aria-label="Stickers" aria-expanded={tool === 'stickers'} onMouseDown={event => event.preventDefault()} onClick={() => setTool(current => current === 'stickers' ? null : 'stickers')}><EditorGifIcon size={14} /></button>
          {tool === 'emojis' && (
            <div className="manga-comment-picker absolute bottom-full right-0 z-30 mb-2 w-[min(360px,calc(100vw-32px))] drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
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
            <div className="manga-comment-picker absolute bottom-full right-0 z-30 mb-2 max-h-[360px] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-zinc-400/40 bg-surface p-3 shadow-xl">
              <div className="grid grid-cols-4 gap-2">
                {COMMENT_STICKERS.map((item) => (
                  <button key={item.url} type="button" onClick={() => { onStickerChange(item); setTool(null); }} title={item.name} aria-label={item.name} className="flex aspect-square items-center justify-center rounded-xl border border-zinc-400/25 p-2 transition-colors hover:border-mukai-magenta/60">
                    <img src={item.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          )}

          </div>
          <div className="manga-comment-editor-content">
            {isEmpty && <span aria-hidden="true" className="manga-comment-placeholder">{placeholder}</span>}
            <div ref={editorRef} role="textbox" aria-multiline="true" aria-label={label} aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning onInput={event => onChange((event.target as HTMLDivElement).innerHTML)} onPaste={event => { event.preventDefault(); insertAtCaret(event.clipboardData.getData('text/plain')); }} className="manga-comment-editor" />
            {sticker && <div className="manga-comment-sticker"><img src={sticker.url} alt={sticker.name} /><button type="button" onClick={() => onStickerChange(null)} aria-label="Quitar sticker"><X size={14} /></button></div>}
          </div>
        </div>
  );
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
 * las respuestas anidadas de la referencia. Con `chapterId` son los comentarios de ese capítulo.
 */
export const MangaComments = ({ mangaId, initialComments, chapterId, loading = false, loadError = '', forceDark = false }: {
  loading?: boolean;
  loadError?: string;
  mangaId: string;
  initialComments: MangaComment[];
  chapterId?: string;
  /** Permite sincronizar el selector de emojis cuando un contenedor fuerza el tema oscuro. */
  forceDark?: boolean;
}) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<MangaComment[]>(initialComments);
  const [content, setContent] = useState('');
  const [sticker, setSticker] = useState<CommentSticker | null>(null);
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<MangaComment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySticker, setReplySticker] = useState<CommentSticker | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [openReplies, setOpenReplies] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  // Reacción que se está pintando ahora mismo (comentario:reaccion).
  const [painted, setPainted] = useState<string | null>(null);
  // Solo la última petición de cada comentario puede reconciliar su reacción.
  const reactionSequences = useRef(new Map<number, number>());
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
    if (richTextToPlain(trimmed.replace(STICKER_TOKEN, '')).length > 1000) { setError('El comentario no puede superar los 1000 caracteres.'); return false; }
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
      if (!next || next === 'like') void notifyCommentReaction(comment.id, null);
      else if (next === 'fire' || next === 'love' || next === 'haha' || next === 'sad') void notifyCommentReaction(comment.id, next);
    } catch {
      if (reactionSequences.current.get(comment.id) === sequence) await reload();
    }
  };

  const toggleReplies = (id: number) => setOpenReplies(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const renderComment = (comment: MangaComment, parent?: MangaComment) => {
    const replies = repliesByParent.get(comment.id) || [];
    const username = comment.profiles?.username || 'Lector';
    const isLong = richTextToPlain(comment.content.replace(STICKER_TOKEN, '')).length > 350;
    const isExpanded = expanded.has(comment.id);
    return (
      <li key={comment.id} className={parent ? 'manga-comment is-reply' : 'manga-comment'}>
        {parent && <p className="manga-comment-context"><CornerDownRight size={12} aria-hidden="true" />Respondiendo a <Link to={'/usuarios/' + parent.user_id}>{parent.profiles?.username || 'Lector'}</Link></p>}
        <div className="manga-comment-row">
          <Link to={'/usuarios/' + comment.user_id} aria-label={'Ver perfil de ' + username} className="manga-comment-avatar">
            {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" loading="lazy" /> : <UserIcon size={20} />}
          </Link>
          <article className="manga-comment-article">
            <header>
              <h3><Link to={'/usuarios/' + comment.user_id}>{username}</Link></h3>
              {comment.profiles?.is_pro && <span className="manga-comment-pro">Pro</span>}
              <time dateTime={comment.created_at} title={new Date(comment.created_at).toLocaleString('es-PE')}>{formatCommentDate(comment.created_at)}</time>
            </header>
            <CommentBody content={comment.content} className={'manga-comment-body ' + (isLong && !isExpanded ? 'line-clamp-5' : '')} />
            {isLong && <button type="button" className="manga-comment-expand" onClick={() => setExpanded(current => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next; })}>{isExpanded ? 'Ver menos' : 'Ver todo'}</button>}
            <footer className="manga-comment-actions">
              {MANGA_REACTIONS.map(reaction => {
                const count = comment.reactions?.[reaction.id] || 0;
                const mine = comment.my_reaction === reaction.id;
                const painting = painted === comment.id + ':' + reaction.id;
                return (
                  <button key={reaction.id} type="button" className={'manga-comment-reaction' + (painting ? ' is-reacting' : '')} data-reaction={reaction.id} onClick={() => void react(comment, reaction.id)} aria-label={reaction.label + (mine ? ': ' + count : '')} aria-pressed={mine} title={reaction.label}>
                    <ReactionIcon id={reaction.id} className="manga-comment-reaction-icon" />
                    {mine && <span className="manga-comment-reaction-count">{count}</span>}
                  </button>
                );
              })}
              {((comment.reactions?.fire || 0) > 0 || comment.my_reaction === 'fire') && <button type="button" className="manga-comment-reaction" data-reaction="fire" title="Candente" aria-label={'Candente' + (comment.my_reaction === 'fire' ? ': ' + (comment.reactions?.fire || 0) : '')} aria-pressed={comment.my_reaction === 'fire'} onClick={() => void react(comment, 'fire')}><CommentFireActiveIcon size={23} />{comment.my_reaction === 'fire' && <span className="manga-comment-reaction-count">{comment.reactions?.fire || 0}</span>}</button>}
              <button type="button" className="manga-comment-reply" aria-expanded={replyTo?.id === comment.id} onClick={() => { if (requireSession()) { setReplyTo(replyTo?.id === comment.id ? null : comment); setReplyContent(''); setReplySticker(null); setError(''); } }}><CommentReplyIcon size={22} />Responder</button>
            </footer>
            {!!replies.length && <button type="button" className="manga-comment-toggle" aria-expanded={openReplies.has(comment.id)} onClick={() => toggleReplies(comment.id)}><ChevronDown size={16} aria-hidden="true" className={openReplies.has(comment.id) ? 'rotate-180' : ''} />{openReplies.has(comment.id) ? 'Ocultar Respuestas' : 'Ver Respuestas (' + replies.length + ')'}</button>}
            {replyTo?.id === comment.id && (
              <form className="manga-comment-reply-form" onSubmit={async event => {
                event.preventDefault();
                const html = sanitizeRichText(replyContent);
                const body = replySticker ? html + (html ? '<br>' : '') + '[sticker:' + replySticker.url + ']' : html;
                if (await publish(body, comment.id)) {
                  setReplyContent(''); setReplySticker(null); setReplyTo(null);
                  setOpenReplies(current => new Set(current).add(comment.id));
                }
              }}>
                <CommentEditor value={replyContent} onChange={setReplyContent} sticker={replySticker} onStickerChange={setReplySticker} label={'Responder a ' + username} placeholder="Escribe tu respuesta..." forceDark={forceDark} autoFocus disabled={posting} />
                <div className="manga-comment-reply-publish"><span className={richTextToPlain(replyContent).length > 1000 ? 'text-red-500' : ''}>{richTextToPlain(replyContent).length}/1000</span><button type="button" disabled={posting} onClick={() => { setReplyTo(null); setError(''); }}>Cancelar</button><button type="submit" disabled={(!richTextToPlain(replyContent) && !replySticker) || posting || richTextToPlain(replyContent).length > 1000}>{posting && <Loader2 size={12} className="animate-spin" />}Responder</button></div>
                {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
              </form>
            )}
          </article>
        </div>
        {!!replies.length && openReplies.has(comment.id) && <ul className="manga-comment-replies">{replies.map(reply => renderComment(reply, comment))}</ul>}
      </li>
    );
  };

  return (
    <section id="comentarios" aria-label="Comentarios" className={'manga-comments manga-comments-reference scroll-mt-4 text-ink lg:scroll-mt-28' + (forceDark ? ' is-dark' : '')}>
      <h2 className="manga-comments-heading">
        <CommentsHeadingIcon size={33} className="text-ink" />
        {chapterId ? 'COMENTARIOS DEL CAPÍTULO' : 'COMENTARIOS'} <span className="text-mukai-magenta">({loading ? '…' : comments.length})</span>
      </h2>

      <form className="manga-comment-composer" onSubmit={async event => {
        event.preventDefault();
        const html = sanitizeRichText(content);
        const body = sticker ? html + (html ? '<br>' : '') + '[sticker:' + sticker.url + ']' : html;
        if (await publish(body, null)) {
          setContent(''); setSticker(null);
        }
      }}>
        <CommentEditor value={content} onChange={setContent} sticker={sticker} onStickerChange={setSticker} label="Escribe tu comentario" placeholder="Comparte tu opinión..." forceDark={forceDark} disabled={posting} />
        <div className="manga-comment-publish">
          <span className={richTextToPlain(content).length > 1000 ? 'text-red-500' : ''}>{richTextToPlain(content).length}/1000</span>
          <button type="submit" disabled={(isEmpty && !sticker) || posting || richTextToPlain(content).length > 1000}>{posting ? <Loader2 size={16} className="animate-spin" /> : <PublishIcon size={20} />}Publicar</button>
        </div>
        {error && !replyTo && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
      </form>

      {loading ? <p role="status" className="py-12 text-center text-sm text-ink/50">Cargando comentarios…</p> : loadError ? <p role="alert" className="py-12 text-center text-sm text-red-500">{loadError}</p> : topLevel.length === 0 ? (
        <p className="mt-6 text-center font-montserrat text-xs text-ink/50 lg:text-sm">¡Sé el primero en compartir tu opinión!</p>
      ) : (
        <>
          <ul className="manga-comment-list">{visible.map((comment) => renderComment(comment))}</ul>
          {topLevel.length > VISIBLE_COMMENTS && (
            <button type="button" onClick={() => setShowAll((current) => !current)} className="manga-show-all">
              {showAll ? 'Mostrar Menos' : 'Mostrar Todos'}
              <ShowAllIcon size={20} className={showAll ? 'rotate-180' : ''} />
            </button>
          )}
        </>
      )}
    </section>
  );
};
