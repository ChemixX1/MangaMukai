import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  MessageSquareText,
  Reply,
  Send,
} from 'lucide-react';
import {
  getMangaComments,
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

type SortMode = 'recent' | 'popular';

const formatCommentDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ahora';
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const MangaComments = ({ mangaId, isLight = false }: MangaCommentsProps) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<MangaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [content, setContent] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [visibleCount, setVisibleCount] = useState(3);
  const [replyTo, setReplyTo] = useState<MangaComment | null>(null);
  const [message, setMessage] = useState('');

  const token = getStoredToken();
  const user = getStoredUser();

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMangaComments(mangaId)
      .then((items) => {
        if (active) setComments(items);
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

  const topLevelComments = useMemo(() => {
    const topLevel = comments.filter((comment) => !comment.parent_id);
    return [...topLevel].sort((a, b) => sortMode === 'popular'
      ? b.likes - a.likes
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [comments, sortMode]);

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
    if (!trimmed || posting) return;

    setPosting(true);
    setMessage('');
    const posted = await postMangaComment(mangaId, trimmed, replyTo?.id ?? null);
    if (posted) {
      setComments((current) => [posted, ...current]);
      setContent('');
      setReplyTo(null);
      setMessage('Tu comentario ya forma parte de la conversación.');
    } else {
      setMessage('No pudimos publicar el comentario. Inténtalo otra vez.');
    }
    setPosting(false);
  };

  const handleLike = async (comment: MangaComment) => {
    if (!token) {
      goToLogin();
      return;
    }

    const snapshot = comments;
    setComments((current) => current.map((item) => item.id === comment.id
      ? {
          ...item,
          likes: item.is_liked_by_user ? Math.max(0, item.likes - 1) : item.likes + 1,
          is_liked_by_user: !item.is_liked_by_user,
        }
      : item));
    const success = await toggleCommentLike(comment.id);
    if (!success) setComments(snapshot);
  };

  const selectReply = (comment: MangaComment) => {
    if (!token) {
      goToLogin();
      return;
    }
    setReplyTo(comment);
    document.getElementById('manga-comment-input')?.focus();
  };

  const renderComment = (comment: MangaComment, isReply = false) => (
    <article
      key={comment.id}
      className={`rounded-2xl border p-4 transition-colors sm:p-5 ${isLight ? 'border-black/[0.08] bg-zinc-50' : 'border-white/[0.07] bg-[#080808]'} ${isReply ? 'ml-6 border-l-[#FF4D88]/35 sm:ml-12' : ''}`}
    >
      <div className="flex gap-3">
        <Link to={`/usuarios/${comment.user_id}`} aria-label={`Ver perfil de ${comment.profiles?.username || 'usuario'}`} className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-[#FF4D88]/30 text-sm font-black transition-transform hover:scale-105 ${isLight ? 'border-black/10 to-black/[0.03] text-black' : 'border-white/10 to-white/[0.03] text-white'}`}>
          {comment.profiles?.avatar_url ? (
            <img src={comment.profiles.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            (comment.profiles?.username || 'M').charAt(0).toUpperCase()
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Link to={`/usuarios/${comment.user_id}`} className={`text-xs font-black transition-colors hover:text-[#FF4D88] ${isLight ? 'text-black' : 'text-white'}`}>
              {comment.profiles?.username || 'Usuario MangaMukai'}
            </Link>
            {comment.profiles?.is_pro && (
              <span className="rounded-full bg-[#FF4D88]/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#FF4D88]">
                Pro
              </span>
            )}
            <span className={`text-[10px] font-medium uppercase tracking-wider ${isLight ? 'text-black/35' : 'text-white/25'}`}>
              {formatCommentDate(comment.created_at)}
            </span>
          </div>

          <p className={`whitespace-pre-wrap text-sm leading-relaxed ${isLight ? 'text-black/70' : 'text-white/65'}`}>{comment.content}</p>

          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleLike(comment)}
              className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${comment.is_liked_by_user ? 'text-[#FF4D88]' : isLight ? 'text-black/35 hover:text-[#FF4D88]' : 'text-white/30 hover:text-[#FF4D88]'}`}
              aria-label={comment.is_liked_by_user ? 'Quitar me gusta' : 'Dar me gusta'}
            >
              <Heart size={13} fill={comment.is_liked_by_user ? 'currentColor' : 'none'} />
              {comment.likes}
            </button>
            {!isReply && (
              <button
                type="button"
                onClick={() => selectReply(comment)}
                className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${isLight ? 'text-black/35 hover:text-black' : 'text-white/30 hover:text-white'}`}
              >
                <Reply size={13} /> Responder
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <section className={`manga-comments desktop-content-shell relative mx-auto mb-28 mt-10 w-full max-w-[1400px] px-4 transition-colors md:px-8 ${isLight ? 'text-black' : 'text-white'}`} aria-labelledby="comments-title">
      <div className={`mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between ${isLight ? 'border-black/[0.08]' : 'border-white/[0.07]'}`}>
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-[#FF4D88] shadow-[0_0_16px_rgba(255,77,136,0.55)]" />
          <MessageSquareText size={22} className="text-[#FF4D88]" />
          <h2 id="comments-title" className={`text-xl font-black uppercase italic tracking-tight md:text-2xl ${isLight ? 'text-black' : 'text-white'}`}>
            Comunidad
          </h2>
        </div>

        <div className={`flex w-fit rounded-xl border p-1 ${isLight ? 'border-black/10 bg-black/[0.035]' : 'border-white/10 bg-white/[0.035]'}`}>
          {(['recent', 'popular'] as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`rounded-lg px-3 py-2 text-[8px] font-black uppercase tracking-[0.14em] transition-all ${sortMode === mode ? isLight ? 'bg-black text-white' : 'bg-white text-black' : isLight ? 'text-black/40 hover:text-black' : 'text-white/35 hover:text-white'}`}
            >
              {mode === 'recent' ? 'Recientes' : 'Populares'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className={`h-fit rounded-3xl border p-5 shadow-2xl transition-colors lg:sticky lg:top-24 ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-[#080808]'}`}>
          <div className="mb-4 flex items-center gap-2">
            <Send size={15} className="text-[#FF4D88]" />
            <span className={`text-[10px] font-black uppercase tracking-[0.16em] ${isLight ? 'text-black/55' : 'text-white/45'}`}>
              Escribe un comentario
            </span>
          </div>

          {replyTo && (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-[#FF4D88]/10 px-3 py-2 text-[10px] text-[#FF4D88]">
              <span>Respondiendo a {replyTo.profiles?.username || 'un lector'}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="font-black uppercase">Cancelar</button>
            </div>
          )}

          <textarea
            id="manga-comment-input"
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 500))}
            onClick={() => {
              if (!token) goToLogin();
            }}
            readOnly={!token}
            placeholder={token ? `¿Qué te pareció, ${user?.username || 'lector'}?` : 'Inicia sesión para comentar...'}
            className={`min-h-36 w-full resize-none rounded-2xl border p-4 text-sm leading-relaxed outline-none transition-colors focus:border-[#FF4D88]/50 ${isLight ? 'border-black/10 bg-zinc-50 text-black placeholder:text-black/30' : 'border-white/10 bg-black/30 text-white placeholder:text-white/20'}`}
          />

          <div className="mt-3 flex items-center justify-between">
            <span className={`font-mono text-[9px] ${isLight ? 'text-black/35' : 'text-white/25'}`}>{content.length}/500</span>
            <button
              type="submit"
              disabled={posting || (Boolean(token) && !content.trim())}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#FF4D88] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-white transition-all hover:bg-[#ff2f78] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {token ? 'Publicar' : 'Iniciar sesión'}
            </button>
          </div>

          {message && <p className={`mt-3 text-center text-[10px] leading-relaxed ${isLight ? 'text-black/55' : 'text-white/45'}`}>{message}</p>}
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
            <div className="space-y-3">
              {topLevelComments.slice(0, visibleCount).map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {renderComment(comment)}
                  {(repliesByParent.get(comment.id) || []).map((reply) => renderComment(reply, true))}
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
