import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Eye, Heart, RotateCcw } from 'lucide-react';
import { ProfilePostCard } from './ProfilePostCard';
import { PostGlyph, ReaderBookGlyph, SavedGlyph } from '../common/BrandIcons';
import { getProfilePosts, type ProfilePost } from '../../services/profilePostService';
import { getSocialLibrary, type LibraryChapter, type SocialLibrary } from '../../services/socialService';
import { getInteractions } from '../../services/interactionsService';
import { getChapterPreviewImage, getChapterViews, getUltimosCapitulos } from '../../services/mangaService';
import { useSavedMangasState } from '../../services/savedMangas';
import { displayChapterViews, displayViews } from '../../utils/seriesViews';
import { toTitleCase } from '../../utils/titleCase';
import { getStoredToken, type MMUser } from '../../services/authService';
import type { MangaCapitulo } from '../../types/manga';

type Tab = 'posts' | 'saved' | 'likes' | 'activity';
type LikesFilter = 'mangas' | 'chapters';

/* Cuadrícula de portadas: 3 columnas; se cargan 6 filas y el resto bajo demanda. */
const GRID_COLUMNS = 3;
const GRID_INITIAL_ROWS = 6;
const GRID_PAGE = GRID_COLUMNS * GRID_INITIAL_ROWS;

const TABS: Array<{ id: Tab; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }> = [
  { id: 'posts', label: 'Post', icon: PostGlyph },
  { id: 'saved', label: 'Guardado', icon: SavedGlyph },
  { id: 'likes', label: 'Me gusta', icon: Heart },
  { id: 'activity', label: 'Actividad', icon: RotateCcw },
];

interface CoverItem {
  id: number | string;
  title: string;
  cover: string;
  views: number;
}

const emptyLibrary = (): SocialLibrary => ({ reading: [], liked_chapters: [], liked_mangas: [] });

