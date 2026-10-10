import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookMarked, BookOpen, Bookmark, Heart, ImagePlus, Loader2, MessageCircle, Search, ShieldCheck, User, Users, X } from 'lucide-react';
import { readLocalImage, useExperienceUser, useLocalExperience } from '../hooks/useLocalExperience';
import { getChaptersBySeries, searchMangas, type SeriesChapter } from '../services/mangaService';
import type { MangaCapitulo } from '../types/manga';
import { communityAds, communitySeeds, computeTrends, formatCount, handleOf, suggestedReaders, timeAgo, type CommunityMangaTag, type CommunityPost } from '../data/communityPosts';
import '../styles/community.css';

type Tab = 'recent' | 'trending' | 'saved';
type ExperienceUser = ReturnType<typeof useExperienceUser>;

/** Único acento de la sección: el rosa de la marca con un mínimo de rojo (nada de rojo puro). */
const ROSE = '#ff4a7d';
const MAX_LENGTH = 1000;

const divider = 'border-black/10 dark:border-white/10';
const muted = 'text-[#69636e] dark:text-[#b2aab9]';
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

/** Comunidad: publicaciones y una columna de descubrimiento, compartidas por PC y móvil. */
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
  const [tab, setTab] = useState<Tab>('recent');
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

  const trends = useMemo(() => computeTrends(posts, 4), [posts]);
  const needle = query.trim().toLocaleLowerCase('es');
  const visible = posts.filter((post) =>
    (!author || post.userId === author)
    && (tab !== 'saved' || post.saved)
    && (!needle || `${post.content} ${post.name} ${post.manga?.title || ''}`.toLocaleLowerCase('es').includes(needle)));
  const feed = [...visible].sort((a, b) => tab === 'trending'
    ? (b.likes + b.comments.length * 2) - (a.likes + a.comments.length * 2)
    : (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));

  const goHome = () => {
    setTab('recent');
    setQuery('');
    setParams({});
  };
  const search = (value: string) => {
    setQuery(value);
    setTab('recent');
    setParams({});
  };
  const showAuthor = (post: CommunityPost) => {
    if (post.userId === user.id && user.signedIn) navigate('/perfil');
    else {
      setTab('recent');
      setQuery('');
      setParams({ autor: post.userId });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const authorName = author ? (posts.find((post) => post.userId === author)?.name || 'este lector') : '';
  const filtered = !!needle || !!author;
  const savedCount = posts.filter((post) => post.saved).length;
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'recent', label: 'Recientes' },
    { id: 'trending', label: 'Populares' },
    { id: 'saved', label: 'Guardados' },
  ];

  return (
    <main className="community-page">
      <div className="community-shell">
        <header className="community-masthead">
          <div className="min-w-0">
            <span className="community-kicker">Manga, manhwa y manhua</span>
            <h1 className="community-title">Comunidad<span aria-hidden="true">!</span></h1>
            <p className="community-intro">Recomienda lecturas, comenta capítulos y comparte tus teorías.</p>
          </div>
          <Link to="/mensajes" className="community-button community-messages">
            <MessageCircle size={19} aria-hidden="true" />
            Mensajes
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <span className="community-masthead-dots" aria-hidden="true" />
        </header>

        <div className="community-layout">
          <div className="community-main">
            {/* Una sola entrada para publicar; permanece montada al filtrar para conservar el borrador. */}
            <div hidden={tab === 'saved' || !!author || !!needle}>
              <Composer user={user} textareaRef={composerRef} onPost={(post) => {
                if (!write([post, ...posts])) return false;
                goHome();
                return true;
              }} onError={setError} />
            </div>

            <section className="community-board" aria-label="Publicaciones de la comunidad">
              <div className="community-feed-tools">
                <div className="community-tabs" role="group" aria-label="Filtrar publicaciones">
                  {tabs.map(({ id, label }) => (
                    <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setParams({}); }} className={tab === id ? 'is-active' : ''}>
                      {id === 'saved' && <Bookmark size={14} aria-hidden="true" />}
                      {label}
                      {id === 'saved' && savedCount > 0 && <span className="community-tab-count">{savedCount}</span>}
                    </button>
                  ))}
                </div>
                <div className="community-search" role="search" aria-label="Búsqueda de publicaciones">
                  <Search size={17} aria-hidden="true" />
                  <input type="search" aria-label="Buscar en la comunidad" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar publicaciones…" />
                  {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={17} /></button>}
                </div>
              </div>

              {!author && tab !== 'saved' && (
                <div className="community-topics" role="group" aria-label="Temas de conversación">
                  <span>Temas populares</span>
                  {trends.map((trend) => (
                    <button key={trend.label} type="button" aria-pressed={query === trend.label} onClick={() => search(query === trend.label ? '' : trend.label)} title={trend.hint}>
                      {trend.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="community-feed-caption">
                <h2>{author ? `Publicaciones de ${authorName}` : needle ? (tab === 'saved' ? 'Resultados en guardados' : 'Resultados de búsqueda') : tab === 'saved' ? 'Publicaciones guardadas' : tab === 'trending' ? 'Publicaciones populares' : 'Publicaciones recientes'}</h2>
                <span aria-live="polite">{feed.length} {feed.length === 1 ? 'publicación' : 'publicaciones'}</span>
              </div>
              {filtered && (
                <div className="community-filter-summary">
                  <span>{needle ? `Buscando «${query.trim()}»` : `Solo ${authorName}`}</span>
                  <button type="button" onClick={goHome}><ArrowLeft size={14} /> Ver todas</button>
                </div>
              )}
              {error && <p role="alert" className="community-error">{error}</p>}

              <div className="community-feed">
                {feed.map((post) => <PostCard key={post.id} post={post} user={user} onUpdate={update} onAuthor={showAuthor} onTag={search} />)}
                {!feed.length && (
                  <div className="community-card community-empty">
                    {tab === 'saved' ? <Bookmark size={30} aria-hidden="true" /> : <Search size={30} aria-hidden="true" />}
                    <h3>{needle ? 'No encontramos publicaciones' : tab === 'saved' ? 'Aún no tienes guardados' : 'Todavía no hay publicaciones'}</h3>
                    <p>{needle ? 'Prueba con otro título, tema o nombre de lector.' : tab === 'saved' ? 'Guarda una publicación con el marcador y vuelve a ella cuando quieras.' : 'Comparte una recomendación o descubre lo que están leyendo los demás.'}</p>
                    <button type="button" onClick={goHome} className="community-button">Explorar publicaciones <ArrowUpRight size={16} /></button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Los mismos paneles pasan debajo del listado en pantallas pequeñas. */}
          <aside className="community-sidebar" aria-label="Anuncios y lectores">
            <section className="community-promotions" aria-labelledby="community-ads-title">
              <div className="community-section-label"><h2 id="community-ads-title">Anuncios</h2><span>MangaMukai</span></div>
              {communityAds.map((ad) => <CommunityAd key={ad.id} ad={ad} />)}
            </section>

            <section className="community-card community-readers" aria-labelledby="community-readers-title">
              <div className="community-readers-heading"><Users size={19} aria-hidden="true" /><h2 id="community-readers-title">Lectores sugeridos</h2></div>
              {suggestedReaders.filter((reader) => reader.userId !== user.id).map((reader) => <FollowRow key={reader.userId} reader={reader} following={follows.includes(reader.userId)} onToggle={toggleFollow} onSelect={() => { setTab('recent'); setQuery(''); }} />)}
            </section>

            <div className="community-guidelines">
              <ShieldCheck size={18} aria-hidden="true" />
              <div><p>Comparte con respeto. Avisa si hay spoilers.</p><Link to="/normas-comunidad">Normas de la comunidad <ArrowUpRight size={12} /></Link></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function CommunityAd({ ad }: { ad: typeof communityAds[number] }) {
  return (
    <Link to={ad.to} className={`community-ad community-ad--${ad.id}`} aria-label={`Anuncio de ${ad.eyebrow}: ${ad.title}`}>
      <img src={ad.image} alt="" loading="lazy" className="community-ad-art" />
      <span className="community-ad-copy">
        <small>{ad.eyebrow}</small>
        <strong>{ad.title}</strong>
        <span className="community-ad-description">{ad.text}</span>
        <span className="community-ad-cta">{ad.cta} <ArrowUpRight size={16} aria-hidden="true" /></span>
      </span>
    </Link>
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
    <form onSubmit={submit} className="community-card community-composer">
      <Avatar src={user.avatar} />
      <div className="min-w-0 flex-1">
        <label htmlFor="community-draft" className="community-composer-label">Crea una publicación</label>
        <textarea
          id="community-draft"
          ref={textareaRef}
          aria-label="Nueva publicación"
          value={text}
          maxLength={MAX_LENGTH}
          rows={1}
          placeholder="Recomienda un manga, comparte una teoría o inicia un debate…"
          onChange={(event) => { setText(event.target.value); event.target.style.height = 'auto'; event.target.style.height = `${event.target.scrollHeight}px`; }}
          className="block min-h-[64px] w-full resize-none bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-[#697078] dark:placeholder:text-[#9b9ba3]"
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
            <button type="submit" disabled={!canPost} className="community-button community-button--accent">{reading ? 'Cargando…' : 'Publicar'}</button>
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

function FollowRow({ reader, following, onToggle, onSelect }: { reader: { userId: string; name: string; avatar: string }; following: boolean; onToggle: (id: string) => void; onSelect: () => void }) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 transition-colors ${rowHover}`}>
      <Link to={`/comunidad?autor=${reader.userId}`} onClick={onSelect} aria-label={`Publicaciones de ${reader.name}`}><Avatar src={reader.avatar} className="h-9 w-9" /></Link>
      <span className="min-w-0 flex-1">
        <Link to={`/comunidad?autor=${reader.userId}`} onClick={onSelect} className="block truncate text-[13px] font-bold hover:underline">{reader.name}</Link>
        <span className={`block truncate text-[11px] ${muted}`}>{handleOf(reader.name)}</span>
      </span>
      <button type="button" onClick={() => onToggle(reader.userId)} aria-pressed={following} aria-label={`${following ? 'Dejar de seguir a' : 'Seguir a'} ${reader.name}`} className="community-follow">{following ? 'Siguiendo' : 'Seguir'}</button>
    </div>
  );
}

/** Texto de la publicación con los hashtags como enlaces de búsqueda. */
const PostText = ({ content, onTag }: { content: string; onTag: (tag: string) => void }) => (
  <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-[1.75] sm:text-[15px]">
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
    <article className="community-card community-post">
      <button type="button" onClick={() => onAuthor(post)} aria-label={`Perfil de ${name}`} className="h-10 shrink-0"><Avatar src={avatar} /></button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] sm:text-[14px]">
          <button type="button" onClick={() => onAuthor(post)} className="truncate font-bold hover:underline">{name}</button>
          <span className={`max-w-[130px] truncate ${muted}`}>{handleOf(name)}</span>
          {post.createdAt && <><span className={muted}>·</span><time dateTime={post.createdAt} className={`shrink-0 ${muted}`}>{timeAgo(post.createdAt)}</time></>}
          {post.demo && <span className="community-example">Ejemplo</span>}
        </div>
        {post.content && <PostText content={post.content} onTag={onTag} />}
        {post.image && <img src={post.image} alt="Imagen de la publicación" loading="lazy" className="community-post-image" />}
        {post.manga && (
          <Link to={post.manga.chapterId ? `/read/${post.manga.chapterId}` : `/manga/${post.manga.id}`} className={`mt-3 flex items-center gap-3 rounded-xl border p-2 transition-colors ${divider} ${iconHover}`}>
            {post.manga.showCover && post.manga.cover
              ? <img src={post.manga.cover} alt="" className="h-20 w-14 shrink-0 rounded-md object-cover" loading="lazy" />
              : <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${panel}`}><BookOpen size={18} /></span>}
            <span className="min-w-0 flex-1">
              <small className={`block text-[11px] font-semibold ${muted}`}>Manga recomendado</small>
              <strong className="block truncate text-[14px] font-bold">{post.manga.title}</strong>
              {post.manga.chapterLabel && <span className={`block truncate text-[12px] ${muted}`}>{post.manga.chapterLabel}</span>}
            </span>
            <ArrowUpRight size={16} className={`shrink-0 ${muted}`} />
          </Link>
        )}

        <div className={`-ml-2 mt-3 flex items-center gap-3 border-t pt-1 ${divider}`}>
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
