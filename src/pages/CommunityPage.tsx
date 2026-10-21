import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookOpen, Heart, Loader2, Send, User, X } from 'lucide-react';
import { readLocalImage, useExperienceUser } from '../hooks/useLocalExperience';
import { formatCount, handleOf, timeAgo, type CommunityComment, type CommunityMangaTag, type CommunityPost } from '../data/communityPosts';
import { CommunityIcon } from '../components/community/CommunityIcons';
import { CommunityProCard, CommunityStoreCard } from '../components/community/CommunityPromotions';
import { CommunityMangaPicker } from '../components/community/CommunityMangaPicker';
import PulseHeart from '../components/common/PulseHeart';
import { useHideOnScrollDown } from '../hooks/useHideOnScrollDown';
import '../styles/community.css';
import { useCommunityFeed } from '../hooks/useCommunityFeed';
import { useCommunityScroll } from '../hooks/useCommunityScroll';
import { loadMessageInbox } from '../services/messageInbox';
import { getCommunityPosition } from '../services/communityViewState';

type ExperienceUser = ReturnType<typeof useExperienceUser>;
type Tab = 'recent' | 'popular' | 'following' | 'saved';
const MAX_LENGTH = 1000;

function Avatar({ src, name = '' }: { src?: string; name?: string }) {
  const [failedSource, setFailedSource] = useState<string>();
  const hasImage = Boolean(src && failedSource !== src);

  return <span className="community-avatar relative flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full" aria-hidden={hasImage ? undefined : true}>
    {hasImage
      ? <img src={src} alt={name} width={42} height={42} className="absolute inset-0 block h-full w-full object-cover" onError={() => setFailedSource(src)} />
      : <User size={22} />}
  </span>;
}

export default function CommunityPage() {
  const user = useExperienceUser();
  const { pathname, search } = useLocation();
  const saved = pathname === '/comunidad/guardados';
  useEffect(() => {
    void import('./MessagesPage').catch(() => undefined);
    if (user.signedIn) void loadMessageInbox().catch(() => undefined);
  }, [user.id, user.signedIn]);
  if (!saved && pathname === '/comunidad' && new URLSearchParams(search).get('tab') === 'saved') {
    return <Navigate to="/comunidad/guardados" replace />;
  }
  return <Community key={`${user.id}:${saved}`} saved={saved} />;
}