const formatViews = (views: number) => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(views >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(views >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return String(views);
};

const formatNumber = (number: number) => (Number.isInteger(number) ? String(number) : number.toFixed(1));
const formatChapterNumber = (number: number) => (number > 0 ? `Cap. ${formatNumber(number)}` : 'Capítulo');
const formatChapterLabel = (number: number) => (number > 0 ? `Capítulo ${formatNumber(number)}` : 'el capítulo');

const ViewsTag = ({ views, isLight, tone = 'dark', className = '' }: { views: number; isLight: boolean; tone?: 'dark' | 'red'; className?: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-[Montserrat] text-[9px] font-bold leading-none text-white ${tone === 'red' ? 'bg-[#e11d2e]' : isLight ? 'bg-black/80' : 'border border-white/10 bg-[#1c1c21]'} ${className}`}>
    <Eye size={10} strokeWidth={2.5} aria-hidden="true" />
    <span className="tabular-nums">{formatViews(views)}</span>
    <span className="sr-only">vistas</span>
  </span>
);

/** Escena del capítulo (la misma que la lista de capítulos de la ficha); si no hay, miniatura o portada de la serie. */
const useChapterScene = (item: LibraryChapter) => {
  const [scene, setScene] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getChapterPreviewImage(item.chapter_id, item.chapter_number, getStoredToken())
      .then((url) => { if (active && url) setScene(url); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [item.chapter_id, item.chapter_number]);
  return scene || item.image || item.cover;
};

/** Me gusta > Capítulos: escena del capítulo pegada al lateral izquierdo, de arriba abajo, con las esquinas del contenedor. */
const LikedChapterRow = ({ item, views, isLight }: { item: LibraryChapter; views: number; isLight: boolean }) => {
  const scene = useChapterScene(item);
  return (
    <Link to={`/read/${item.chapter_id}`} className={`relative flex items-start gap-3 overflow-hidden rounded-xl border pl-[72px] pr-2 transition-colors ${isLight ? 'border-black/[0.1] hover:bg-black/[0.03]' : 'border-white/[0.12] hover:bg-white/[0.05]'}`}>
      {/* Pegada al lateral izquierdo de arriba abajo, recortada al alto de la fila (no lo estira);
          solo las esquinas izquierdas curvadas, como el contenedor. */}
      <img src={scene} alt="" className="absolute inset-y-0 left-0 h-full w-[60px] rounded-l-xl object-cover object-center bg-zinc-900" loading="lazy" decoding="async" />
      <div className="min-w-0 flex-1 py-2.5 pr-1">
        <p className="font-[Montserrat] text-[13px] font-normal">{formatChapterNumber(item.chapter_number)}</p>
        <p className="line-clamp-2 font-[Montserrat] text-[13px] font-semibold leading-snug">{item.title}</p>
      </div>
      <ViewsTag views={views} isLight={isLight} tone="red" className="mt-2 shrink-0 self-start" />
    </Link>
  );
};

/**
 * Tarjeta de Actividad: la escena del capítulo de fondo, velo oscuro/claro
 * según el tema, libro rojo, "Continuar leyendo", título en Luckiest Guy y el
 * número del capítulo grande a la derecha.
 */
const ActivityCard = ({ item, isLight }: { item: LibraryChapter; isLight: boolean }) => {
  const background = useChapterScene(item);
  return (
    <Link to={`/read/${item.chapter_id}`} className="relative block h-20 overflow-hidden rounded-[5px] bg-zinc-900">
      {background && <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover object-center" loading="lazy" decoding="async" />}
      {/* Velo más ligero para que la escena se vea. */}
      <div className={`absolute inset-0 ${isLight ? 'bg-white/65' : 'bg-black/60'}`} aria-hidden="true" />
      {/* Número del capítulo, grande, estrecho y recortado por abajo. */}
      <span aria-hidden="true" className={`pointer-events-none absolute -bottom-4 right-6 font-[Montserrat] text-[74px] font-black italic leading-none tracking-[0.02em] ${isLight ? 'text-black/15' : 'text-white/50'}`}>{formatNumber(item.chapter_number)}</span>
      <ArrowUpRight size={16} strokeWidth={2.6} className={`absolute right-2 top-2 ${isLight ? 'text-black' : 'text-white'}`} aria-hidden="true" />
      <div className="absolute inset-y-0 left-3 flex items-center gap-2.5 pr-28">
        <ReaderBookGlyph size={22} className="shrink-0 text-[#ff0000]" />
        <div className="min-w-0">
          <p className={`font-[Montserrat] text-[11px] font-light leading-tight ${isLight ? 'text-black' : 'text-white'}`}>Continuar leyendo {formatChapterLabel(item.chapter_number)}</p>
          <p className={`activity-series-title mt-0.5 line-clamp-2 text-[12px] leading-[1.15] ${isLight ? 'text-black' : 'text-white'}`}>{toTitleCase(item.title)}</p>
        </div>
      </div>
    </Link>
  );
};

/**
 * Pestañas de la página "Más": Post · Guardado · Me gusta · Actividad. Solo la
 * activa muestra su nombre; el resto va con icono. Guardados y Me gusta →
 * Mangas son cuadrículas de portadas con el título dentro; Me gusta →
 * Capítulos y Actividad son filas con portada pequeña, número de capítulo y
 * serie.
 */
export const MoreLibraryTabs = ({ user, isLight }: { user: MMUser; isLight: boolean }) => {
  const [tab, setTab] = useState<Tab>('posts');
  const [likesFilter, setLikesFilter] = useState<LikesFilter>('mangas');
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [catalog, setCatalog] = useState<MangaCapitulo[]>([]);
  const [library, setLibrary] = useState<SocialLibrary>(emptyLibrary);
  const [loaded, setLoaded] = useState(false);
  const [chapterViews, setChapterViews] = useState<Record<string, number>>({});
  const [savedLimit, setSavedLimit] = useState(GRID_PAGE);
  const [likedLimit, setLikedLimit] = useState(GRID_PAGE);
  const saved = useSavedMangasState();

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      getProfilePosts(user.id),
      getUltimosCapitulos(),
      getSocialLibrary(),
      getInteractions(),
    ]).then(([postsResult, catalogResult, libraryResult, interactionsResult]) => {
      if (!active) return;
      if (postsResult.status === 'fulfilled') setPosts(postsResult.value);
      const items = catalogResult.status === 'fulfilled' ? catalogResult.value : [];
      setCatalog(items);
      const loadedLibrary = libraryResult.status === 'fulfilled' ? libraryResult.value : emptyLibrary();
      // Sin el endpoint nuevo (o si falla), los mangas con me gusta salen de /interactions.
      if (loadedLibrary.liked_mangas.length === 0 && interactionsResult.status === 'fulfilled' && interactionsResult.value) {
        const likedIds = new Set(interactionsResult.value.likes.map(String));
        loadedLibrary.liked_mangas = items
          .filter((manga) => likedIds.has(String(manga.id)))
          .map((manga) => ({ manga_id: Number(manga.id), title: manga.titulo, cover: manga.portada }));
      }
      // Solo en desarrollo: si el endpoint aún no devuelve nada, una fila de ejemplo
      // (con una serie real del catálogo) para poder pulir el diseño.
      if (import.meta.env.DEV && items.length > 1) {
        const sample = (manga: MangaCapitulo, chapter: number): LibraryChapter => ({
          manga_id: Number(manga.id),
          title: manga.titulo,
          cover: manga.portada,
          chapter_id: Number(manga.capitulosRecientes?.[0]?.id ?? 0),
          chapter_number: chapter,
          chapter_title: '',
          image: '',
        });
        if (loadedLibrary.liked_chapters.length === 0) loadedLibrary.liked_chapters = [{ ...sample(items[0], 12), reaction: 'like' }];
        if (loadedLibrary.reading.length === 0) loadedLibrary.reading = [{ ...sample(items[1], 7), chapters_read: 7, last_read_at: new Date().toISOString() }];
      }
      setLibrary(loadedLibrary);
      setLoaded(true);
      // Vistas de cada capítulo con me gusta (contador propio por capítulo).
      const chapterIds = loadedLibrary.liked_chapters.map((item) => item.chapter_id);
      if (chapterIds.length > 0) void getChapterViews(chapterIds).then((views) => { if (active) setChapterViews(views); });
    });
    return () => { active = false; };
  }, [user.id]);

  // Vistas por serie (misma cifra que en la Biblioteca) para las etiquetas de las portadas.
  const catalogById = useMemo(() => new Map(catalog.map((manga) => [String(manga.id), manga])), [catalog]);
  const viewsOf = (mangaId: number | string) => {
    const manga = catalogById.get(String(mangaId));
    return manga ? displayViews(manga) : displayViews({ id: mangaId, totalViews: 0 });
  };

  const savedMangas = useMemo<CoverItem[]>(() => {
    const ids = new Set(saved.ids);
    return catalog
      .filter((manga) => ids.has(String(manga.id)))
      .map((manga) => ({ id: manga.id, title: manga.titulo, cover: manga.portada, views: displayViews(manga) }));
  }, [catalog, saved.ids]);

  const likedMangas = useMemo<CoverItem[]>(
    () => library.liked_mangas.map((manga) => ({ id: manga.manga_id, title: manga.title, cover: manga.cover, views: viewsOf(manga.manga_id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [library.liked_mangas, catalogById],
  );

  const muted = isLight ? 'text-black/45' : 'text-white/45';

  const empty = (text: string) => (
    <p className={`py-10 text-center font-[Montserrat] text-[13px] font-medium ${muted}`}>{loaded ? text : 'Cargando…'}</p>
  );

  const loadMore = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`mx-auto mt-3 flex h-10 w-[55%] min-w-[160px] items-center justify-center rounded-full font-[Montserrat] text-[12px] font-semibold transition-colors ${isLight ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
    >
      {label}
    </button>
  );

  /* Cuadrícula sin esquinas redondeadas, poco margen, título dentro (2 líneas) y vistas arriba a la derecha. */
  const coverGrid = (items: CoverItem[], limit: number, onMore: () => void, emptyText: string, tagTone: 'dark' | 'red' = 'dark'): ReactNode => items.length === 0 ? empty(emptyText) : (
    <>
      <div className="grid grid-cols-3 gap-1 pt-3">
        {items.slice(0, limit).map((item) => (
          <Link key={item.id} to={`/manga/${item.id}`} className="group relative block aspect-[3/4] overflow-hidden bg-zinc-900">
            <img src={item.cover} alt="" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
            <ViewsTag views={item.views} isLight={isLight} tone={tagTone} className="absolute right-1 top-1" />
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5">
              <p className="cover-brush-title line-clamp-2 text-[12px] leading-[1.15] text-white [text-shadow:0_1px_6px_rgba(0,0,0,.8)]">{item.title}</p>
            </div>
          </Link>
        ))}
      </div>
      {items.length > limit && loadMore(`Ver más (${items.length - limit})`, onMore)}
    </>
  );

  /* Me gusta > Capítulos: filas tipo "+ Buscados" (solo borde) con la escena del capítulo
     pegada al lateral izquierdo (de arriba abajo), número de capítulo, serie y vistas del capítulo. */
  const chapterRows = (items: LibraryChapter[], emptyText: string): ReactNode => items.length === 0 ? empty(emptyText) : (
    <div className="space-y-2 pt-3">
      {items.map((item) => <LikedChapterRow key={item.chapter_id} item={item} isLight={isLight} views={displayChapterViews(item.chapter_id, chapterViews[String(item.chapter_id)] ?? 0)} />)}
    </div>
  );

  /* Actividad: tarjetas con la escena del capítulo de fondo. */
  const activityCards = (items: LibraryChapter[], emptyText: string): ReactNode => items.length === 0 ? empty(emptyText) : (
    <div className="space-y-2.5 pt-3">
      {items.map((item) => <ActivityCard key={item.chapter_id} item={item} isLight={isLight} />)}
    </div>
  );

  return (
    <section aria-label="Tu biblioteca" className="mt-5">
      {/* Cuatro pestañas centradas: solo la activa enseña su nombre. */}
      <div role="tablist" className={`flex items-end justify-center gap-7 border-b ${isLight ? 'border-black/[0.08]' : 'border-white/[0.1]'}`}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={label}
              title={label}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-1.5 px-1 pb-2.5 font-[Montserrat] text-[13px] font-semibold transition-colors ${active ? (isLight ? 'text-black' : 'text-white') : muted}`}
            >
              <Icon size={20} strokeWidth={2.4} />
              {active && <span>{label}</span>}
              {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-current" />}
            </button>
          );
        })}
      </div>

      {tab === 'posts' && (
        posts.length === 0 ? empty('Aún no has publicado nada') : (
          <div className="space-y-3 pt-3">
            {posts.map((post) => (
              <ProfilePostCard key={post.id} initialPost={post} isLight={isLight} onShared={(shared) => setPosts((current) => [shared, ...current.filter((item) => item.id !== shared.id)])} />
            ))}
          </div>
        )
      )}

      {tab === 'saved' && coverGrid(savedMangas, savedLimit, () => setSavedLimit((limit) => limit + GRID_PAGE), 'Aún no has guardado mangas', 'red')}

      {tab === 'likes' && (
        <>
          {/* Filtro: mangas con me gusta o capítulos con reacción. */}
          <div className="flex justify-start gap-2 pt-3">
            {([['mangas', 'Mangas'], ['chapters', 'Capítulos']] as Array<[LikesFilter, string]>).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={likesFilter === id}
                onClick={() => setLikesFilter(id)}
                className={`rounded-full px-3.5 py-1.5 font-[Montserrat] text-[12px] font-semibold transition-colors ${likesFilter === id ? (isLight ? 'bg-black text-white' : 'bg-white text-black') : (isLight ? 'bg-black/[0.06] text-black/60' : 'bg-white/10 text-white/60')}`}
              >
                {label}
              </button>
            ))}
          </div>
          {likesFilter === 'mangas'
            ? coverGrid(likedMangas, likedLimit, () => setLikedLimit((limit) => limit + GRID_PAGE), 'Aún no has dado me gusta a ningún manga', 'red')
            : chapterRows(library.liked_chapters, 'Aún no has reaccionado a ningún capítulo')}
        </>
      )}

      {tab === 'activity' && activityCards(library.reading, 'Aún no has empezado ninguna lectura')}
    </section>
  );
};
