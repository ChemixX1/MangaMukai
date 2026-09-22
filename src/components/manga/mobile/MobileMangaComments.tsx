import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bold, Italic, Loader2, Send, Smile, Sticker, Underline, User as UserIcon } from 'lucide-react';

import { getMangaComments, postMangaComment, setEntityReaction, type MangaComment } from '../../../services/communityService';
import { getStoredToken, getStoredUser } from '../../../services/authService';
import { CommentLikeIcon, CommentLoveIcon, CommentFireIcon, CommentLaughIcon, CommentLikeActiveIcon, CommentLoveActiveIcon, CommentFireActiveIcon, CommentLaughActiveIcon, CommentReplyIcon, CommentsHeadingIcon, ComposerPromptIcon, PublishIcon, ShowAllIcon } from './designIcons';

/** Reacciones de cada comentario, en el orden y los colores del diseño. */
const COMMENT_REACTIONS = [
  { id: 'like', Icon: CommentLikeIcon, ActiveIcon: CommentLikeActiveIcon, label: 'Me gusta', color: '#00C9F1' },
  { id: 'love', Icon: CommentLoveIcon, ActiveIcon: CommentLoveActiveIcon, label: 'Me encanta', color: '#FF008C' },
  { id: 'fire', Icon: CommentFireIcon, ActiveIcon: CommentFireActiveIcon, label: 'Candente', color: '#FB5937' },
  { id: 'haha', Icon: CommentLaughIcon, ActiveIcon: CommentLaughActiveIcon, label: 'Me divierte', color: '#FFCD0F' },
] as const;

type CommentReactionId = (typeof COMMENT_REACTIONS)[number]['id'];

const VISIBLE_COMMENTS = 4;

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

const handleOf = (username: string) => `@${username.toLocaleLowerCase('es').replace(/\s+/g, '_')}`;

const Avatar = ({ url, size }: { url?: string | null; size: number }) => (
  <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-300 text-black/40" style={{ height: size, width: size }}>
    {url ? <img src={url} alt="" aria-hidden="true" loading="lazy" className="h-full w-full object-cover" /> : <UserIcon size={Math.round(size * 0.5)} />}
  </span>
);

/**
 * Comentarios de la ficha en móvil: el cuadro para escribir con su barra de
 * formato y, debajo, los hilos con el rail rosa que baja del avatar hasta las
 * respuestas, que van sangradas en una tarjeta más estrecha.
 */