function Community({ saved }: { saved: boolean }) {
  const user = useExperienceUser();
  const mobileBarHidden = useHideOnScrollDown();
  const navigate = useNavigate();
  const location = useLocation();
  const { postId } = useParams();
  const [params, setParams] = useSearchParams();
  const author = params.get('autor') || '';
  const query = params.get('q') || '';
  const tab: Tab = saved ? 'saved' : ['popular', 'following'].includes(params.get('tab') || '') ? params.get('tab') as Tab : 'recent';
  const { posts, follows, error, setError, loading, hasMore, loadMore, publish, update, toggleFollow } = useCommunityFeed(user.id, postId);
  useCommunityScroll(user.id, loading);
  const [notice, setNotice] = useState('');
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [exploring, setExploring] = useState(params.get('explorar') === '1');
  const selected = posts.find((post) => post.id === postId);

  useEffect(() => {
    if (params.get('publicar') === '1') {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ block: 'center' });
    } else if (params.get('explorar') === '1') searchRef.current?.focus();
  }, [params]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const setFilter = (next: Record<string, string>) => {
    if (postId || saved) navigate(`/comunidad?${new URLSearchParams(next)}`);
    else setParams(next);
  };
  const showAuthor = (post: CommunityPost) => {
    if (/^\d+$/.test(post.userId)) navigate(`/usuarios/${post.userId}`);
    else setFilter({ autor: post.userId });
  };
  const search = (tag: string) => { setFilter({ q: tag }); setExploring(true); };
  const compose = () => {
    if (saved || postId) { navigate('/comunidad?publicar=1'); return; }
    setFilter({});
    window.setTimeout(() => { composerRef.current?.focus(); composerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 0);
  };
  const openPost = (post: CommunityPost, focusReply = false) => {
    navigate(`/comunidad/publicacion/${encodeURIComponent(post.id)}`, { state: { communityReturn: `${location.pathname}${location.search}` }, flushSync: focusReply });
    if (focusReply && window.matchMedia('(max-width: 1023px)').matches) replyRef.current?.focus({ preventScroll: true });
  };
  const goBack = () => {
    const returnTo = (location.state as { communityReturn?: string } | null)?.communityReturn;
    navigate(returnTo?.startsWith('/comunidad') ? returnTo : '/comunidad');
  };
  const share = async (post: CommunityPost) => {
    const url = `${window.location.origin}/comunidad/publicacion/${encodeURIComponent(post.id)}`;
    const shareText = url;
    try { await navigator.clipboard.writeText(shareText); setNotice('Enlace de la publicación copiado al portapapeles.'); }
    catch { setNotice(`Puedes copiar y compartir: ${shareText}`); }
  };
  const communityReturn = getCommunityPosition(user.id)?.url || '/comunidad';
  const needle = query.trim().toLocaleLowerCase('es');
  const feed = posts.filter((post) => (!author || post.userId === author)
    && (tab !== 'saved' || post.saved)
    && (tab !== 'following' || follows.includes(post.userId))
    && (!needle || `${post.content} ${post.name} ${post.manga?.title || ''}`.toLocaleLowerCase('es').includes(needle)))
    .sort((a, b) => tab === 'popular' ? (b.likes + b.comments.length * 2) - (a.likes + a.comments.length * 2)
      : (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
  const suggestions = [...new Map(posts.filter((post) => post.userId !== user.id).map((post) => [post.userId, { userId: post.userId, name: post.name, avatar: post.avatar }])).values()];
  const readers = <Readers suggestions={suggestions} follows={follows} onFollow={toggleFollow} onSelect={(id) => setFilter({ autor: id })} />;

  return <main className={`community-page${postId ? ' is-thread' : ''}`}>
    {!saved && <h1 className="sr-only">{postId ? 'Publicación de la comunidad' : 'Comunidad'}</h1>}
    <div className="community-shell">
      <aside id="community-navigation" className="community-nav" aria-label="Navegación de comunidad">
        <nav className="community-nav-links">
          <button type="button" className={!postId && tab === 'recent' && !author && !needle && !exploring ? 'is-active' : ''} onClick={() => { setFilter({}); setExploring(false); }}><CommunityIcon name="home" size={30} />Inicio</button>
          <button type="button" className={exploring || Boolean(needle) ? 'is-active' : ''} onClick={() => { if (saved) { navigate('/comunidad?explorar=1'); return; } setExploring((prev) => !prev); window.setTimeout(() => searchRef.current?.focus(), 0); }}><CommunityIcon name="search" size={30} />Explorar</button>
          <Link to="/mensajes"><CommunityIcon name="messages" size={30} />Mensajes</Link>
          <Link to="/comunidad/guardados" className={saved ? 'is-active' : ''} aria-current={saved ? 'page' : undefined}><CommunityIcon name="bookmark" size={30} />Guardados</Link>
          <button type="button" onClick={() => navigate('/pro')}><CommunityIcon name="pro" size={30} />MukaiPro</button>
          <Link to={user.signedIn ? '/profile' : '/auth/login'}><CommunityIcon name="profile" size={30} />Ver Perfil</Link>
        </nav>
        <button type="button" className="community-publish" onClick={compose}>Publicar</button>
        <Link to={user.signedIn ? '/profile' : '/auth/login'} className="community-account"><Avatar src={user.avatar} /><span><strong>{user.name}</strong><small>{handleOf(user.name)}</small></span></Link>
      </aside>

      <div className={`community-main${postId ? '' : ' community-main--feed'}`}>
        {loading && <span role="status" aria-label="Cargando comunidad" />}{error && <p role="alert" className="community-error">{error}</p>}
        {notice && <div role="status" className="community-status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso"><X size={16} /></button></div>}
        {postId ? selected ? <Thread post={selected} user={user} onBack={goBack} onUpdate={update} onAuthor={showAuthor} onTag={search} onShare={share} replyRef={replyRef} onError={setError} />
          : <section className="community-empty"><button type="button" className="community-back" onClick={goBack}><ArrowLeft size={20} />Regresar</button><h2>Publicación no disponible</h2><p>No se pudo encontrar esta publicación en la comunidad.</p></section>
          : <>
            {saved ? <header className="community-saved-header"><Link to={communityReturn} state={{ restoreCommunityScroll: true }} className="community-back" aria-label="Volver a Comunidad"><ArrowLeft size={20} /></Link><h1>Publicaciones guardadas</h1></header> : <>
            <div className="community-tabs" role="group" aria-label="Filtrar publicaciones">
              {([{ id: 'recent', name: 'recent', label: 'Recientes' }, { id: 'popular', name: 'popular', label: 'Populares' }, { id: 'following', name: 'following', label: 'Siguiendo' }] as const).map(({ id, name, label }) => <button key={id} type="button" aria-label={label} aria-pressed={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setFilter(id === 'recent' ? {} : { tab: id })}><CommunityIcon name={name} size={19} /><span>{label}</span></button>)}
            </div>
            <div className={`community-search${exploring || query ? ' is-visible' : ''}`} role="search"><CommunityIcon name="search" size={19} /><input ref={searchRef} type="search" value={query} onChange={(event) => { const next = new URLSearchParams(params); if (event.target.value) next.set('q', event.target.value); else next.delete('q'); setParams(next); }} aria-label="Buscar en la comunidad" placeholder="Buscar publicaciones, lectores o #etiquetas…" />{query && <button type="button" onClick={() => { const next = new URLSearchParams(params); next.delete('q'); setParams(next); searchRef.current?.focus(); }} aria-label="Limpiar búsqueda"><X size={17} /></button>}</div>
            <Composer user={user} textareaRef={composerRef} onError={setError} onPost={async (post) => {
              if (!await publish(post)) return false;
              setFilter({}); setExploring(false); return true;
            }} />
            </>}
            {!saved && (author || query) && <div className="community-filter-summary"><span>{author ? `Publicaciones de ${posts.find((post) => post.userId === author)?.name || 'este lector'}` : `Resultados para «${query}» (${feed.length})`}</span><button type="button" onClick={() => { setFilter({}); setExploring(false); }}>Ver todas</button></div>}
            <section className="community-feed" aria-label={saved ? 'Publicaciones guardadas' : 'Publicaciones de la comunidad'}>
              {feed.map((post, index) => <Fragment key={post.id}>
                <PostCard post={post} user={user} onUpdate={update} onAuthor={showAuthor} onTag={search} onOpen={openPost} onShare={share} />
                {!saved && index === 1 && <div className="community-mobile-insert"><CommunityStoreCard /></div>}
                {!saved && index === 3 && <div className="community-mobile-insert">{readers}</div>}
              </Fragment>)}
              {!loading && !error && !feed.length && <div className="community-empty"><CommunityIcon name={tab === 'saved' ? 'bookmark' : 'following'} size={32} /><h2>{tab === 'saved' ? hasMore ? 'Busca entre tus publicaciones anteriores' : 'Aún no tienes guardados' : tab === 'following' ? 'Empieza a seguir lectores' : 'No encontramos publicaciones'}</h2><p>{tab === 'following' ? 'Sigue a otros lectores para ver sus publicaciones y recomendaciones aquí.' : tab === 'saved' ? hasMore ? 'Carga más publicaciones para encontrar otros guardados.' : 'Guarda tus publicaciones y reseñas favoritas para leerlas más tarde.' : 'Comparte una historia o explora las conversaciones de la comunidad.'}</p>{(tab !== 'recent' || author || query) && <button type="button" onClick={() => { setFilter({}); setExploring(false); }}>Ver todas las publicaciones</button>}</div>}
              {!saved && feed.length < 2 && <div className="community-mobile-insert"><CommunityStoreCard /></div>}
              {!saved && feed.length < 4 && <div className="community-mobile-insert">{readers}</div>}
              {hasMore && <div className="community-load-more"><button type="button" className="community-submit" onClick={() => void loadMore()}>{saved ? 'Buscar más guardados' : 'Cargar más publicaciones'}</button></div>}
            </section>
          </>}
      </div>
      <aside className="community-sidebar" aria-label="MukaiPro, lectores y tienda"><CommunityProCard /><Readers expandable suggestions={suggestions} follows={follows} onFollow={toggleFollow} onSelect={(id) => setFilter({ autor: id })} /><CommunityStoreCard /></aside>
    </div>
    {!postId && <Link to="/mensajes" className={`community-message-fab${mobileBarHidden ? ' is-lowered' : ''}`}><CommunityIcon name="messages" size={22} /><span>Mensajes</span></Link>}
  </main>;
}

function Readers({ suggestions, follows, onFollow, onSelect, expandable = false }: { suggestions: Array<{ userId: string; name: string; avatar: string }>; follows: string[]; onFollow: (id: string) => void; onSelect: (id: string) => void; expandable?: boolean }) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const pages = Math.ceil(suggestions.length / 3);
  const visibleReaders = expandable ? suggestions.slice(0, expanded ? undefined : 3) : suggestions.slice(page * 3, page * 3 + 3);
  return <section className="community-readers" aria-label="Lectores sugeridos">
    <div className="community-readers-header">
      <h2>Lectores Sugeridos</h2>
      {pages > 1 && expandable && <button type="button" className="community-more-readers" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Ver menos' : 'Ver todos'}</button>}
    </div>
    <div className="community-reader-list">{visibleReaders.map((reader) => <div className="community-reader" key={reader.userId}>
      <button type="button" onClick={() => onSelect(reader.userId)} aria-label={`Ver publicaciones de ${reader.name}`}><Avatar src={reader.avatar} /></button>
      <button type="button" className="community-reader-name" onClick={() => onSelect(reader.userId)}><strong>{reader.name}</strong><small>{handleOf(reader.name)}</small></button>
      <button type="button" className="community-follow" aria-pressed={follows.includes(reader.userId)} aria-label={`${follows.includes(reader.userId) ? 'Dejar de seguir a' : 'Seguir a'} ${reader.name}`} onClick={() => onFollow(reader.userId)}>{follows.includes(reader.userId) ? 'Siguiendo' : 'Seguir'}</button>
    </div>)}</div>
    {pages > 1 && !expandable && <div className="community-reader-pages" aria-label="Páginas de lectores">{Array.from({ length: pages }, (_, index) => <button key={index} type="button" className={page === index ? 'is-active' : ''} aria-label={`Lectores, página ${index + 1}`} aria-pressed={page === index} onClick={() => setPage(index)} />)}</div>}
  </section>;
}

function AttachmentTools({ onImage, onGif, onManga, onEmoji, activeManga = false, activeEmoji = false, disabled = false }: { onImage: () => void; onGif: () => void; onManga?: () => void; onEmoji: () => void; activeManga?: boolean; activeEmoji?: boolean; disabled?: boolean }) {
  return <div className="community-attachments">
    <button type="button" disabled={disabled} onClick={onImage} aria-label="Añadir imagen" title="Añadir imagen"><CommunityIcon name="image" size={22} /></button>
    <button type="button" disabled={disabled} onClick={onGif} aria-label="Añadir GIF" title="Añadir GIF"><CommunityIcon name="gif" size={22} /></button>
    {onManga && <button type="button" data-manga-picker-trigger aria-haspopup="dialog" className={activeManga ? 'is-active' : ''} onClick={onManga} aria-label="Recomendar manga" title="Recomendar manga"><CommunityIcon name="manga" size={23} /></button>}
    <button type="button" className={activeEmoji ? 'is-active' : ''} onClick={onEmoji} aria-label="Añadir emoji" title="Añadir emoji"><CommunityIcon name="emoji" size={21} /></button>
  </div>;
}

function EmojiChoices({ onPick }: { onPick: (emoji: string) => void }) {
  return <div className="community-emoji-picker" role="group" aria-label="Elegir emoji">{['🌸', '❤️', '😂', '😍', '✨', '🔥', '😭', '📚', '👏', '🤯'].map((emoji) => <button type="button" key={emoji} onClick={() => onPick(emoji)} aria-label={`Insertar ${emoji}`}>{emoji}</button>)}</div>;
}

async function readAttachment(file: File) {
  if (file.type !== 'image/gif') return readLocalImage(file);
  if (file.size > 1_200_000) throw new Error('El GIF debe pesar menos de 1,2 MB.');
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el GIF.'));
    reader.readAsDataURL(file);
  });
}

