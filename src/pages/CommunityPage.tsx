import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Bell, BookMarked, BookOpen, Bookmark, Feather, Heart, House, ImagePlus, Loader2, Mail, MessageCircle, Search, User, UserRound, X } from 'lucide-react';
import { readLocalImage, useExperienceUser, useLocalExperience } from '../hooks/useLocalExperience';
import { getChaptersBySeries, searchMangas, type SeriesChapter } from '../services/mangaService';
import type { MangaCapitulo } from '../types/manga';
import { communityAds, communitySeeds, computeTrends, formatCount, handleOf, suggestedReaders, timeAgo, type CommunityMangaTag, type CommunityPost } from '../data/communityPosts';

type Tab = 'foryou' | 'trending';
type View = 'home' | 'saved';
type ExperienceUser = ReturnType<typeof useExperienceUser>;

/** Único acento de la sección: el rosa de la marca con un mínimo de rojo (nada de rojo puro). */
const ROSE = '#ff4a7d';
const MAX_LENGTH = 1000;
/** Cada cuántas publicaciones se intercala un anuncio en móvil. */
const AD_EVERY = 2;

const divider = 'border-black/10 dark:border-white/10';
const muted = 'text-[#536471] dark:text-[#71767b]';
const strong = 'text-black/80 dark:text-white/85';
const rowHover = 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]';
const iconHover = 'hover:bg-black/[0.06] dark:hover:bg-white/10';
const pill = 'rounded-full bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90';
const panel = 'bg-[#f7f9f9] dark:bg-[#16181c]';

/** Sin foto se usa el mismo círculo gris con silueta que el perfil de "Más" (nunca la inicial sobre rosa). */
const Avatar = ({ src, className = 'h-10 w-10', icon = 18 }: { src?: string; className?: string; icon?: number }) => src
  ? <img src={src} alt="" className={`${className} shrink-0 rounded-full object-cover`} />
  : <span className={`${className} flex shrink-0 items-center justify-center rounded-full bg-black/[0.08] text-black/60 dark:bg-white/10 dark:text-white/70`}><User size={icon} /></span>;