export const MobileMangaComments = ({ mangaId, initialComments }: { mangaId: string; initialComments: MangaComment[] }) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<MangaComment[]>(initialComments);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<MangaComment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const isEmpty = !richTextToPlain(content);
  // Reacción que se está pintando ahora mismo (comentario:reaccion).
  const [painted, setPainted] = useState<string | null>(null);
  const currentUser = getStoredUser();

  useEffect(() => { setComments(initialComments); }, [initialComments]);

  // Qué formato está activo donde está el cursor, para resaltar sus botones.
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const readActiveFormats = () => new Set(['bold', 'italic', 'underline'].filter((command) => document.queryCommandState(command)));
  useEffect(() => {
    const sync = () => {
      const editor = editorRef.current;
      if (!editor || !editor.contains(document.getSelection()?.anchorNode ?? null)) return;
      setActiveFormats(readActiveFormats());
    };
    document.addEventListener('selectionchange', sync);
    return () => document.removeEventListener('selectionchange', sync);
  }, []);

  const applyFormat = (command: 'bold' | 'italic' | 'underline') => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command);
    setContent(editor.innerHTML);
    setActiveFormats(readActiveFormats());
  };

  const insertAtCaret = (text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
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
    navigate('/auth/login', { state: { returnTo: `/manga/${mangaId}` } });
    return false;
  };

  const reload = async () => setComments(await getMangaComments(mangaId));

  const publish = async (body: string, parentId: number | null) => {
    const trimmed = body.trim();
    if (!richTextToPlain(trimmed) || posting) return false;
    if (!requireSession()) return false;
    setPosting(true);
    setError('');
    const created = await postMangaComment(mangaId, trimmed, parentId);
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
    setComments((current) => current.map((item) => {
      if (item.id !== comment.id) return item;
      const reactions = { ...(item.reactions || {}) };
      if (item.my_reaction) reactions[item.my_reaction] = Math.max(0, (reactions[item.my_reaction] || 0) - 1);
      if (next) reactions[next] = (reactions[next] || 0) + 1;
      return { ...item, reactions, my_reaction: next };
    }));
    try {
      const result = await setEntityReaction('comment', comment.id, next);
      setComments((current) => current.map((item) => (item.id === comment.id
        ? { ...item, reactions: result.reactions, my_reaction: result.my_reaction }
        : item)));
    } catch { await reload(); }
  };

  const renderComment = (comment: MangaComment, isReply = false) => {
    const replies = repliesByParent.get(comment.id) || [];
    const isLong = richTextToPlain(comment.content).length > (isReply ? 90 : 150);
    const isExpanded = expanded.has(comment.id);

    return (
      <li key={comment.id} className="relative">
        <div className="flex items-stretch gap-3">
          {/* Columna del avatar: se estira hasta el final de la tarjeta para que
              el rail rosa arranque justo debajo de la foto y llegue a las respuestas. */}
          <div className="relative flex shrink-0 flex-col items-center self-stretch">
            <Avatar url={comment.profiles?.avatar_url} size={isReply ? 40 : 48} />
            {replies.length > 0 && <span aria-hidden="true" className="mmd-thread-rail-v" style={{ top: isReply ? 40 : 48 }} />}
          </div>

          <article className={`mmd-comment-card ${isReply ? 'mmd-comment-reply' : ''} min-w-0 flex-1 rounded-2xl border-[0.5px] border-zinc-300/60 bg-black px-3.5 py-2`}>
            <header className={`mmd-comment-head flex items-baseline gap-2 ${isReply ? 'is-reply' : ''} ${(comment.profiles?.username || '').length > 12 ? 'is-long' : ''}`}>
              <h3 className="mmd-comment-author mmd-montserrat">{comment.profiles?.username || 'Lector'}</h3>
              <span className="mmd-comment-handle mmd-montserrat">{handleOf(comment.profiles?.username || 'lector')}</span>
              <span className="mmd-comment-date mmd-montserrat ml-auto shrink-0">{formatCommentDate(comment.created_at)}</span>
            </header>

            <div className="mmd-comment-body-wrap relative mt-1">
              <p
                className={`mmd-comment-body mmd-montserrat ${isReply ? 'is-reply' : ''} ${isLong && !isExpanded ? 'is-clamped' : ''}`}
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(comment.content) }}
              />
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next; })}
                  className="mmd-comment-more mmd-montserrat"
                >
                  {isExpanded ? 'Ver menos' : 'Ver Todo'}
                </button>
              )}
            </div>

            <footer className="mmd-comment-actions mt-2 flex items-center gap-2.5">
              {COMMENT_REACTIONS.map((reaction) => {
                const count = comment.reactions?.[reaction.id] || 0;
                const mine = comment.my_reaction === reaction.id;
                const painting = painted === `${comment.id}:${reaction.id}`;
                return (
                  <button
                    key={reaction.id}
                    type="button"
                    onClick={() => void react(comment, reaction.id)}
                    aria-label={reaction.label}
                    aria-pressed={mine}
                    className="mmd-comment-reaction mmd-anta flex items-center gap-1 text-sm leading-4"
                    style={{ color: mine ? reaction.color : '#fff' }}
                  >
                    <span className="mmd-reaction-glyph">
                      <reaction.Icon size={15} className="mmd-reaction-glyph-off" />
                      <span className={`mmd-reaction-glyph-on ${mine ? 'is-on' : ''} ${painting ? 'is-painting' : ''}`}>
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
                  className="mmd-montserrat ml-auto flex shrink-0 items-center gap-1.5 text-xs font-semibold leading-8 text-white"
                >
                  <CommentReplyIcon size={20} aria-hidden="true" />
                  Responder
                </button>
              )}
            </footer>

            {replyTo?.id === comment.id && (
              <form
                className="mt-2 border-t border-white/10 pt-2"
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
                  placeholder={`Responder a ${comment.profiles?.username || 'este comentario'}`}
                  className="mmd-montserrat w-full resize-none rounded-lg bg-white/[0.06] p-2 text-[11px] text-white outline-none placeholder:text-white/30"
                />
                <div className="mt-1.5 flex justify-end gap-2">
                  <button type="button" onClick={() => setReplyTo(null)} className="mmd-montserrat rounded-full px-3 py-1 text-[10px] text-white/60">Cancelar</button>
                  <button type="submit" disabled={!replyContent.trim() || posting} className="mmd-montserrat inline-flex items-center gap-1.5 rounded-lg bg-[#FF008C] px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-40">
                    {posting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Responder
                  </button>
                </div>
              </form>
            )}
          </article>
        </div>

        {/* Respuestas: sangradas, con el codo que sale del rail del comentario. */}
        {replies.length > 0 && (
          <ul className="mmd-comment-replies mt-5 flex flex-col gap-5 pl-[62px]">
            {replies.map((reply) => (
              <div key={reply.id} className="mmd-reply-item relative">
                {renderComment(reply, true)}
              </div>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <section id="comentarios" aria-label="Comentarios" className="scroll-mt-4">
      <h2 className="mmd-montserrat flex items-center justify-center gap-2.5 text-xl font-black leading-5">
        <CommentsHeadingIcon size={44} className="text-white" />
        COMENTARIOS
      </h2>

      {/* Caja para escribir */}
      <form
        className="mmd-comment-composer mx-auto mt-4 w-[87.3%] rounded-2xl border-[0.5px] border-zinc-400/60 bg-black p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await publish(sanitizeRichText(content), null)) {
            setContent('');
            if (editorRef.current) editorRef.current.innerHTML = '';
          }
        }}
      >
        {/* Editor con formato: negrita, cursiva y subrayado se aplican sobre el
            texto seleccionado, como en un procesador de textos. */}
        <div className="relative">
          {/* Marcador de posición: reaparece en cuanto la caja vuelve a quedar vacía. */}
          {isEmpty && (
            <span aria-hidden="true" className="mmd-composer-prompt mmd-montserrat pointer-events-none absolute left-0 top-0 flex items-start gap-2 text-xs font-medium leading-5 text-white/50">
              <ComposerPromptIcon size={16} className="mt-0.5 shrink-0" />
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
            className="mmd-comment-editor mmd-montserrat w-full bg-transparent text-xs font-medium leading-5 text-white outline-none"
          />
        </div>
        <div className="mmd-comment-formatting mt-1 flex items-center gap-5 border-t-[0.5px] border-neutral-400/30 pt-2.5">
          {([['Negrita', Bold, 'bold'], ['Cursiva', Italic, 'italic'], ['Subrayado', Underline, 'underline']] as const).map(([label, Icon, command]) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-pressed={activeFormats.has(command)}
              // En mousedown, para que el editor no pierda la selección al pulsar.
              onMouseDown={(event) => { event.preventDefault(); applyFormat(command); }}
              className={`mmd-format-button ${activeFormats.has(command) ? 'is-active' : ''}`}
            >
              <Icon size={18} strokeWidth={2.4} />
            </button>
          ))}
          <button type="button" aria-label="Emoji" onMouseDown={(event) => { event.preventDefault(); insertAtCaret('😄'); }} className="text-white"><Smile size={18} /></button>
          <button type="button" aria-label="Sticker" onMouseDown={(event) => { event.preventDefault(); insertAtCaret('🔥'); }} className="text-white"><Sticker size={18} /></button>
          <button type="submit" disabled={!richTextToPlain(content) || posting} className="mmd-montserrat ml-auto inline-flex h-8 items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-black shadow-[1px_2px_1px_0_rgba(127,127,127,0.55)] disabled:opacity-40">
            {posting ? <Loader2 size={16} className="animate-spin" /> : <PublishIcon size={18} />}
            Publicar
          </button>
        </div>
        {error && <p role="alert" className="mmd-montserrat mt-2 text-[10px] text-red-400">{error}</p>}
      </form>

      {topLevel.length === 0 ? (
        <p className="mmd-montserrat mt-6 text-center text-xs text-white/50">Sé la primera persona en comentar.</p>
      ) : (
        <>
          <ul className="mmd-comment-list mx-auto mt-6 flex w-[87.3%] flex-col gap-9">{visible.map((comment) => renderComment(comment))}</ul>
          {topLevel.length > visible.length && (
            <button type="button" onClick={() => setShowAll(true)} className="mmd-montserrat mx-auto mt-6 flex h-12 w-48 items-center justify-center gap-2 rounded-[20px] border-[0.5px] border-zinc-400/25 text-xs text-white/75">
              Mostrar Todos
              <ShowAllIcon size={20} />
            </button>
          )}
        </>
      )}
    </section>
  );
};