function AttachmentPreview({ image, onRemove }: { image: string; onRemove: () => void }) {
  return <div className="community-attachment-preview"><img src={image} alt="Imagen adjunta" /><button type="button" onClick={onRemove} aria-label="Quitar imagen"><X size={16} /></button></div>;
}

function Composer({ user, textareaRef, onPost, onError }: { user: ExperienceUser; textareaRef: RefObject<HTMLTextAreaElement | null>; onPost: (post: CommunityPost) => Promise<boolean>; onError: (message: string) => void }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [manga, setManga] = useState<CommunityMangaTag | null>(null);
  const [picking, setPicking] = useState(false);
  const closePicker = useCallback(() => setPicking(false), []);
  const [emoji, setEmoji] = useState(false);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectFile = (gif = false) => { if (fileRef.current) { fileRef.current.accept = gif ? 'image/gif' : 'image/jpeg,image/png,image/webp'; fileRef.current.click(); } };
  const canPost = !!(text.trim() || image || manga) && !reading;
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canPost) return;
    setReading(true);
    if (await onPost({ id: crypto.randomUUID(), userId: user.id, name: user.name, avatar: user.avatar, content: text.trim(), image, manga: manga || undefined, likes: 0, comments: [], createdAt: new Date().toISOString(), views: 0 })) {
      setText(''); setImage(''); setManga(null); setPicking(false); setEmoji(false);
      if (textareaRef.current) textareaRef.current.style.height = '';
    }
    setReading(false);
  };
  return <form className="community-composer" onSubmit={submit}>
    <Avatar src={user.avatar} />
    <div className="community-composer-body">
      <textarea
        ref={textareaRef}
        aria-label="Nueva publicación"
        placeholder="¿Qué estás leyendo o pensando hoy?"
        rows={1}
        maxLength={MAX_LENGTH}
        value={text}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            void submit();
          }
        }}
        onChange={(event) => { setText(event.target.value); event.target.style.height = 'auto'; event.target.style.height = `${event.target.scrollHeight}px`; }}
      />
      {image && <AttachmentPreview image={image} onRemove={() => setImage('')} />}
      {manga && <div className="community-draft-manga"><MangaAttachment manga={manga} /><div className="community-draft-manga-actions"><button type="button" onClick={() => setManga(null)} aria-label="Quitar recomendación"><X size={15} />Quitar</button></div></div>}
      {emoji && <EmojiChoices onPick={(value) => { setText((text) => `${text}${value}`.slice(0, MAX_LENGTH)); setEmoji(false); textareaRef.current?.focus(); }} />}
      <div className="community-compose-tools">
        {picking && <CommunityMangaPicker onPick={(tag) => { setManga(tag); setPicking(false); }} onClose={closePicker} />}
        <AttachmentTools onImage={() => selectFile()} onGif={() => selectFile(true)} onManga={() => { setPicking(!picking); setEmoji(false); }} onEmoji={() => { setEmoji(!emoji); setPicking(false); }} activeManga={picking || Boolean(manga)} activeEmoji={emoji} disabled={reading} />
        <div className="community-compose-submit-wrap">
          {text.length > 0 && <small className={`community-character-count${text.length > 900 ? ' is-near-limit' : ''}`}>{text.length}/{MAX_LENGTH}</small>}
          <button type="submit" disabled={!canPost} className="community-submit">{reading ? <Loader2 size={17} className="animate-spin" /> : 'Publicar'}</button>
        </div>
      </div>
      <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async (event) => {
        const input = event.currentTarget; const file = input.files?.[0]; if (!file) return;
        setReading(true);
        try { setImage(await readAttachment(file)); onError(''); } catch (caught) { onError((caught as Error).message); }
        finally { setReading(false); input.value = ''; }
      }} />
    </div>
  </form>;
}

