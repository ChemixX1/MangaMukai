import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react';
import { getFluentEmojiCDN } from '@lobehub/fluent-emoji';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquareText,
  Reply,
  Send,
  SmilePlus,
  Sticker,
  X,
} from 'lucide-react';
import {
  getMangaComments,
  notifyCommentReaction,
  postMangaComment,
  toggleCommentLike,
  type MangaComment,
} from '../../services/communityService';
import { getStoredToken, getStoredUser } from '../../services/authService';
import { PROFILE_UPDATED_EVENT, type ProfileUpdatedDetail } from '../../services/wordpressService';

interface MangaCommentsProps {
  mangaId: string;
  isLight?: boolean;
}

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const getFluentStickerUrl = (emoji: string) => getFluentEmojiCDN(emoji, { cdn: 'unpkg', type: '3d' });

const COMMENT_REACTIONS = [
  { id: 'fire', symbol: '🔥', label: 'Fuego', imgUrl: getFluentStickerUrl('🔥') },
  { id: 'love', symbol: '❤️', label: 'Me encanta', imgUrl: getFluentStickerUrl('❤️') },
  { id: 'like', symbol: '👍', label: 'Me gusta', imgUrl: getFluentStickerUrl('👍') },
  { id: 'haha', symbol: '😂', label: 'Me divierte', imgUrl: getFluentStickerUrl('😂') },
  { id: 'sad', symbol: '😢', label: 'Me entristece', imgUrl: getFluentStickerUrl('😢') },
] as const;

type CommentReactionId = (typeof COMMENT_REACTIONS)[number]['id'];
type CommentReactionCounts = Record<CommentReactionId, number>;

const createCommentReactionCounts = (): CommentReactionCounts => ({
  fire: 0,
  love: 0,
  like: 0,
  haha: 0,
  sad: 0,
});

const createFluentSticker = (id: string, emoji: string, names: string[]) => ({
  id,
  emoji,
  names,
  imgUrl: getFluentStickerUrl(emoji),
});

const COMMENT_STICKERS = [
  createFluentSticker('mm-heart-hands', '🫶', ['corazón con manos', 'amor', 'apoyo']),
  createFluentSticker('mm-melting', '🫠', ['derretido', 'mood', 'calor']),
  createFluentSticker('mm-skull', '💀', ['calavera', 'morir de risa', 'meme']),
  createFluentSticker('mm-nails', '💅', ['uñas', 'slay', 'icónico']),
  createFluentSticker('mm-hundred', '💯', ['cien', 'real', 'perfecto']),
  createFluentSticker('mm-mind-blown', '🤯', ['impactado', 'mente', 'increíble']),
  createFluentSticker('mm-pleading', '🥹', ['emocionado', 'ternura', 'por favor']),
  createFluentSticker('mm-crying', '😭', ['llorando', 'emoción', 'mood']),
  createFluentSticker('mm-fire', '🔥', ['fuego', 'épico', 'tendencia']),
  createFluentSticker('mm-purple-heart', '💜', ['corazón morado', 'amor', 'aesthetic']),
  createFluentSticker('mm-heart-arrow', '💘', ['flechazo', 'amor', 'crush']),
  createFluentSticker('mm-heart-eyes', '😍', ['amor', 'encanta', 'crush']),
  createFluentSticker('mm-party', '🥳', ['fiesta', 'celebrar', 'party']),
  createFluentSticker('mm-confetti', '🎉', ['confeti', 'fiesta', 'celebrar']),
  createFluentSticker('mm-sparkles', '✨', ['brillos', 'magia', 'aesthetic']),
  createFluentSticker('mm-rocket', '🚀', ['cohete', 'increíble', 'subiendo']),
  createFluentSticker('mm-crown', '👑', ['corona', 'rey', 'reina']),
  createFluentSticker('mm-cool', '😎', ['lentes', 'cool', 'genial']),
  createFluentSticker('mm-cold', '🥶', ['frío', 'congelado', 'cool']),
  createFluentSticker('mm-clown', '🤡', ['payaso', 'meme', 'broma']),
  createFluentSticker('mm-side-eye', '🙄', ['mirada', 'drama', 'side eye']),
  createFluentSticker('mm-handshake', '🤝', ['trato', 'acuerdo', 'equipo']),
  createFluentSticker('mm-hug', '🤗', ['abrazo', 'cariño', 'apoyo']),
  createFluentSticker('mm-bubble-tea', '🧋', ['bubble tea', 'bebida', 'aesthetic']),
];

