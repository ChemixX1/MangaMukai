import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, MessageCircle, Send, Share2, ThumbsUp, User } from 'lucide-react';
import { getStoredToken } from '../../services/authService';
import { getProfilePostComments, interactWithProfilePost, type ProfilePost, type ProfilePostComment } from '../../services/profilePostService';
import { PROFILE_UPDATED_EVENT, type ProfileUpdatedDetail } from '../../services/wordpressService';
import { formatPostDate } from '../../utils/profileDate';

const reactions = [
  { id: 'like', emoji: '👍', label: 'Me gusta' }, { id: 'love', emoji: '❤️', label: 'Me encanta' },
  { id: 'haha', emoji: '😂', label: 'Me divierte' }, { id: 'wow', emoji: '😮', label: 'Me asombra' },
  { id: 'sad', emoji: '😢', label: 'Me entristece' }, { id: 'angry', emoji: '😡', label: 'Me enoja' },
];

export function ProfilePostCard({ initialPost, isLight, onShared }: { initialPost: ProfilePost; isLight: boolean; onShared?: (post: ProfilePost) => void }) {
  const navigate = useNavigate();
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState<ProfilePostComment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reactionSequence = useRef(0);
  const muted = isLight ? 'text-[#65676b]' : 'text-[#b0b3b8]';
  const border = isLight ? 'border-black/10' : 'border-white/10';
  const hover = isLight ? 'hover:bg-[#f0f2f5]' : 'hover:bg-[#3a3b3c]';
  useEffect(() => setPost(initialPost), [initialPost]);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      const updateAuthor = (author: ProfilePost['author']) => String(author.id) === detail.userId ? { ...author, ...(detail.username !== undefined ? { username: detail.username } : {}), ...(detail.avatarUrl !== undefined ? { avatar_url: detail.avatarUrl } : {}) } : author;
      setPost(current => ({ ...current, author: updateAuthor(current.author) }));
      setComments(current => current.map(comment => ({ ...comment, author: updateAuthor(comment.author) })));
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, update);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, update);
  }, []);
  const requireAuth = () => {
    if (getStoredToken()) return true;
    navigate('/auth/login', { state: { returnTo: `/usuarios/${post.user_id}#post-${post.id}` } });
    return false;
  };
  const loadComments = async (older = false) => {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const result = await getProfilePostComments(post.id, older ? comments[0]?.id : undefined);
      setComments(current => older ? [...result.comments, ...current] : result.comments);
      setHasMore(result.hasMore);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los comentarios.'); }
    finally { setLoading(false); }
  };
  const interact = async (action: 'reaction' | 'comments' | 'share', body: Record<string, string> = {}) => {
    if (busy || !requireAuth()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await interactWithProfilePost(post.id, action, body);
      // A share of a shared post returns its original; keep this card's identity.
      if (result.post.id === post.id) setPost(result.post);
      if (result.comment) { setComments(current => [...current, result.comment!]); setText(''); }
      if (result.shared) { setNotice('Compartido en tu perfil.'); onShared?.(result.shared); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo guardar.'); }
    finally { setBusy(false); setReactionsOpen(false); }
  };
  // La reaccion se pinta al instante y la peticion solo confirma o revierte: sin espera visible.
  const react = (reactionId: string) => {
    if (!requireAuth()) return;
    const previous = post;
    const nextReaction = previous.my_reaction === reactionId ? '' : reactionId;
    const counts = { ...(previous.reactions || {}) };
    if (previous.my_reaction) counts[previous.my_reaction] = Math.max(0, (counts[previous.my_reaction] || 0) - 1);
    if (nextReaction) counts[nextReaction] = (counts[nextReaction] || 0) + 1;
    const sequence = reactionSequence.current + 1;
    reactionSequence.current = sequence;
    setReactionsOpen(false); setError(''); setNotice('');
    setPost(current => ({ ...current, reactions: counts, my_reaction: nextReaction }));
    void interactWithProfilePost(previous.id, 'reaction', { reaction: nextReaction })
      .then(result => { if (reactionSequence.current === sequence && result.post.id === previous.id) setPost(result.post); })
      .catch(caught => {
        if (reactionSequence.current !== sequence) return;
        setPost(previous);
        setError(caught instanceof Error ? caught.message : 'No se pudo guardar.');
      });
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (text.trim()) void interact('comments', { content: text.trim() }); };
  const media = (item: ProfilePost) => <>{item.content && <p className="whitespace-pre-wrap break-words px-4 pb-4 text-[15px] leading-6">{item.content}</p>}{item.media_url && (item.media_type === 'video'
    ? <video src={item.media_url} controls preload="metadata" className="max-h-[620px] w-full bg-black object-contain" />
    : <img src={item.media_url} alt="Contenido de la publicación" loading="lazy" decoding="async" className="max-h-[620px] w-full object-contain" />)}</>;
  const total = Object.values(post.reactions || {}).reduce((sum, value) => sum + value, 0);
  const selected = reactions.find(reaction => reaction.id === post.my_reaction);
  return <article id={`post-${post.id}`} className={`scroll-mt-24 overflow-hidden rounded-xl border shadow-sm ${border} ${isLight ? 'bg-white text-[#1c1e21]' : 'bg-[#242526] text-white'}`}>
    <header className="flex items-center gap-3 p-4">
      <Link to={`/usuarios/${post.author.id}`} className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-500/15">{post.author.avatar_url ? <img src={post.author.avatar_url} alt="" decoding="async" className="h-full w-full object-cover" /> : <User size={20} />}</Link>
      <div className="min-w-0"><Link to={`/usuarios/${post.author.id}`} className="block truncate text-sm font-bold">{post.author.username}</Link><time dateTime={post.created_at} className={`text-xs ${muted}`}>{formatPostDate(post.created_at)}</time></div>
    </header>
    {media(post)}
    {post.shared_post_id && <div className={`mx-4 mb-4 overflow-hidden rounded-lg border ${border}`}>{post.shared_post ? <><Link to={`/usuarios/${post.shared_post.author.id}#post-${post.shared_post.id}`} className="block p-4 text-sm font-bold">{post.shared_post.author.username}</Link>{media(post.shared_post)}</> : <p className={`p-4 text-sm ${muted}`}>Esta publicación ya no está disponible.</p>}</div>}
    <div className={`mx-4 flex flex-wrap items-center justify-between gap-2 py-3 text-xs ${muted}`}><span>{reactions.filter(reaction => post.reactions?.[reaction.id]).map(reaction => reaction.emoji).join(' ')} {total > 0 ? total : ''}</span><span>{post.comment_count || 0} comentarios · {post.share_count || 0} compartidos</span></div>
    <div className={`mx-4 grid grid-cols-3 gap-1 border-y py-1 ${border}`}>
      <button type="button" aria-expanded={reactionsOpen} onClick={() => setReactionsOpen(value => !value)} className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${hover} ${selected ? 'text-[#FF4D88]' : muted}`}>{selected ? <span>{selected.emoji}</span> : <ThumbsUp size={17} />}<span>{selected?.label || 'Reaccionar'}</span></button>
      <button type="button" onClick={() => { const open = !commentsOpen; setCommentsOpen(open); if (open) void loadComments(); }} className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${hover} ${muted}`}><MessageCircle size={17} />Comentar</button>
      <button type="button" disabled={busy} onClick={() => void interact('share')} className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${hover} ${muted}`}><Share2 size={17} />Compartir</button>
    </div>
    {reactionsOpen && <div className="flex justify-center gap-1 p-3" aria-label="Elegir reacción">{reactions.map(reaction => <button key={reaction.id} type="button" aria-label={reaction.label} aria-pressed={selected?.id === reaction.id} title={reaction.label} onClick={() => react(reaction.id)} className={`rounded-full p-2 text-2xl transition hover:-translate-y-1 ${selected?.id === reaction.id ? 'bg-[#FF4D88]/15' : ''}`}>{reaction.emoji}</button>)}</div>}
    {error && <p role="alert" className="px-4 py-3 text-sm text-red-500">{error}</p>}
    {notice && <p role="status" className="px-4 py-3 text-sm text-[#FF4D88]">{notice} <Link to="/perfil" className="font-bold underline">Ver perfil</Link></p>}
    {commentsOpen && <div className="space-y-3 p-4">
      {loading && <Loader2 className="mx-auto animate-spin" size={18} />}
      {hasMore && <button type="button" onClick={() => void loadComments(true)} disabled={loading} className={`text-xs font-bold ${muted}`}>Ver comentarios anteriores</button>}
      {comments.map(comment => <div key={comment.id} className="flex items-start gap-2"><Link to={`/usuarios/${comment.author.id}`} className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-500/15">{comment.author.avatar_url ? <img src={comment.author.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <User size={15} />}</Link><div className="min-w-0"><div className={`rounded-2xl px-3 py-2 ${isLight ? 'bg-[#f0f2f5]' : 'bg-[#3a3b3c]'}`}><Link to={`/usuarios/${comment.author.id}`} className="text-xs font-bold">{comment.author.username}</Link><p className="whitespace-pre-wrap break-words text-sm">{comment.content}</p></div><time className={`ml-2 text-[10px] ${muted}`} dateTime={comment.created_at}>{formatPostDate(comment.created_at)}</time></div></div>)}
      <form onSubmit={submit} className="flex items-center gap-2"><input aria-label="Escribe un comentario" value={text} maxLength={2000} onChange={event => setText(event.target.value)} placeholder="Escribe un comentario…" className={`min-w-0 flex-1 rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#FF4D88]/40 ${isLight ? 'bg-[#f0f2f5]' : 'bg-[#3a3b3c]'}`} /><button type="submit" disabled={busy || !text.trim()} aria-label="Publicar comentario" className="rounded-full p-3 text-[#FF4D88] disabled:opacity-40">{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button></form>
    </div>}
  </article>;
}