function PostText({ content, onTag, detailPath }: { content: string; onTag: (tag: string) => void; detailPath?: string }) {
  const { pathname, search } = useLocation();
  return <p className="community-post-text">{content.split(/(#[\p{L}\p{N}_]+)/u).map((part, index) => part.startsWith('#')
    ? <button key={index} type="button" onClick={() => onTag(part)}>{part}</button>
    : detailPath && part.trim() ? <Link className="community-post-content-link" key={index} to={detailPath} state={{ communityReturn: `${pathname}${search}` }}>{part}</Link> : part)}</p>;
}

function MangaAttachment({ manga }: { manga: CommunityMangaTag }) {
  return <Link to={`/manga/${manga.id}`} className="community-manga-attachment">
    {manga.cover ? <img src={manga.cover} alt="" loading="lazy" /> : <span className="community-manga-attachment__icon"><BookOpen size={20} /></span>}
    <span><strong>{manga.title}</strong></span>
    <span className="community-manga-attachment__arrow"><ArrowUpRight size={16} /></span>
  </Link>;
}

function PostActions({ post, onUpdate, onComment, onShare, detail = false }: { post: CommunityPost; onUpdate: (post: CommunityPost) => Promise<boolean>; onComment: () => void; onShare: (post: CommunityPost) => void; detail?: boolean }) {
  return <div className="community-post-actions">
    <button type="button" className="community-action" onClick={onComment} aria-label="Comentar"><CommunityIcon name="comment" size={21} /><span>{formatCount(post.commentCount ?? post.comments.length)}</span></button>
    <PulseHeart
      liked={!!post.liked}
      count={post.likes}
      onChange={(liked, count) => { void onUpdate({ ...post, liked, likes: Math.max(0, count) }); }}
      showCount
      icon="heart"
      idleOutline
      size={20}
      corner={32}
      likedColor="var(--community-accent)"
      idleColor="var(--community-muted)"
      pillColor="var(--community-soft)"
      textColor="var(--community-ink)"
      duration={560}
      dotSize={0.3}
      overshoot={1.7}
      beat={3}
      rollDuration={350}
      label="Me gusta"
      className="community-pulse-like"
    />
    {!detail && <span className="community-views" aria-label={`${post.views || 0} visualizaciones`}><CommunityIcon name="views" size={17} /><span>{formatCount(post.views || 0)}</span></span>}
    <span className="community-action-spacer" />
    <button type="button" className={`community-action${post.saved ? ' is-active' : ''}`} aria-label="Guardar" aria-pressed={!!post.saved} onClick={() => onUpdate({ ...post, saved: !post.saved })}><CommunityIcon name="bookmark" size={22} />{detail && <span>{post.saved ? 'Guardado' : 'Guardar'}</span>}</button>
    <button type="button" className="community-action" aria-label="Compartir publicación" onClick={() => onShare(post)}><CommunityIcon name="share" size={21} /></button>
  </div>;
}

type PostProps = { post: CommunityPost; user: ExperienceUser; onUpdate: (post: CommunityPost) => Promise<boolean>; onAuthor: (post: CommunityPost) => void; onTag: (tag: string) => void; onShare: (post: CommunityPost) => void };

function PostCard({ post, user, onUpdate, onAuthor, onTag, onOpen, onShare }: PostProps & { onOpen: (post: CommunityPost, focusReply?: boolean) => void }) {
  const own = post.userId === user.id;
  const name = own ? user.name : post.name;
  return <article className="community-post">
    <button type="button" className="community-post-author-avatar" onClick={() => onAuthor(post)} aria-label={`Publicaciones de ${name}`}><Avatar src={own ? user.avatar : post.avatar} /></button>
    <div className="community-post-body">
      <div className="community-post-heading">
        <button type="button" onClick={() => onAuthor(post)}>
          <strong>{name}</strong>
          <small>{handleOf(name)}</small>
        </button>
        <span className="community-post-dot" aria-hidden="true">·</span>
        <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
      </div>
      <PostText content={post.content} onTag={onTag} detailPath={`/comunidad/publicacion/${encodeURIComponent(post.id)}`} />
      {post.image && <button type="button" className="community-image-link" onClick={() => onOpen(post)} aria-label="Ver publicación e imagen"><img src={post.image} alt="Imagen de la publicación" className="community-post-image" loading="lazy" /></button>}
      {post.manga && <MangaAttachment manga={post.manga} />}
      <PostActions post={post} onUpdate={onUpdate} onComment={() => onOpen(post, true)} onShare={onShare} />
    </div>
  </article>;
}

function Thread({ post, user, onBack, onUpdate, onAuthor, onTag, onShare, replyRef, onError }: PostProps & { onBack: () => void; replyRef: RefObject<HTMLTextAreaElement | null>; onError: (error: string) => void }) {
  const name = post.userId === user.id ? user.name : post.name;
  const avatar = post.userId === user.id ? user.avatar : post.avatar;
  const date = post.createdAt && Number.isFinite(Date.parse(post.createdAt)) ? new Date(post.createdAt) : null;
  const likeReply = (index: number) => onUpdate({ ...post, comments: post.comments.map((entry, position) => position === index ? { ...entry, liked: !entry.liked, likes: Math.max(0, (entry.likes || 0) + (entry.liked ? -1 : 1)) } : entry) });
  return <section className="community-thread">
    <div className="community-thread-topbar">
      <button type="button" className="community-back" onClick={onBack}><ArrowLeft size={20} /><span>Hilo de la comunidad</span></button>
    </div>
    <article className="community-thread-post">
      <button type="button" className="community-thread-author" onClick={() => onAuthor(post)}><Avatar src={avatar} /><span><strong>{name}</strong><small>{handleOf(name)}</small></span></button>
      <PostText content={post.content} onTag={onTag} />
      {post.image && <img src={post.image} alt="Imagen de la publicación" className="community-post-image" />}
      {post.manga && <MangaAttachment manga={post.manga} />}
      <div className="community-thread-meta">{date && <time dateTime={post.createdAt}>{date.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })} · {date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })}</time>}<span className="community-views"><CommunityIcon name="views" size={18} /><strong>{formatCount(post.views || 0)}</strong> Visualizaciones</span></div>
      <PostActions post={post} onUpdate={onUpdate} onComment={() => replyRef.current?.focus()} onShare={onShare} detail />
    </article>
    <section className="community-replies" aria-label="Respuestas a la publicación">
      <h3 className="community-replies-title">Respuestas <span>({post.comments.length})</span></h3>
      {post.comments.length === 0 ? (
        <p className="community-replies-empty">Sé el primero en responder a esta publicación.</p>
      ) : post.comments.map((entry, index) => <article className="community-reply" key={entry.id || index}>
        <Avatar src={entry.avatar || (entry.name === user.name ? user.avatar : undefined)} />
        <div className="community-reply-content">
          <div className="community-reply-header">
            <strong>{entry.name}</strong>
            <small>{handleOf(entry.name)}</small>
            {entry.createdAt && <time dateTime={entry.createdAt}>· {timeAgo(entry.createdAt)}</time>}
          </div>
          <p>{entry.text}</p>
          {entry.image && <img src={entry.image} alt="Imagen de la respuesta" className="community-post-image" />}
        </div>
        <button type="button" className={`community-action${entry.liked ? ' is-active' : ''}`} onClick={() => likeReply(index)} aria-pressed={!!entry.liked} aria-label="Me gusta la respuesta"><Heart size={16} fill={entry.liked ? 'currentColor' : 'none'} />{entry.likes ? <span>{entry.likes}</span> : null}</button>
      </article>)}
    </section>
    <ReplyComposer key={post.id} user={user} textareaRef={replyRef} onError={onError} onReply={(reply) => onUpdate({ ...post, comments: [...post.comments, reply] })} />
  </section>;
}