const COMMENT_SUCCESS_MESSAGE = 'Tu comentario ya forma parte de la conversación.';

const formatCommentDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ahora';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const renderCommentContent = (value: string) => value
  .split(/(\[sticker:https:\/\/[^\]]+\])/g)
  .filter(Boolean)
  .map((part, index) => {
    const match = part.match(/^\[sticker:(https:\/\/[^\]]+)\]$/);
    const stickerUrl = match?.[1];
    const sticker = stickerUrl ? COMMENT_STICKERS.find(({ imgUrl }) => imgUrl === stickerUrl) : null;
    const isLegacySticker = Boolean(stickerUrl?.startsWith('https://cdn.jsdelivr.net/gh/twitter/twemoji@'));
    return sticker || isLegacySticker
      ? <img key={`${sticker?.id || 'legacy-sticker'}-${index}`} src={sticker?.imgUrl || stickerUrl} alt={sticker?.names[0] || 'Sticker'} className="manga-comment-sticker" loading="lazy" />
      : <span key={`comment-text-${index}`}>{part}</span>;
  });

export const MangaComments = ({ mangaId, isLight = false }: MangaCommentsProps) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<MangaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [content, setContent] = useState('');
  const [visibleCount, setVisibleCount] = useState(3);
  const [replyTo, setReplyTo] = useState<MangaComment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyPosting, setReplyPosting] = useState(false);
  const [message, setMessage] = useState('');
  const [composerTool, setComposerTool] = useState<'emojis' | 'stickers' | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<(typeof COMMENT_STICKERS)[number] | null>(null);
  const [commentReactionSelections, setCommentReactionSelections] = useState<Record<number, CommentReactionId | null>>({});
  const [commentReactionCounts, setCommentReactionCounts] = useState<Record<number, CommentReactionCounts>>({});
  const [reactionBursts, setReactionBursts] = useState<Record<number, { id: CommentReactionId; key: number }>>({});
  const composerToolsRef = useRef<HTMLDivElement>(null);

  const token = getStoredToken();
  const user = getStoredUser();

  useEffect(() => {
    if (!composerTool) return;
    const closeComposerTool = (event: PointerEvent) => {
      if (!composerToolsRef.current?.contains(event.target as Node)) setComposerTool(null);
    };
    document.addEventListener('pointerdown', closeComposerTool);
    return () => document.removeEventListener('pointerdown', closeComposerTool);
  }, [composerTool]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMangaComments(mangaId)
      .then((items) => {
        if (!active) return;
        setComments(items);
        setCommentReactionSelections(Object.fromEntries(
          items.filter((comment) => comment.is_liked_by_user).map((comment) => [comment.id, 'like']),
        ));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mangaId]);

  useEffect(() => {
    const updateProfile = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      if (!detail?.userId) return;
      setComments((current) => current.map((comment) => String(comment.user_id) === detail.userId
        ? {
            ...comment,
            profiles: {
              ...comment.profiles,
              ...(detail.username ? { username: detail.username } : {}),
              ...(detail.avatarUrl ? { avatar_url: detail.avatarUrl } : {}),
            },
          }
        : comment));
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, updateProfile);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, updateProfile);
  }, []);

  const repliesByParent = useMemo(() => {
    const replies = new Map<number, MangaComment[]>();
    comments.forEach((comment) => {
      if (!comment.parent_id) return;
      const current = replies.get(comment.parent_id) || [];
      current.push(comment);
      replies.set(comment.parent_id, current);
    });
    return replies;
  }, [comments]);

  const topLevelComments = useMemo(() => {
    const topLevel = comments.filter((comment) => !comment.parent_id);
    return [...topLevel].sort((a, b) => {
      const aScore = a.likes + (repliesByParent.get(a.id)?.length || 0);
      const bScore = b.likes + (repliesByParent.get(b.id)?.length || 0);
      if (bScore !== aScore) return bScore - aScore;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [comments, repliesByParent]);

  const goToLogin = () => {
    navigate('/auth/login', {
      state: { returnTo: `${window.location.pathname}${window.location.search}` },
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      goToLogin();
      return;
    }
    const trimmed = content.trim();
    if ((!trimmed && !selectedSticker) || posting) return;
    const publishedContent = [
      trimmed,
      selectedSticker ? `[sticker:${selectedSticker.imgUrl}]` : '',
    ].filter(Boolean).join('\n');

    setPosting(true);
    setMessage('');
    const posted = await postMangaComment(mangaId, publishedContent, null);
    if (posted) {
      setComments((current) => [posted, ...current]);
      setContent('');
      setSelectedSticker(null);
      setComposerTool(null);
      setMessage(COMMENT_SUCCESS_MESSAGE);
    } else {
      setMessage('No pudimos publicar el comentario. Inténtalo otra vez.');
    }
    setPosting(false);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setContent((current) => `${current}${emojiData.emoji}`.slice(0, 500));
    setComposerTool(null);
  };

  const handleStickerClick = (sticker: (typeof COMMENT_STICKERS)[number]) => {
    setSelectedSticker(sticker);
    setComposerTool(null);
  };

  const handleReplySubmit = async (event: FormEvent, comment: MangaComment) => {
    event.preventDefault();
    if (!token) {
      goToLogin();
      return;
    }
    const trimmed = replyContent.trim();
    if (!trimmed || replyPosting) return;

    setReplyPosting(true);
    const posted = await postMangaComment(mangaId, trimmed, comment.id);
    if (posted) {
      setComments((current) => [...current, posted]);
      setReplyContent('');
      setReplyTo(null);
    } else {
      setMessage('No pudimos publicar la respuesta. Inténtalo otra vez.');
    }
    setReplyPosting(false);
  };

  const handleCommentReaction = async (comment: MangaComment, reactionId: CommentReactionId) => {
    if (!token) {
      goToLogin();
      return;
    }

    const previousSelection = commentReactionSelections[comment.id]
      || (comment.is_liked_by_user ? 'like' : null);
    const nextSelection = previousSelection === reactionId ? null : reactionId;
    const commentsSnapshot = comments;
    const selectionsSnapshot = commentReactionSelections;
    const countsSnapshot = commentReactionCounts;

    setCommentReactionSelections((current) => ({ ...current, [comment.id]: nextSelection }));
    setCommentReactionCounts((current) => {
      const nextCounts = { ...(current[comment.id] || createCommentReactionCounts()) };
      if (previousSelection && previousSelection !== 'like') {
        nextCounts[previousSelection] = Math.max(0, nextCounts[previousSelection] - 1);
      }
      if (nextSelection && nextSelection !== 'like') {
        nextCounts[nextSelection] += 1;
      }
      return { ...current, [comment.id]: nextCounts };
    });
    setReactionBursts((current) => ({
      ...current,
      [comment.id]: { id: reactionId, key: Date.now() },
    }));

    const likeStateChanged = (previousSelection === 'like') !== (nextSelection === 'like');

    if (likeStateChanged) {
      const nextLiked = nextSelection === 'like';
      setComments((current) => current.map((item) => item.id === comment.id
        ? {
            ...item,
            likes: nextLiked ? item.likes + 1 : Math.max(0, item.likes - 1),
            is_liked_by_user: nextLiked,
          }
        : item));
    }

    const notificationTasks: Promise<boolean>[] = [];
    if (likeStateChanged) notificationTasks.push(toggleCommentLike(comment.id));
    if (previousSelection && previousSelection !== 'like' && (!nextSelection || nextSelection === 'like')) {
      notificationTasks.push(notifyCommentReaction(comment.id, null));
    }
    if (nextSelection && nextSelection !== 'like') {
      notificationTasks.push(notifyCommentReaction(comment.id, nextSelection));
    }
    const results = await Promise.all(notificationTasks);
    if (results.some((success) => !success)) {
      setComments(commentsSnapshot);
      setCommentReactionSelections(selectionsSnapshot);
      setCommentReactionCounts(countsSnapshot);
    }
  };

  const selectReply = (comment: MangaComment) => {
    if (!token) {
      goToLogin();
      return;
    }
    setReplyTo(comment);
    setReplyContent('');
    window.setTimeout(() => document.getElementById(`manga-inline-reply-${comment.id}`)?.focus(), 0);
  };

  const renderComment = (comment: MangaComment, isReply = false) => {
    const selectedReaction = commentReactionSelections[comment.id]
      || (comment.is_liked_by_user ? 'like' : null);
    const localCounts = commentReactionCounts[comment.id] || createCommentReactionCounts();
    const burst = reactionBursts[comment.id];
    const burstReaction = burst ? COMMENT_REACTIONS.find(({ id }) => id === burst.id) : null;

    return (
      <article key={comment.id} className={`manga-comment-entry ${isReply ? 'is-reply' : ''}`}>
        <Link
          to={`/usuarios/${comment.user_id}`}
          aria-label={`Ver perfil de ${comment.profiles?.username || 'usuario'}`}
          className={`manga-comment-avatar flex shrink-0 items-center justify-center overflow-hidden border bg-gradient-to-br from-[#FF4D88]/30 text-sm font-black transition-transform hover:scale-105 ${isLight ? 'border-black/10 to-black/[0.03] text-black' : 'border-white/10 to-white/[0.03] text-white'}`}
        >
          {comment.profiles?.avatar_url ? (
            <img src={comment.profiles.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            (comment.profiles?.username || 'M').charAt(0).toUpperCase()
          )}
        </Link>

        <div className={`manga-comment-card relative min-w-0 overflow-hidden border p-4 transition-colors sm:p-5 ${isLight ? 'border-black/[0.09] bg-white/90' : 'border-white/[0.08] bg-[#080808]/90'}`}>
          <AnimatePresence>
            {burst && burstReaction && (
              <motion.div key={burst.key} className="manga-comment-reaction-burst" aria-hidden="true">
                {Array.from({ length: 14 }, (_, index) => (
                  <motion.span
                    key={`${burst.key}-${index}`}
                    className="manga-comment-reaction-particle"
                    style={{ left: `${2 + index * 7.25}%` }}
                    initial={{ opacity: 0, scale: 0.2, x: 0, y: 70, rotate: 0 }}
                    animate={{
                      opacity: [0, 0.08, 0.52, 0.5, 0],
                      scale: [0.2, 0.5, 0.9, 1.05, 0.86],
                      x: [0, (index % 2 === 0 ? -1 : 1) * 12, (index - 6.5) * 10],
                      y: [90, 38, -24 - (index % 3) * 14, -155 - (index % 4) * 22, -325 - (index % 2) * 35],
                      rotate: [0, (index % 2 === 0 ? -1 : 1) * 10, (index - 6.5) * 8],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 3.35, delay: index * 0.025, times: [0, 0.16, 0.38, 0.74, 1], ease: [0.22, 1, 0.36, 1] }}
                  >
                    {burstReaction.symbol}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Link to={`/usuarios/${comment.user_id}`} className={`poppins-bold truncate text-[14px] transition-colors hover:text-[#FF4D88] sm:text-[15px] ${isLight ? 'text-black' : 'text-white'}`}>
                  {comment.profiles?.username || 'Usuario MangaMukai'}
                </Link>
                {comment.profiles?.is_pro && (
                  <span className="rounded-full bg-[#FF4D88]/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#FF4D88]">
                    Pro
                  </span>
                )}
              </div>
              <span className={`google-sans-library ml-auto shrink-0 text-right text-[12px] font-medium sm:text-[13px] ${isLight ? 'text-black' : 'text-white'}`}>
                {formatCommentDate(comment.created_at)}
              </span>
            </div>

            <div className={`whitespace-pre-wrap text-sm leading-relaxed ${isLight ? 'text-black/72' : 'text-white/70'}`}>{renderCommentContent(comment.content)}</div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="manga-comment-reaction-list flex flex-nowrap items-center gap-0.5" aria-label="Reacciones al comentario">
                {COMMENT_REACTIONS.map((reaction) => {
                  const isSelected = selectedReaction === reaction.id;
                  const count = reaction.id === 'like' ? comment.likes : localCounts[reaction.id];
                  return (
                    <motion.button
                      key={reaction.id}
                      type="button"
                      onClick={() => handleCommentReaction(comment, reaction.id)}
                      whileHover={{ y: -2, scale: 1.08 }}
                      whileTap={{ scale: 0.88 }}
                      aria-label={`${reaction.label}: ${count}`}
                      aria-pressed={isSelected}
                      title={reaction.label}
                      className={`manga-comment-reaction-button ${isSelected ? 'is-selected' : ''} ${isLight ? 'is-light' : 'is-dark'}`}
                    >
                      <img src={reaction.imgUrl} alt="" className="manga-comment-reaction-emoji" aria-hidden="true" />
                      <span className="manga-comment-reaction-count tabular-nums">{count}</span>
                    </motion.button>
                  );
                })}
              </div>

              {!isReply && (
                <button
                  type="button"
                  onClick={() => selectReply(comment)}
                  className={`manga-comment-reply-button ml-auto inline-flex items-center gap-1.5 font-[Montserrat] text-[12px] font-semibold transition-colors sm:text-[13px] ${isLight ? 'is-light text-black/60 hover:text-black' : 'is-dark text-white/55 hover:text-white'}`}
                >
                  <Reply size={15} /> Responder
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {!isReply && replyTo?.id === comment.id && (
                <motion.form
                  key={`inline-reply-${comment.id}`}
                  onSubmit={(event) => handleReplySubmit(event, comment)}
                  className={`manga-inline-reply mt-4 border-t pt-4 ${isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'}`}
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                >
                  <textarea
                    id={`manga-inline-reply-${comment.id}`}
                    value={replyContent}
                    onChange={(event) => setReplyContent(event.target.value.slice(0, 500))}
                    placeholder={`Responder a ${comment.profiles?.username || 'este lector'}...`}
                    className={`min-h-24 w-full resize-y rounded-xl border px-3 py-3 font-[Montserrat] text-sm outline-none transition-colors focus:border-[#FF4D88]/55 ${isLight ? 'border-black/10 bg-black/[0.035] text-black placeholder:text-black/35' : 'border-white/10 bg-white/[0.045] text-white placeholder:text-white/30'}`}
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className={`font-[Montserrat] text-[10px] font-semibold ${isLight ? 'text-black/35' : 'text-white/30'}`}>{replyContent.length}/500</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setReplyTo(null)} className={`rounded-lg px-3 py-2 font-[Montserrat] text-[10px] font-semibold ${isLight ? 'text-black/50 hover:bg-black/5' : 'text-white/45 hover:bg-white/5'}`}>Cancelar</button>
                      <button type="submit" disabled={!replyContent.trim() || replyPosting} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D88] px-3 py-2 font-[Montserrat] text-[10px] font-semibold text-white disabled:opacity-35">
                        {replyPosting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Responder
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className={`manga-comments desktop-content-shell relative mx-auto mb-28 mt-4 w-full max-w-[1400px] px-4 transition-colors md:px-8 ${isLight ? 'text-black' : 'text-white'}`} aria-labelledby="comments-title">
      <div className={`mb-7 flex items-center justify-center border-b pb-5 ${isLight ? 'border-black/[0.08]' : 'border-white/[0.07]'}`}>
        <div className="flex items-center justify-center gap-3 text-center">
          <MessageSquareText size={28} className="text-[#FF4D88] md:h-8 md:w-8" />
          <h2 id="comments-title" className={`text-2xl font-black uppercase italic tracking-tight md:text-[28px] ${isLight ? 'text-black' : 'text-white'}`}>
            Comentarios
          </h2>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-7">
        <form onSubmit={handleSubmit} className={`manga-comment-form rounded-3xl border p-4 transition-colors sm:p-5 ${isLight ? 'border-black/10 bg-white/88' : 'border-white/10 bg-[#080808]/88'}`}>
          <div className={`manga-comment-composer-box relative overflow-hidden rounded-2xl border transition-colors focus-within:border-[#FF4D88]/50 ${isLight ? 'border-black/10 bg-zinc-50' : 'border-white/10 bg-black/30'}`}>
            <textarea
              id="manga-comment-input"
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, 500))}
              onClick={() => {
                if (!token) goToLogin();
              }}
              readOnly={!token}
              placeholder={token ? `¿Qué te pareció, ${user?.username || 'lector'}?` : 'Inicia sesión para comentar...'}
              className={`min-h-28 w-full resize-y border-0 bg-transparent p-4 text-sm leading-relaxed outline-none sm:min-h-32 ${selectedSticker ? 'pb-[66px]' : ''} ${isLight ? 'text-black placeholder:text-black/30' : 'text-white placeholder:text-white/20'}`}
            />

            {selectedSticker && (
              <div className={`manga-comment-composer-sticker-row absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 ${isLight ? 'border-black/[0.08] bg-white/92' : 'border-white/[0.08] bg-black/85'}`}>
                <img
                  src={selectedSticker.imgUrl}
                  alt={selectedSticker.names[0]}
                  className="manga-comment-composer-sticker"
                />
                <button
                  type="button"
                  onClick={() => setSelectedSticker(null)}
                  aria-label="Quitar sticker"
                  className={`flex h-[22px] w-[22px] items-center justify-center rounded-full transition-colors ${isLight ? 'text-black/45 hover:bg-black/[0.06] hover:text-black' : 'text-white/45 hover:bg-white/[0.07] hover:text-white'}`}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div ref={composerToolsRef} className="relative flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setComposerTool((current) => current === 'emojis' ? null : 'emojis')}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-[Montserrat] text-[11px] font-semibold transition-colors ${composerTool === 'emojis' ? 'border-[#FF4D88]/55 text-[#FF4D88]' : isLight ? 'border-black/10 text-black/55 hover:text-black' : 'border-white/10 text-white/50 hover:text-white'}`}
                aria-expanded={composerTool === 'emojis'}
                aria-label="Abrir emojis"
              >
                <SmilePlus size={15} />
                Emojis
              </button>
              <button
                type="button"
                onClick={() => setComposerTool((current) => current === 'stickers' ? null : 'stickers')}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-[Montserrat] text-[11px] font-semibold transition-colors ${composerTool === 'stickers' ? 'border-[#FF4D88]/55 text-[#FF4D88]' : isLight ? 'border-black/10 text-black/55 hover:text-black' : 'border-white/10 text-white/50 hover:text-white'}`}
                aria-expanded={composerTool === 'stickers'}
                aria-label="Abrir stickers"
              >
                <Sticker size={15} />
                Stickers
              </button>
              {composerTool === 'emojis' && (
                <div className="manga-comment-emoji-picker absolute bottom-full left-0 z-30 mb-2">
                  <Suspense fallback={<div className={`flex h-[420px] w-full items-center justify-center rounded-2xl border ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-[#101010]'}`}><Loader2 size={22} className="animate-spin text-[#FF4D88]" /></div>}>
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={(isLight ? 'light' : 'dark') as Theme}
                      emojiStyle={'native' as EmojiStyle}
                      lazyLoadEmojis
                      searchPlaceHolder="Buscar emoji"
                      previewConfig={{ showPreview: false }}
                      width="100%"
                      height={420}
                    />
                  </Suspense>
                </div>
              )}
              {composerTool === 'stickers' && (
                <div className={`manga-comment-sticker-picker absolute bottom-full left-0 z-30 mb-2 max-h-[360px] overflow-y-auto rounded-2xl border p-3 ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-[#101010]'}`}>
                  <div className="grid grid-cols-4 gap-2">
                    {COMMENT_STICKERS.map((sticker) => (
                      <button key={sticker.id} type="button" onClick={() => handleStickerClick(sticker)} title={sticker.names[0]} className={`flex aspect-square items-center justify-center rounded-xl border p-2 transition-colors hover:border-[#FF4D88]/55 ${isLight ? 'border-black/[0.07] bg-black/[0.025]' : 'border-white/[0.07] bg-white/[0.035]'}`}>
                        <img src={sticker.imgUrl} alt={sticker.names[0]} className="h-full w-full object-contain" loading="eager" decoding="async" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={posting || (Boolean(token) && !content.trim() && !selectedSticker)}
              className="google-sans-library ml-auto flex items-center justify-center gap-2.5 rounded-xl bg-[#FF4D88] px-6 py-3 text-[13px] font-bold tracking-normal text-white transition-colors hover:bg-[#ff2f78] disabled:cursor-not-allowed disabled:opacity-35 sm:px-7 sm:text-[14px]"
            >
              {posting ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              {token ? 'Publicar' : 'Iniciar sesión'}
            </button>
          </div>

          {message && <p className={`mt-3 text-center text-[10px] leading-relaxed ${message === COMMENT_SUCCESS_MESSAGE ? 'lg:hidden' : ''} ${isLight ? 'text-black/55' : 'text-white/45'}`}>{message}</p>}
        </form>

        <div className="min-h-72">
          {loading ? (
            <div className={`flex min-h-72 items-center justify-center ${isLight ? 'text-black/25' : 'text-white/25'}`}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : topLevelComments.length === 0 ? (
            <div className={`flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed px-6 text-center ${isLight ? 'border-black/10 bg-zinc-50' : 'border-white/10 bg-[#080808]'}`}>
              <span className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-black'}`}>
                <MessageSquareText size={30} className={isLight ? 'text-black/25' : 'text-white/20'} />
              </span>
              <h3 className={`text-lg font-black ${isLight ? 'text-black' : 'text-white'}`}>Sé el primero en comentar</h3>
              <p className={`mt-2 max-w-sm text-sm leading-relaxed ${isLight ? 'text-black/45' : 'text-white/35'}`}>
                Comparte tu teoría, tu escena favorita o una recomendación para otros lectores.
              </p>
            </div>
          ) : (
            <div className="manga-comments-thread-list space-y-4">
              {topLevelComments.slice(0, visibleCount).map((comment) => (
                <div key={comment.id} className={`manga-comment-thread space-y-3 ${(repliesByParent.get(comment.id)?.length || 0) > 0 ? 'has-replies' : ''}`}>
                  {renderComment(comment)}
                  {(repliesByParent.get(comment.id)?.length || 0) > 0 && (
                    <div className="manga-comment-replies space-y-3">
                      {(repliesByParent.get(comment.id) || []).map((reply) => renderComment(reply, true))}
                    </div>
                  )}
                </div>
              ))}

              {topLevelComments.length > 3 && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((current) => current >= topLevelComments.length ? 3 : topLevelComments.length)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-colors hover:border-[#FF4D88]/30 ${isLight ? 'border-black/10 bg-black/[0.03] text-black/45 hover:text-black' : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white'}`}
                >
                  {visibleCount >= topLevelComments.length ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {visibleCount >= topLevelComments.length ? 'Mostrar menos' : 'Ver todos los comentarios'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
