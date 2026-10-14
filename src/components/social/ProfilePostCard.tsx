import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, MessageCircle, Send, Share2, ThumbsUp, User } from 'lucide-react';
import { getStoredToken, getStoredUser } from '../../services/authService';
import { getProfilePostComments, interactWithProfilePost, type ProfilePost, type ProfilePostComment } from '../../services/profilePostService';
import { PROFILE_UPDATED_EVENT, type ProfileUpdatedDetail } from '../../services/wordpressService';
import { formatPostDate } from '../../utils/profileDate';
import { CommunityIcon } from '../community/CommunityIcons';

const communityTimeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  return `${Math.floor(seconds / 86400)} d`;
};
const communityCount = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')} mil` : String(value);

const reactions = [
  { id: 'like', emoji: '👍', label: 'Me gusta' }, { id: 'love', emoji: '❤️', label: 'Me encanta' },
  { id: 'haha', emoji: '😂', label: 'Me divierte' }, { id: 'wow', emoji: '😮', label: 'Me asombra' },
  { id: 'sad', emoji: '😢', label: 'Me entristece' }, { id: 'angry', emoji: '😡', label: 'Me enoja' },
];

export function ProfilePostCard({ initialPost, isLight, onShared, variant = 'default', detail = false }: { initialPost: ProfilePost; isLight: boolean; onShared?: (post: ProfilePost) => void; variant?: 'default' | 'community'; detail?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState<ProfilePostComment[]>([]);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [saved, setSaved] = useState(() => {
    try {
      const viewerId = getStoredUser()?.id;
      const ids = JSON.parse(localStorage.getItem(`mm-profile-saved-posts-${viewerId}`) || '[]') as string[];
      return ids.includes(String(initialPost.id));
    } catch { return false; }
  });
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reactionSequence = useRef(0);
  const commentInput = useRef<HTMLTextAreaElement>(null);
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
    navigate('/auth/login', { state: { returnTo: detail ? `/usuarios/${post.user_id}/publicacion/${post.id}` : `/usuarios/${post.user_id}#post-${post.id}` } });
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
  useEffect(() => {
    if (!detail) return;
    let live = true;
    void getProfilePostComments(initialPost.id).then((result) => {
      if (!live) return;
      setComments(result.comments);
      setHasMore(result.hasMore);
    }).catch((caught) => { if (live) setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los comentarios.'); });
    return () => { live = false; };
  }, [detail, initialPost.id]);
  const openPost = () => {
    navigate(`/usuarios/${post.user_id}/publicacion/${post.id}`, { state: { profilePost: post, profileReturn: `${location.pathname}${location.search}` } });
  };
  const openComments = () => {
    if (detail) { commentInput.current?.focus(); return; }
    openPost();
  };
  const openPostFromCard = (event: MouseEvent<HTMLElement>) => {
    if (variant !== 'community' || detail || window.getSelection()?.toString()) return;
    if ((event.target as Element).closest('a, button, input, textarea, video, [contenteditable]')) return;
    openPost();
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
  const toggleSaved = () => {
    if (!requireAuth()) return;
    const next = !saved;
    setSaved(next);
    try {
      const key = `mm-profile-saved-posts-${getStoredUser()?.id}`;
      const ids = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]') as string[]);
      if (next) ids.add(String(post.id)); else ids.delete(String(post.id));
      localStorage.setItem(key, JSON.stringify([...ids]));
    } catch { /* Saving stays available for the current session. */ }
  };
  const media = (item: ProfilePost) => <>{item.content && <p className="whitespace-pre-wrap break-words px-4 pb-4 text-[15px] leading-6">{item.content}</p>}{item.media_url && (item.media_type === 'video'
    ? <video src={item.media_url} controls preload="metadata" className="max-h-[620px] w-full bg-black object-contain" />
    : <img src={item.media_url} alt="Contenido de la publicación" loading="lazy" decoding="async" className="max-h-[620px] w-full object-contain" />)}</>;
  const total = Object.values(post.reactions || {}).reduce((sum, value) => sum + value, 0);
  const selected = reactions.find(reaction => reaction.id === post.my_reaction);
  if (detail) {
    const date = Number.isFinite(Date.parse(post.created_at)) ? new Date(post.created_at) : null;
    const viewer = getStoredUser();
    return <div className="profile-post-thread-content">
      <article className="community-thread-post">
        <Link to={`/usuarios/${post.author.id}`} className="community-thread-author">
          {post.author.avatar_url ? <img className="community-avatar" src={post.author.avatar_url} alt="" /> : <span className="community-avatar"><User size={22} /></span>}
          <span><strong>{post.author.username}</strong><small>@{post.author.username}</small></span>
        </Link>
        {post.content && <p className="community-post-text whitespace-pre-wrap break-words">{post.content.split(/(#[\p{L}\p{N}_]+)/u).map((part, index) => part.startsWith('#') ? <Link key={index} to={`/comunidad?q=${encodeURIComponent(part)}`} className="profile-post-thread-tag">{part}</Link> : part)}</p>}
        {post.media_url && (post.media_type === 'video'
          ? <video src={post.media_url} controls preload="metadata" className="community-post-image profile-post-thread-video" />
          : <img src={post.media_url} alt="Contenido de la publicación" className="community-post-image" />)}
        {post.shared_post_id && <div className="profile-post-thread-shared">{post.shared_post ? <><Link to={`/usuarios/${post.shared_post.author.id}/publicacion/${post.shared_post.id}`}>{post.shared_post.author.username}</Link>{media(post.shared_post)}</> : 'Esta publicación ya no está disponible.'}</div>}
        <div className="community-thread-meta">
          {date && <time dateTime={post.created_at}>{date.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })} · {date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })}</time>}
          <span className="community-views"><CommunityIcon name="views" size={21} /><strong>{communityCount(post.views ?? 0)}</strong> Visualizaciones</span>
        </div>
        <div className="community-post-actions">
          <button type="button" className="community-action" onClick={() => commentInput.current?.focus()} aria-label="Comentar"><CommunityIcon name="comment" size={24} /><span>{communityCount(post.comment_count || 0)}</span></button>
          <button type="button" className={`community-action${post.my_reaction === 'like' ? ' is-active' : ''}`} aria-pressed={post.my_reaction === 'like'} aria-label="Me gusta" onClick={() => react('like')}><CommunityIcon name="like" size={18} /><span>{communityCount(post.reactions?.like || 0)}</span></button>
          <span className="community-action-spacer" />
          <button type="button" className={`community-action${saved ? ' is-active' : ''}`} aria-label={saved ? 'Quitar de guardados' : 'Guardar publicación'} aria-pressed={saved} onClick={toggleSaved}><CommunityIcon name="bookmark" size={26} /><span>{saved ? 1 : 0}</span></button>
          <button type="button" className="community-action" disabled={busy} onClick={() => void interact('share')} aria-label="Compartir publicación"><CommunityIcon name="share" size={24} /></button>
        </div>
      </article>
      {error && <p role="alert" className="community-error">{error}</p>}
      {notice && <p role="status" className="community-status">{notice}</p>}
      <section className="community-replies" aria-label="Respuestas a la publicación">
        {loading && <Loader2 className="mx-auto mt-5 animate-spin" size={18} />}
        {hasMore && <button type="button" className="profile-post-thread-more" onClick={() => void loadComments(true)} disabled={loading}>Ver comentarios anteriores</button>}
        {comments.map(comment => <article className="community-reply" key={comment.id}>
          <Link to={`/usuarios/${comment.author.id}`}>{comment.author.avatar_url ? <img src={comment.author.avatar_url} alt="" className="community-avatar" loading="lazy" /> : <span className="community-avatar"><User size={18} /></span>}</Link>
          <div className="community-reply-content"><strong>{comment.author.username}</strong><small>@{comment.author.username}</small><p>{comment.content}</p></div>
        </article>)}
      </section>
      <form className="community-reply-bar" onSubmit={submit}>
        {viewer?.avatar ? <img src={viewer.avatar} alt="" className="community-avatar" /> : <span className="community-avatar"><User size={22} /></span>}
        <div className="community-reply-content"><textarea ref={commentInput} rows={1} aria-label="Tu respuesta" value={text} maxLength={2000} onChange={event => setText(event.target.value)} placeholder="Respuesta" /></div>
        <div className="community-reply-tools"><div className="community-attachments"><button type="button" aria-label="Añadir emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen(open => !open)}><CommunityIcon name="emoji" size={24} /></button></div>{(text.trim() || busy) && <button type="submit" className="community-send" disabled={busy} aria-label="Publicar respuesta">{busy ? <Loader2 size={21} className="animate-spin" /> : <Send size={21} />}</button>}</div>
        {emojiOpen && <div className="community-emoji-picker" role="group" aria-label="Elegir emoji">{['🌸', '❤️', '😂', '😍', '✨', '🔥', '😭', '📚'].map(emoji => <button type="button" key={emoji} onClick={() => { setText(current => `${current}${emoji}`.slice(0, 2000)); setEmojiOpen(false); commentInput.current?.focus(); }} aria-label={`Insertar ${emoji}`}>{emoji}</button>)}</div>}
      </form>
    </div>;
  }
  return <article id={`post-${post.id}`} onClick={openPostFromCard} className={`scroll-mt-24 overflow-hidden rounded-xl border shadow-sm ${border} ${isLight ? 'bg-white text-[#1c1e21]' : 'bg-[#242526] text-white'} ${variant === 'community' ? `profile-post-community${detail ? '' : ' is-openable'}` : ''}`}>
    <header className="flex items-center gap-3 p-4">
      <Link to={`/usuarios/${post.author.id}`} className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-500/15">{post.author.avatar_url ? <img src={post.author.avatar_url} alt="" decoding="async" className="h-full w-full object-cover" /> : <User size={20} />}</Link>
      <div className="min-w-0">{variant === 'community' ? <><Link to={`/usuarios/${post.author.id}`} className="profile-post-community-author"><strong>{post.author.username}</strong><small>@{post.author.username}</small></Link><time dateTime={post.created_at}>{communityTimeAgo(post.created_at)}</time></> : <><Link to={`/usuarios/${post.author.id}`} className="block truncate text-sm font-bold">{post.author.username}</Link><time dateTime={post.created_at} className={`text-xs ${muted}`}>{formatPostDate(post.created_at)}</time></>}</div>
    </header>
    {variant === 'community' && !detail && <Link to={`/usuarios/${post.user_id}/publicacion/${post.id}`} state={{ profilePost: post, profileReturn: `${location.pathname}${location.search}` }} className="sr-only">Ver publicación de {post.author.username}</Link>}
    {media(post)}
    {post.shared_post_id && <div className={`mx-4 mb-4 overflow-hidden rounded-lg border ${border}`}>{post.shared_post ? <><Link to={`/usuarios/${post.shared_post.author.id}#post-${post.shared_post.id}`} className="block p-4 text-sm font-bold">{post.shared_post.author.username}</Link>{media(post.shared_post)}</> : <p className={`p-4 text-sm ${muted}`}>Esta publicación ya no está disponible.</p>}</div>}
    {variant === 'community' ? <div className="profile-post-community-actions">
      <button type="button" onClick={openComments} aria-label="Comentar"><CommunityIcon name="comment" size={24} /><span>{communityCount(post.comment_count || 0)}</span></button>
      <button type="button" aria-label="Me gusta" aria-pressed={post.my_reaction === 'like'} onClick={() => react('like')} className={post.my_reaction === 'like' ? 'is-active' : ''}><CommunityIcon name="like" size={18} /><span>{communityCount(post.reactions?.like || 0)}</span></button>
      <span className="profile-post-community-views" aria-label={`${post.views ?? 0} visualizaciones`}><CommunityIcon name="views" size={18} />{communityCount(post.views ?? 0)}</span>
      <span className="profile-post-community-spacer" />
      <button type="button" onClick={toggleSaved} aria-label={saved ? 'Quitar de guardados' : 'Guardar publicación'} aria-pressed={saved} className={saved ? 'is-active' : ''}><CommunityIcon name="bookmark" size={26} /></button>
      <button type="button" disabled={busy} onClick={() => void interact('share')} aria-label="Compartir publicación"><CommunityIcon name="share" size={24} /></button>
    </div> : <><div className={`mx-4 flex flex-wrap items-center justify-between gap-2 py-3 text-xs ${muted}`}><span>{reactions.filter(reaction => post.reactions?.[reaction.id]).map(reaction => reaction.emoji).join(' ')} {total > 0 ? total : ''}</span><span>{post.comment_count || 0} comentarios · {post.share_count || 0} compartidos</span></div>
    <div className={`mx-4 grid grid-cols-3 gap-1 border-y py-1 ${border}`}>
      <button type="button" aria-expanded={reactionsOpen} onClick={() => setReactionsOpen(value => !value)} className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${hover} ${selected ? 'text-[#FF4D88]' : muted}`}>{selected ? <span>{selected.emoji}</span> : <ThumbsUp size={17} />}<span>{selected?.label || 'Reaccionar'}</span></button>
      <button type="button" onClick={openComments} className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${hover} ${muted}`}><MessageCircle size={17} />Comentar</button>
      <button type="button" disabled={busy} onClick={() => void interact('share')} className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${hover} ${muted}`}><Share2 size={17} />Compartir</button>
    </div></>}
    {variant === 'default' && reactionsOpen && <div className="flex justify-center gap-1 p-3" aria-label="Elegir reacción">{reactions.map(reaction => <button key={reaction.id} type="button" aria-label={reaction.label} aria-pressed={selected?.id === reaction.id} title={reaction.label} onClick={() => react(reaction.id)} className={`rounded-full p-2 text-2xl transition hover:-translate-y-1 ${selected?.id === reaction.id ? 'bg-[#FF4D88]/15' : ''}`}>{reaction.emoji}</button>)}</div>}
    {error && <p role="alert" className="px-4 py-3 text-sm text-red-500">{error}</p>}
    {notice && <p role="status" className="px-4 py-3 text-sm text-[#FF4D88]">{notice} <Link to="/perfil" className="font-bold underline">Ver perfil</Link></p>}
  </article>;
}