/** Bocadillo de comentar: con `trace` dibuja su contorno en rojo (pathLength=1 permite animar el trazo completo). */
const CommentGlyph = ({ size, trace }: { size: number; trace: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={trace ? 'community-comment-trace' : undefined}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" pathLength={1} />
  </svg>
);

/**
 * Corazón y marcador. El contorno base siempre está pintado (así no hay ningún frame en blanco
 * ni "doble" icono); al activarse, un segundo trazo del color de acento recorre el contorno por
 * encima y después se rellena. Sin `trace` (p. ej. al recargar) el activo sale ya relleno.
 */
const FillGlyph = ({ d, size, active, trace }: { d: string; size: number; active: boolean; trace: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} className={trace ? 'text-black/80 dark:text-white/85' : undefined} />
    {active && <path d={d} fill="currentColor" pathLength={1} className={trace ? 'community-fill-trace' : undefined} />}
  </svg>
);
const HEART = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';
const BOOKMARK = 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z';
const HeartGlyph = (props: { size: number; active: boolean; trace: boolean }) => <FillGlyph d={HEART} {...props} />;
const BookmarkGlyph = (props: { size: number; active: boolean; trace: boolean }) => <FillGlyph d={BOOKMARK} {...props} />;

/** Comunidad: feed tipo X con publicaciones locales; el chat de mensajes se abre desde el botón flotante. */
export default function CommunityPage() {
  const user = useExperienceUser();
  // El chat se precarga aquí para que el botón "Mensajes" abra al instante, sin loader.
  useEffect(() => { void import('./MessagesPage'); }, []);
  return <Community key={user.id} />;
}

function Community() {
  const user = useExperienceUser();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const author = params.get('autor') || '';
  const [posts, savePosts] = useLocalExperience<CommunityPost[]>(`mm-community-${user.id}`, communitySeeds);
  const [follows, saveFollows] = useLocalExperience<string[]>(`mm-community-follows-${user.id}`, []);
  const [tab, setTab] = useState<Tab>('foryou');
  const [view, setView] = useState<View>('home');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const write = (next: CommunityPost[]) => {
    try { savePosts(next); setError(''); return true; }
    catch (caught) { setError((caught as Error).message); return false; }
  };
  const update = (next: CommunityPost) => write(posts.map((post) => post.id === next.id ? next : post));
  const toggleFollow = (id: string) => {
    try { saveFollows(follows.includes(id) ? follows.filter((entry) => entry !== id) : [...follows, id]); setError(''); }
    catch (caught) { setError((caught as Error).message); }
  };

  const trends = useMemo(() => computeTrends(posts), [posts]);
  const needle = query.trim().toLowerCase();
  const visible = posts
    .filter((post) =>
      (!author || post.userId === author)
      && (view !== 'saved' || post.saved)
      && (!needle || `${post.content} ${post.name} ${post.manga?.title || ''}`.toLowerCase().includes(needle)));
  // "Tendencia" ordena por interacción; "Para ti" respeta el orden de publicación.
  const feed = tab === 'trending' && view === 'home' && !author
    ? [...visible].sort((a, b) => (b.likes + b.comments.length * 2) - (a.likes + a.comments.length * 2))
    : visible;

  const search = (value: string) => {
    setQuery(value);
    setView('home');
    setParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goHome = () => {
    setView('home');
    setQuery('');
    setParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const focusComposer = () => {
    goHome();
    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      composerRef.current?.focus();
    });
  };
  const showAuthor = (post: CommunityPost) => {
    if (post.userId === user.id && user.signedIn) navigate('/perfil');
    else { setView('home'); setParams({ autor: post.userId }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  const authorName = author ? (posts.find((post) => post.userId === author)?.name || user.name) : '';
  const profileTo = user.signedIn ? '/perfil' : '/auth/login';
  const navItems: Array<{ key: string; label: string; Icon: typeof House; to?: string; onClick?: () => void; active?: boolean }> = [
    { key: 'home', label: 'Inicio', Icon: House, onClick: goHome, active: view === 'home' && !author },
    { key: 'explore', label: 'Explorar', Icon: Search, to: '/biblioteca' },
    { key: 'notifications', label: 'Notificaciones', Icon: Bell, to: '/notificaciones' },
    { key: 'messages', label: 'Mensajes', Icon: Mail, to: '/mensajes' },
    { key: 'saved', label: 'Guardados', Icon: Bookmark, onClick: () => { setView('saved'); setParams({}); }, active: view === 'saved' },
    { key: 'profile', label: 'Perfil', Icon: UserRound, to: profileTo },
  ];
  const navClass = (active?: boolean) => `flex w-fit items-center gap-5 rounded-full p-3 text-xl transition-colors ${iconHover} ${active ? 'font-bold' : ''}`;

  const suggestions = trends.map((trend) => trend.label);

  return (
    <div className="community-page mx-auto flex w-full max-w-[1265px] justify-center px-0 pt-[60px] lg:px-4 lg:pt-16">
      {/* ───────── Navegación (escritorio) ───────── */}
      <aside className="hidden w-[88px] shrink-0 lg:block xl:w-[275px]">
        <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col justify-between pb-4 pr-3">
          <nav aria-label="Navegación de comunidad" className="mt-1 flex flex-col items-start gap-1">
            {navItems.map(({ key, label, Icon, to, onClick, active }) => to
              ? <Link key={key} to={to} className={navClass(active)}><Icon size={26} strokeWidth={active ? 2.5 : 2} /><span className="hidden pr-4 xl:inline">{label}</span></Link>
              : <button key={key} type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={navClass(active)}><Icon size={26} strokeWidth={active ? 2.5 : 2} /><span className="hidden pr-4 xl:inline">{label}</span></button>)}
            <button type="button" onClick={focusComposer} className={`mt-4 flex h-[52px] w-[52px] items-center justify-center rounded-[4px] text-[17px] font-semibold transition-colors xl:w-[90%] ${pill}`}>
              <Feather size={24} className="xl:hidden" />
              <span className="hidden xl:inline">Publicar</span>
            </button>
          </nav>
          <Link to={profileTo} className={`flex items-center gap-3 rounded-full p-3 transition-colors ${iconHover}`}>
            <Avatar src={user.avatar} />
            <span className="hidden min-w-0 xl:block">
              <strong className="block truncate text-[15px] font-bold">{user.name}</strong>
              <span className={`block truncate text-[15px] ${muted}`}>{user.signedIn ? handleOf(user.name) : 'Iniciar sesión'}</span>
            </span>
          </Link>
        </div>
      </aside>

      {/* ───────── Feed ───────── */}
      <main className={`min-h-[calc(100dvh-60px)] w-full max-w-[600px] min-w-0 border-x ${divider} lg:min-h-[calc(100dvh-4rem)]`}>
        <header className={`border-b ${divider}`}>
          {view === 'saved' || author ? (
            <div className="flex items-center gap-4 px-4 py-2">
              <button type="button" onClick={goHome} aria-label="Volver al inicio" className={`-ml-2 rounded-full p-2 transition-colors ${iconHover}`}><ArrowLeft size={20} /></button>
              <h1 className="truncate text-xl font-bold">{author ? `Publicaciones de ${authorName}` : 'Guardados'}</h1>
            </div>
          ) : (
            <>
              <div className="hidden items-center px-4 py-3 lg:flex"><h1 className="text-xl font-bold">Inicio</h1></div>
              {/* Las dos pestañas van juntas en el centro. */}
              <div className="flex items-stretch justify-center gap-4" role="tablist" aria-label="Publicaciones">
                {([['foryou', 'Para ti'], ['trending', 'Tendencia']] as Array<[Tab, string]>).map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`relative px-3 py-4 text-[15px] transition-colors ${tab === id ? 'font-bold' : muted}`}>
                    {label}
                    {tab === id && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-1 rounded-full" style={{ backgroundColor: ROSE }} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </header>

        {view === 'home' && !author && (
          <>
            <Composer user={user} textareaRef={composerRef} onPost={(post) => { if (write([post, ...posts])) { setTab('foryou'); setQuery(''); return true; } return false; }} onError={setError} />
            {/* Respiro entre el compositor y el feed. */}
            <div aria-hidden="true" className={`h-4 border-b ${divider}`} />
          </>
        )}

        {query && <div className={`flex items-center justify-between gap-3 border-b px-4 py-2.5 text-[14px] ${divider}`}><span className="truncate">Resultados para <strong>{query}</strong></span><button type="button" onClick={() => setQuery('')} className={`flex items-center gap-1 text-[13px] font-bold ${muted}`}>Limpiar <X size={14} /></button></div>}

        {error && <p role="alert" className="bg-[#ff4a7d]/10 px-4 py-2 text-[13px] text-[#ff4a7d]">{error}</p>}

        {feed.map((post, index) => (
          <FeedItem key={post.id} index={index} withAds={view === 'home'}>
            <PostCard post={post} user={user} onUpdate={update} onAuthor={showAuthor} onTag={search} />
          </FeedItem>
        ))}

        {!feed.length && (
          <div className="px-8 py-14 text-center">
            <h2 className="text-[26px] font-extrabold leading-tight tracking-tight">{view === 'saved' ? 'Guarda publicaciones para después' : 'Nada por aquí'}</h2>
            <p className={`mx-auto mt-2 max-w-xs text-[15px] ${muted}`}>{view === 'saved' ? 'Toca el marcador de una publicación y aparecerá aquí.' : 'Prueba otra búsqueda o comparte tu próxima lectura.'}</p>
          </div>
        )}
      </main>

      {/* ───────── Columna derecha ───────── */}
      <aside className="hidden w-[350px] shrink-0 pl-8 xl:block">
        <div className="sticky top-16 space-y-4 pt-2">
          <DesktopSearch query={query} suggestions={suggestions} onChange={setQuery} onPick={search} />

          <section className={`overflow-hidden rounded-2xl ${panel}`}>
            <h2 className="px-4 pb-1 pt-3 text-xl font-extrabold">Qué está pasando</h2>
            {trends.map((trend) => (
              <button key={trend.label} type="button" onClick={() => search(query === trend.label ? '' : trend.label)} className={`block w-full px-4 py-3 text-left transition-colors ${rowHover}`}>
                <small className={`block text-[13px] ${muted}`}>{trend.category}</small>
                <strong className="block truncate text-[15px] font-bold">{trend.label}</strong>
                <small className={`block text-[13px] ${muted}`}>{trend.hint}</small>
              </button>
            ))}
          </section>

          <section className={`overflow-hidden rounded-2xl ${panel}`}>
            <h2 className="px-4 pb-1 pt-3 text-xl font-extrabold">A quién seguir</h2>
            {suggestedReaders.map((reader) => <FollowRow key={reader.userId} reader={reader} following={follows.includes(reader.userId)} onToggle={toggleFollow} />)}
          </section>

          <section className={`rounded-2xl border p-4 ${divider}`}>
            <h2 className="text-xl font-extrabold">Mukai Store</h2>
            <p className={`mt-1 text-[15px] ${muted}`}>Tus historias, fuera de la pantalla. Explora la nueva colección.</p>
            <Link to="/tienda" className={`mt-3 inline-flex h-9 items-center px-4 text-[15px] font-bold ${pill}`}>Ir a la tienda</Link>
          </section>

          <p className={`px-4 text-[13px] leading-relaxed ${muted}`}>Vista local con publicaciones de ejemplo · Respeta a otros lectores y avisa antes de compartir spoilers.</p>
        </div>
      </aside>

      {/* Botón flotante: abre el chat de mensajes a pantalla completa. */}
      <button
        type="button"
        onClick={() => navigate('/mensajes')}
        className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+16px)] right-4 z-[90] flex h-12 items-center gap-2 rounded-[3px] px-5 font-[Montserrat] text-[14px] font-bold text-white transition-transform hover:scale-[1.03] active:scale-95 lg:bottom-8 lg:right-8"
        style={{ backgroundColor: ROSE }}
      >
        <MessageCircle size={20} strokeWidth={2.4} />
        Mensajes
      </button>
    </div>
  );
}

/** Buscador de la columna derecha: al enfocarlo muestra los temas más relevantes, que filtran el feed al elegirlos. */
function DesktopSearch({ query, suggestions, onChange, onPick }: { query: string; suggestions: string[]; onChange: (value: string) => void; onPick: (value: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <label className={`flex h-11 items-center gap-3 rounded-full bg-[#eff3f4] px-4 dark:bg-[#202327] ${muted}`}>
        <Search size={18} />
        <input aria-label="Buscar en la comunidad" value={query} onChange={(event) => onChange(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 150)} placeholder="Buscar" className="min-w-0 flex-1 bg-transparent text-[15px] text-black outline-none placeholder:opacity-60 dark:text-white" />
        {query && <button type="button" onClick={() => onChange('')} aria-label="Limpiar búsqueda"><X size={16} /></button>}
      </label>
      {focused && (
        <div className={`absolute inset-x-0 top-12 z-20 overflow-hidden rounded-2xl border bg-white shadow-xl dark:bg-black ${divider}`}>
          <p className={`px-4 pb-1 pt-3 text-[13px] font-semibold ${muted}`}>Temas relevantes</p>
          {suggestions.map((label) => (
            <button key={label} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onPick(label); setFocused(false); }} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] transition-colors ${rowHover}`}><Search size={16} className={muted} /><span className="truncate">{label}</span></button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Intercala un anuncio pequeño (solo móvil) cada AD_EVERY publicaciones. */
function FeedItem({ index, withAds, children }: { index: number; withAds: boolean; children: ReactNode }) {
  const ad = withAds && (index + 1) % AD_EVERY === 0 ? communityAds[(Math.floor(index / AD_EVERY)) % communityAds.length] : null;
  return (
    <>
      {children}
      {ad && (
        <div className={`border-b px-4 py-7 lg:hidden ${divider}`}>
          <Link to={ad.to} className={`flex items-center gap-5 rounded-2xl border p-6 transition-colors ${divider} ${panel} ${iconHover}`} aria-label={`Anuncio: ${ad.title}`}>
            <img src={ad.image} alt="" className="h-32 w-24 shrink-0 rounded-lg object-cover object-top" />
            <span className="min-w-0 flex-1">
              <small className={`block text-[10px] font-bold tracking-[0.14em] ${muted}`}>{ad.eyebrow} · ANUNCIO</small>
              <strong className="mt-1 block text-[16px] font-bold leading-tight">{ad.title}</strong>
              <span className={`mt-1.5 flex items-center gap-1 text-[13px] ${muted}`}>{ad.text} <ArrowUpRight size={14} /></span>
            </span>
          </Link>
        </div>
      )}
    </>
  );
}

function Composer({ user, textareaRef, onPost, onError }: {
  user: ExperienceUser;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onPost: (post: CommunityPost) => boolean;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [manga, setManga] = useState<CommunityMangaTag | null>(null);
  const [picking, setPicking] = useState(false);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canPost = (text.trim() || image || manga) && !reading;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canPost) return;
    const posted = onPost({ id: crypto.randomUUID(), userId: user.id, name: user.name, avatar: user.avatar, content: text.trim(), image, manga: manga || undefined, likes: 0, comments: [], createdAt: new Date().toISOString() });
    if (posted) {
      setText('');
      setImage('');
      setManga(null);
      setPicking(false);
      if (textareaRef.current) textareaRef.current.style.height = '';
    }
  };

  return (
    <form onSubmit={submit} className={`flex gap-3 border-b px-4 pb-3 pt-3 ${divider}`}>
      <Avatar src={user.avatar} />
      <div className="min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          aria-label="Nueva publicación"
          value={text}
          maxLength={MAX_LENGTH}
          rows={1}
          placeholder="Comparte tu experiencia…"
          onChange={(event) => { setText(event.target.value); event.target.style.height = 'auto'; event.target.style.height = `${event.target.scrollHeight}px`; }}
          className="block min-h-[72px] w-full resize-none bg-transparent py-3 text-[17px] leading-6 outline-none placeholder:text-[#536471] dark:placeholder:text-[#71767b]"
        />
        {image && (
          <div className="relative mb-2 w-fit">
            <img src={image} alt="Imagen seleccionada" className={`max-h-[300px] rounded-2xl border ${divider}`} />
            <button type="button" onClick={() => setImage('')} aria-label="Quitar imagen" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85"><X size={16} /></button>
          </div>
        )}
        {manga && (
          <div className={`mb-2 flex items-center gap-3 rounded-xl border p-2 ${divider}`}>
            {manga.showCover && manga.cover ? (
              <span className="relative shrink-0">
                <img src={manga.cover} alt="" className="h-16 w-12 rounded-md object-cover" />
                <button type="button" onClick={() => setManga({ ...manga, showCover: false })} aria-label="Quitar portada (dejar solo el texto)" title="Quitar portada" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"><X size={11} strokeWidth={3} /></button>
              </span>
            ) : <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${panel}`}><BookOpen size={18} /></span>}
            <span className="min-w-0 flex-1">
              <small className={`block text-[11px] font-semibold ${muted}`}>Recomendación</small>
              <strong className="block truncate text-[14px] font-bold">{manga.title}</strong>
              {manga.chapterLabel && <span className={`block truncate text-[12px] ${muted}`}>{manga.chapterLabel}</span>}
              {!manga.showCover && manga.cover && <button type="button" onClick={() => setManga({ ...manga, showCover: true })} className="mt-0.5 text-[12px] font-semibold hover:underline" style={{ color: ROSE }}>Mostrar portada</button>}
            </span>
            <button type="button" onClick={() => setManga(null)} aria-label="Quitar recomendación" className={`shrink-0 rounded-full p-1.5 ${iconHover}`}><X size={16} /></button>
          </div>
        )}
        {picking && <MangaPicker onPick={(tag) => { setManga(tag); setPicking(false); }} onClose={() => setPicking(false)} />}
        <div className={`flex items-center justify-between border-t pt-2 ${divider}`}>
          <div className="-ml-2 flex items-center">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={reading} aria-label="Añadir imagen" title="Añadir imagen" className={`rounded-full p-2 text-black transition-colors disabled:opacity-50 dark:text-white ${iconHover}`}><ImagePlus size={20} /></button>
            <button type="button" onClick={() => setPicking((value) => !value)} aria-expanded={picking} aria-label="Etiquetar manga o capítulo" title="Etiquetar manga o capítulo" className={`rounded-full p-2 text-black transition-colors dark:text-white ${iconHover}`}><BookMarked size={20} /></button>
          </div>
          <div className="flex items-center gap-3">
            {text.length > 0 && <span className={`text-[13px] ${text.length >= MAX_LENGTH ? 'text-[#ff4a7d]' : muted}`}>{text.length}/{MAX_LENGTH}</span>}
            <button type="submit" disabled={!canPost} className={`h-9 rounded-[4px] px-4 text-[15px] font-semibold transition-colors disabled:opacity-50 ${pill}`}>{reading ? 'Cargando…' : 'Publicar'}</button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={async (event) => {
            const selected = event.target.files?.[0];
            if (!selected) return;
            setReading(true);
            try { setImage(await readLocalImage(selected)); onError(''); }
            catch (caught) { onError((caught as Error).message); }
            finally { setReading(false); event.target.value = ''; }
          }}
        />
      </div>
    </form>
  );
}

/** Buscador de mangas del catálogo; tras elegir uno se puede afinar a un capítulo concreto. */
function MangaPicker({ onPick, onClose }: { onPick: (tag: CommunityMangaTag) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MangaCapitulo[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<MangaCapitulo | null>(null);
  const [chapters, setChapters] = useState<SeriesChapter[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearching(false); return; }
    let active = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchMangas(query).then((found) => { if (active) setResults(found); }).catch(() => { if (active) setResults([]); }).finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (!picked) return;
    let active = true;
    setChapters(null);
    getChaptersBySeries(picked.eroSeri || picked.id).then((list) => { if (active) setChapters(list); }).catch(() => { if (active) setChapters([]); });
    return () => { active = false; };
  }, [picked]);

  const tagFor = (manga: MangaCapitulo, chapter?: SeriesChapter): CommunityMangaTag => ({
    id: String(manga.id),
    title: manga.titulo,
    cover: manga.portada,
    showCover: true,
    ...(chapter ? { chapterId: chapter.id, chapterLabel: `Capítulo ${chapter.chapter_number}${chapter.title ? ` · ${chapter.title}` : ''}` } : {}),
  });

  return (
    <div className={`mb-2 overflow-hidden rounded-xl border ${divider}`}>
      {!picked ? (
        <>
          <label className={`flex items-center gap-2 border-b px-3 py-2 ${divider}`}>
            <Search size={16} className={muted} />
            <input ref={inputRef} aria-label="Buscar manga para recomendar" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca un manga para recomendar" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:opacity-60" />
            {searching ? <Loader2 size={16} className={`animate-spin ${muted}`} /> : <button type="button" onClick={onClose} aria-label="Cerrar" className={muted}><X size={16} /></button>}
          </label>
          <div className="max-h-56 overflow-y-auto">
            {results.map((manga) => (
              <button key={manga.id} type="button" onClick={() => setPicked(manga)} className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${rowHover}`}>
                <img src={manga.portada} alt="" className="h-12 w-9 shrink-0 rounded object-cover" loading="lazy" />
                <span className="min-w-0 flex-1"><strong className="block truncate text-[14px] font-semibold">{manga.titulo}</strong><small className={`block text-[12px] ${muted}`}>{manga.tipo}</small></span>
              </button>
            ))}
            {!searching && query.trim() && !results.length && <p className={`px-3 py-4 text-center text-[13px] ${muted}`}>No encontramos ese manga.</p>}
            {!query.trim() && <p className={`px-3 py-4 text-center text-[13px] ${muted}`}>Escribe el título del manga que quieres recomendar.</p>}
          </div>
        </>
      ) : (
        <>
          <div className={`flex items-center gap-3 border-b px-3 py-2 ${divider}`}>
            <button type="button" onClick={() => setPicked(null)} aria-label="Elegir otro manga" className={`rounded-full p-1 ${iconHover}`}><ArrowLeft size={16} /></button>
            <img src={picked.portada} alt="" className="h-10 w-8 shrink-0 rounded object-cover" />
            <strong className="min-w-0 flex-1 truncate text-[14px] font-semibold">{picked.titulo}</strong>
            <button type="button" onClick={() => onPick(tagFor(picked))} className={`h-8 shrink-0 rounded-[4px] px-3 text-[13px] font-semibold ${pill}`}>Solo el manga</button>
          </div>
          <p className={`px-3 pb-1 pt-2 text-[12px] font-semibold ${muted}`}>O elige un capítulo</p>
          <div className="max-h-48 overflow-y-auto pb-1">
            {chapters === null && <p className={`flex items-center justify-center gap-2 py-4 text-[13px] ${muted}`}><Loader2 size={15} className="animate-spin" /> Cargando capítulos…</p>}
            {chapters?.map((chapter) => (
              <button key={chapter.id} type="button" onClick={() => onPick(tagFor(picked, chapter))} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition-colors ${rowHover}`}>
                <span className="font-semibold">Capítulo {chapter.chapter_number}</span>
                {chapter.title && <span className={`truncate text-[13px] ${muted}`}>{chapter.title}</span>}
              </button>
            ))}
            {chapters && !chapters.length && <p className={`px-3 py-4 text-center text-[13px] ${muted}`}>Este manga aún no tiene capítulos.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function FollowRow({ reader, following, onToggle }: { reader: { userId: string; name: string; avatar: string }; following: boolean; onToggle: (id: string) => void }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${rowHover}`}>
      <Avatar src={reader.avatar} />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[15px] font-bold">{reader.name}</strong>
        <span className={`block truncate text-[15px] ${muted}`}>{handleOf(reader.name)}</span>
      </span>
      <button type="button" onClick={() => onToggle(reader.userId)} aria-pressed={following} className={`h-8 px-4 text-[14px] font-bold transition-colors ${following ? `rounded-full border ${divider} hover:border-[#ff4a7d] hover:text-[#ff4a7d]` : pill}`}>{following ? 'Siguiendo' : 'Seguir'}</button>
    </div>
  );
}

/** Texto de la publicación con los hashtags como enlaces de búsqueda. */
const PostText = ({ content, onTag }: { content: string; onTag: (tag: string) => void }) => (
  <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-5">
    {content.split(/(#[\p{L}\p{N}_]+)/u).map((part, index) => part.startsWith('#')
      ? <button key={index} type="button" onClick={() => onTag(part)} className="font-medium text-black hover:underline dark:text-white">{part}</button>
      : part)}
  </p>
);

function PostCard({ post, user, onUpdate, onAuthor, onTag }: {
  post: CommunityPost;
  user: ExperienceUser;
  onUpdate: (post: CommunityPost) => boolean;
  onAuthor: (post: CommunityPost) => void;
  onTag: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  // Cada comentario propio vuelve a dibujar el contorno del bocadillo; después se queda pintado.
  const [trace, setTrace] = useState(0);
  // Like y guardar solo se animan al activarse (no al quitarlos).
  const [likeTrace, setLikeTrace] = useState(0);
  const [saveTrace, setSaveTrace] = useState(0);
  const own = post.userId === user.id;
  const name = own ? user.name : post.name;
  const avatar = own ? user.avatar : post.avatar;
  const commented = post.comments.some((comment) => comment.name === user.name);
  const actionClass = (active: boolean) => `group flex items-center gap-1 rounded-full p-2 text-[14px] font-medium transition-colors ${active ? '' : strong}`;

  const comment = (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim()) return;
    if (onUpdate({ ...post, comments: [...post.comments, { name: user.name, text: reply.trim(), likes: 0 }] })) {
      setReply('');
      setTrace((value) => value + 1);
    }
  };
  const likeComment = (index: number) => onUpdate({
    ...post,
    comments: post.comments.map((entry, position) => position === index ? { ...entry, liked: !entry.liked, likes: (entry.likes || 0) + (entry.liked ? -1 : 1) } : entry),
  });

  return (
    <article className={`flex gap-3 border-b px-4 py-3 transition-colors ${divider} ${rowHover}`}>
      <button type="button" onClick={() => onAuthor(post)} aria-label={`Perfil de ${name}`} className="h-10 shrink-0"><Avatar src={avatar} /></button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px]">
          <button type="button" onClick={() => onAuthor(post)} className="truncate font-bold hover:underline">{name}</button>
          <span className={`truncate ${muted}`}>{handleOf(name)}</span>
          {post.createdAt && <><span className={muted}>·</span><time dateTime={post.createdAt} className={`shrink-0 ${muted}`}>{timeAgo(post.createdAt)}</time></>}
        </div>
        {post.content && <PostText content={post.content} onTag={onTag} />}
        {post.image && <img src={post.image} alt="Imagen de la publicación" loading="lazy" className={`mt-3 max-h-[500px] w-full rounded-2xl border object-cover ${divider}`} />}
        {post.manga && (
          <Link to={post.manga.chapterId ? `/read/${post.manga.chapterId}` : `/manga/${post.manga.id}`} className={`mt-3 flex items-center gap-3 rounded-xl border p-2 transition-colors ${divider} ${iconHover}`}>
            {post.manga.showCover && post.manga.cover
              ? <img src={post.manga.cover} alt="" className="h-20 w-14 shrink-0 rounded-md object-cover" loading="lazy" />
              : <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${panel}`}><BookOpen size={18} /></span>}
            <span className="min-w-0 flex-1">
              <small className={`block text-[11px] font-semibold ${muted}`}>Recomienda</small>
              <strong className="block truncate text-[14px] font-bold">{post.manga.title}</strong>
              {post.manga.chapterLabel && <span className={`block truncate text-[12px] ${muted}`}>{post.manga.chapterLabel}</span>}
            </span>
            <ArrowUpRight size={16} className={`shrink-0 ${muted}`} />
          </Link>
        )}

        <div className="-ml-2 mt-2 flex items-center gap-3">
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Comentar" className={`${actionClass(commented)} hover:text-[#ff4a7d]`} style={commented ? { color: ROSE } : undefined}>
            <span key={trace} className="p-1"><CommentGlyph size={23} trace={trace > 0} /></span>{post.comments.length > 0 && formatCount(post.comments.length)}
          </button>
          <button type="button" onClick={() => { if (onUpdate({ ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }) && !post.liked) setLikeTrace((value) => value + 1); }} aria-pressed={!!post.liked} aria-label="Me gusta" className={`${actionClass(!!post.liked)} hover:text-[#ff4a7d] ${post.liked ? 'text-[#ff4a7d]' : ''}`}>
            <span key={likeTrace} className="p-1"><HeartGlyph size={23} active={!!post.liked} trace={!!post.liked && likeTrace > 0} /></span>{post.likes > 0 && formatCount(post.likes)}
          </button>
          <button type="button" onClick={() => { if (onUpdate({ ...post, saved: !post.saved }) && !post.saved) setSaveTrace((value) => value + 1); }} aria-pressed={!!post.saved} aria-label="Guardar" className={`${actionClass(!!post.saved)} hover:text-[#ff4a7d] ${post.saved ? 'text-[#ff4a7d]' : ''}`}>
            <span key={saveTrace} className="p-1"><BookmarkGlyph size={23} active={!!post.saved} trace={!!post.saved && saveTrace > 0} /></span>
          </button>
        </div>

        {open && (
          <div className={`mt-2 border-t pt-2 font-[Montserrat] font-normal ${divider}`}>
            {post.comments.map((entry, index) => (
              <div key={index} className="flex gap-2 py-2">
                <Avatar src={entry.name === user.name ? user.avatar : undefined} className="h-7 w-7" icon={14} />
                <div className="min-w-0 flex-1 text-[14px] leading-5">
                  <p><strong className="font-semibold">{entry.name}</strong> <span className={muted}>{handleOf(entry.name)}</span></p>
                  <p className="break-words">{entry.text}</p>
                </div>
                <button type="button" onClick={() => likeComment(index)} aria-pressed={!!entry.liked} aria-label="Me gusta el comentario" className={`flex shrink-0 items-center gap-1 self-start rounded-full px-1.5 py-1 text-[12px] transition-colors hover:text-[#ff4a7d] ${entry.liked ? 'text-[#ff4a7d]' : strong}`}>
                  <Heart size={16} fill={entry.liked ? 'currentColor' : 'none'} />{(entry.likes || 0) > 0 && formatCount(entry.likes || 0)}
                </button>
              </div>
            ))}
            <form onSubmit={comment} className="mt-1 flex items-center gap-2">
              <Avatar src={user.avatar} className="h-8 w-8" icon={15} />
              <input aria-label="Tu respuesta" value={reply} maxLength={500} onChange={(event) => setReply(event.target.value)} placeholder="Escribe tu respuesta" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:opacity-60" />
              <button type="submit" disabled={!reply.trim()} className={`h-8 rounded-[4px] px-4 text-[13px] font-semibold disabled:opacity-50 ${pill}`}>Responder</button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