function ReplyComposer({ user, textareaRef, onReply, onError }: { user: ExperienceUser; textareaRef: RefObject<HTMLTextAreaElement | null>; onReply: (reply: CommunityComment) => Promise<boolean>; onError: (error: string) => void }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [reading, setReading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectFile = (gif = false) => { if (fileRef.current) { fileRef.current.accept = gif ? 'image/gif' : 'image/jpeg,image/png,image/webp'; fileRef.current.click(); } };
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if ((!text.trim() && !image) || reading) return;
    setReading(true);
    if (await onReply({ id: crypto.randomUUID(), userId: user.id, name: user.name, avatar: user.avatar, text: text.trim(), image, likes: 0, createdAt: new Date().toISOString() })) { setText(''); setImage(''); setEmoji(false); setExpanded(false); if (textareaRef.current) textareaRef.current.style.height = ''; }
    setReading(false);
  };
  return <form className={`community-reply-bar${expanded ? ' is-expanded' : ''}`} onSubmit={submit}>
    <Avatar src={user.avatar} />
    <div className="community-reply-content">
      {image && <AttachmentPreview image={image} onRemove={() => setImage('')} />}
      {emoji && <EmojiChoices onPick={(value) => { setText((text) => `${text}${value}`.slice(0, 500)); setEmoji(false); textareaRef.current?.focus(); }} />}
      <textarea
        ref={textareaRef}
        rows={expanded ? 2 : 1}
        maxLength={500}
        aria-label="Tu respuesta"
        placeholder="Escribe una respuesta…"
        value={text}
        onFocus={() => setExpanded(true)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            void submit();
          }
        }}
        onChange={(event) => { setText(event.target.value); event.target.style.height = 'auto'; event.target.style.height = `${event.target.scrollHeight}px`; }}
      />
    </div>
    <div className="community-reply-tools"><AttachmentTools onImage={() => selectFile()} onGif={() => selectFile(true)} onEmoji={() => setEmoji(!emoji)} activeEmoji={emoji} disabled={reading} />{(text.trim() || image || reading) && <button className="community-send" type="submit" disabled={reading} aria-label="Publicar respuesta">{reading ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}</button>}</div>
    <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={async (event) => {
      const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; setReading(true);
      try { setImage(await readAttachment(file)); onError(''); } catch (caught) { onError((caught as Error).message); }
      finally { setReading(false); input.value = ''; }
    }} />
  </form>;
}
