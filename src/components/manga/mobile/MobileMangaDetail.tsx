import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpenText, ChevronDown, ChevronLeft, Loader2 } from 'lucide-react';

import { MangaCommunityLinks } from '../MangaCommunityLinks';
import { DetailViewsIcon } from '../referenceIcons';
import { Footer } from '../../layout/Footer';
import { ChapterList } from '../ChapterList';
import { MangaComments } from '../MangaComments';
import { MangaRecommendations } from '../MangaRecommendations';
import { MukaiMusicPromo } from '../MukaiMusicPromo';
import { MobileReactions } from './MobileReactions';
import type { MangaReactionId } from '../reactions';
import {
  ChaptersTabIcon,
  CommentsTabIcon,
  LikeBarShape,
  LikeHeartIcon,
  PaletteIcon,
  PlatformIcon,
  PublishedIcon,
  SaveBookmarkIcon,
  SearchIcon,
  SortDownIcon,
  SortUpIcon,
  StudioIcon,
  SynopsisTabIcon,
  TypeIcon,
} from '../designIcons';
import type { RelatedManga, SeriesChapter } from '../../../services/mangaService';
import type { MangaComment } from '../../../services/communityService';
import type { MangaCapitulo } from '../../../types/manga';
import { collectionBadge } from '../../../utils/womenBlackWhite';
import { toTitleCase } from '../../../utils/titleCase';

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const MetaRow = ({ icon, label, value, dotColor }: { icon: React.ReactNode; label: string; value: string; dotColor?: string }) => (
  <div className="flex min-h-[37px] items-start gap-2.5">
    <span className="flex w-[26px] shrink-0 justify-center text-white">{icon}</span>
    <span className="shrink-0 pt-1 font-montserrat text-base font-extrabold leading-4 tracking-tight text-white max-[400px]:text-sm">{label}</span>
    <span className="ml-auto inline-flex min-w-0 items-center gap-2 pt-1 text-right font-montserrat text-base font-normal leading-4 tracking-tight text-white max-[400px]:text-sm">
      {dotColor && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 animate-dot-blink rounded-full motion-reduce:animate-none" style={{ backgroundColor: dotColor }} />}
      <span className="truncate">{value || 'N/A'}</span>
    </span>
  </div>
);

/** Pestañas Capítulos · Sinopsis · Comentarios: la activa va en negro sobre la píldora blanca que se desliza. */
const tabClass = (active = false) =>
  `relative z-[1] flex h-full flex-1 basis-0 items-center justify-center gap-2 rounded-full font-montserrat text-xs leading-5 transition-[color,font-weight] duration-[260ms] ${active ? 'font-bold text-black' : 'font-normal text-white'}`;

/**
 * Ficha de manga en móvil (< 1024px), según el diseño: portada a sangre con el
 * título encima, géneros, título original, los dos botones, el contador de
 * "Me gusta" con su barra en pico, las etiquetas, la ficha técnica, el cartel
 * de Mukai Music, las pestañas con los capítulos o la sinopsis, las reacciones,
 * los comentarios, las recomendaciones y el footer del inicio.
 */
export const MobileMangaDetail = ({
  manga, chapters, related, initialComments, commentsLoading, commentsError, chaptersLoading, chaptersError, relatedLoading, secondaryReady,
  isBookmarked, isLiked, likes, online, interactionBusy, onBookmark, onLike,
  reactionCounts, selectedReaction, reactionError, onReact,
  purchasedIds, userCoins, userInfo, onPurchaseSuccess, onReadFirst, hasFirstChapter,
  synopsis,
}: {
  commentsLoading: boolean;
  commentsError: string;
  chaptersLoading: boolean;
  chaptersError: string;
  relatedLoading: boolean;
  secondaryReady: boolean;
  manga: MangaCapitulo;
  chapters: SeriesChapter[];
  related: RelatedManga[];
  initialComments: MangaComment[];
  isBookmarked: boolean;
  isLiked: boolean;
  likes: number;
  online: number;
  interactionBusy: 'bookmark' | 'like' | '';
  onBookmark: () => void;
  onLike: () => void;
  reactionCounts: Record<MangaReactionId, number>;
  selectedReaction: MangaReactionId | null;
  reactionError: string;
  onReact: (id: MangaReactionId) => void;
  purchasedIds: Set<string>;
  userCoins: number;
  userInfo: { id: string; username: string };
  onPurchaseSuccess: () => void;
  onReadFirst: () => void;
  hasFirstChapter: boolean;
  synopsis: string;
}) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'chapters' | 'synopsis'>('chapters');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  const genres = (manga.genres || []).slice(0, 6);
  const badge = collectionBadge(manga);
  // El catálogo del servidor usa cuatro tipos: Manga, Manhwa, Manhua y Comic.
  const typeColor = (() => {
    const type = (manga.tipo || '').toLocaleLowerCase('es');
    if (type.includes('manhua')) return '#22C55E';
    if (type.includes('manhwa')) return '#B000AD';
    if (type.includes('comic')) return '#38BDF8';
    return '#FF008C';
  })();

  const normalize = (value: string) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const query = normalize(search.trim());
  const filteredChapters = query
    ? chapters.filter((chapter) => normalize(`${chapter.chapter_number} ${chapter.title || ''}`).includes(query))
    : chapters;

  return (
    // Ficha móvil: siempre en oscuro (`theme-dark`), sobre un lienzo de referencia de 440 px.
    <div className="manga-detail-mobile theme-dark focus-scope tap-transparent mx-auto flow-root min-h-screen w-full max-w-[440px] overflow-x-hidden bg-surface text-ink [--focus-color:#ff008c] [--focus-offset:2px]">
      {/* Portada a sangre: el título se apoya en el degradado de su parte baja. */}
      <header className="relative aspect-[440/630]">
        <img src={manga.portada} alt={`Portada de ${toTitleCase(manga.titulo)}`} fetchPriority="high" className="block h-full w-full object-cover object-top" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[19.643%] bg-gradient-to-t from-black via-black/85 to-transparent" />

        <button
          type="button"
          onClick={() => { if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1); else navigate('/'); }}
          aria-label="Volver"
          title="Volver"
          className="absolute left-3 top-[calc(env(safe-area-inset-top)+12px)] flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:bg-black/60"
        >
          <ChevronLeft size={24} strokeWidth={2.6} className="-ml-0.5" />
        </button>


      </header>

      {/* Acciones */}
      <div className="manga-detail-mobile-actions ml-[12.7273%] mt-[19px] flex min-h-[50px] w-[74.3182%] items-start justify-center gap-[7px]">
        <button
          type="button"
          onClick={onReadFirst}
          disabled={!hasFirstChapter}
          className="flex h-12 w-44 min-w-0 shrink items-center justify-center gap-2.5 whitespace-nowrap rounded-md bg-mukai-magenta font-montserrat text-sm font-extrabold text-white transition-transform active:scale-95 disabled:opacity-45 max-[400px]:gap-1.5 max-[400px]:text-xs"
        >
          <BookOpenText size={20} strokeWidth={2} aria-hidden="true" className="shrink-0" />
          Leer Capítulo 1
        </button>
        <button
          type="button"
          onClick={onBookmark}
          disabled={interactionBusy === 'bookmark'}
          aria-pressed={isBookmarked}
          className={`mt-0.5 flex h-12 w-36 min-w-0 shrink items-center justify-center gap-2 whitespace-nowrap rounded-md border bg-black font-montserrat text-sm font-extrabold uppercase transition-transform active:scale-95 max-[400px]:gap-1.5 max-[400px]:text-xs ${isBookmarked ? 'border-mukai-magenta text-mukai-magenta' : 'border-neutral-400 text-white'}`}
        >
          {interactionBusy === 'bookmark' ? <Loader2 size={20} className="animate-spin" /> : <SaveBookmarkIcon size={20} />}
          {isBookmarked ? 'Guardado' : 'Guardar'}
        </button>
      </div>

        <h1 className="manga-detail-mobile-title">
          {toTitleCase(manga.titulo)}
        </h1>
      {/* Título original: caja difuminada, por encima de las etiquetas de genero. */}
      {manga.tituloOriginal && (
        <p className="ml-[12.7273%] mt-[15px] flex min-h-[26px] w-[72.7273%] items-center justify-center rounded-md border border-white/[.12] bg-white/[.08] px-2 py-1 text-center font-anta text-[11px] font-normal leading-tight text-white backdrop-blur-[6px]">
          {manga.tituloOriginal}
        </p>
      )}

      {/* Géneros */}
      {genres.length > 0 && (
        <nav aria-label="Géneros" className="mt-[15px] flex flex-wrap items-center justify-center gap-[7px] px-6">
          {genres.map((genre) => (
            <Link key={genre} to={`/biblioteca?genre=${encodeURIComponent(genre)}`} className="flex h-5 items-center border border-neutral-500/70 bg-black px-[7px] font-anta text-[10px] font-normal leading-5 text-white">
              {genre}
            </Link>
          ))}
        </nav>
      )}


      {/* Me gusta y barra en pico */}
      <div className="manga-detail-mobile-engagement mt-[41px]">
        <button type="button" onClick={onLike} disabled={interactionBusy === 'like'} aria-pressed={isLiked} className="mx-auto flex items-center gap-2 text-white disabled:opacity-60">
          {interactionBusy === 'like'
            ? <Loader2 size={28} className="animate-spin" />
            : <LikeHeartIcon size={28} className={isLiked ? 'text-mukai-magenta' : 'text-white'} />}
          <span className="font-anta text-base font-normal leading-4 tabular-nums">{likes}</span>
          <span className="font-montserrat text-base font-medium leading-5">Me gusta</span>
        </button>
        <LikeBarShape className="mx-auto mt-4 block h-7 w-[73%] overflow-visible" />
      </div>

      <p className="mt-4 text-center font-montserrat text-base">Lectores en línea ({online})</p>
      {/* Etiquetas de la colección */}
      <div className="mt-[17px] flex items-center justify-center gap-2.5 px-6">
        <span className="flex h-6 w-16 items-center justify-center rounded-lg bg-mukai-magenta font-montserrat text-xs font-bold leading-4 text-white">Estreno</span>
        {badge === 'bn' ? (
          <span className="flex h-6 w-16 items-center justify-center rounded-lg bg-zinc-100 font-montserrat text-xs font-bold leading-4 text-black">B&amp;N</span>
        ) : badge === 'hot' ? (
          <span className="flex h-6 w-16 items-center justify-center rounded-lg bg-red-600 font-montserrat text-xs font-bold leading-4 text-white">Hot</span>
        ) : (
          <span className="flex h-6 w-16 items-center justify-center gap-1 rounded-lg bg-mukai-purple font-montserrat text-xs font-bold leading-4 text-white">
            Color
            <PaletteIcon size={13} />
          </span>
        )}
      </div>

      {/* Ficha técnica */}
      <div className="manga-detail-mobile-metadata mx-auto mt-7 w-[74.5455%] max-[400px]:w-[calc(100%-48px)]">
        <MetaRow icon={<TypeIcon size={26} />} label="Tipo" value={manga.tipo || 'Manga'} dotColor={typeColor} />
        <MetaRow icon={<DetailViewsIcon size={26} />} label="Vistas" value={new Intl.NumberFormat("es-PE").format(manga.totalViews ?? 0)} />
        {manga.author && <MetaRow icon={<StudioIcon size={25} />} label="Autor" value={manga.author} />}
                <MetaRow icon={<StudioIcon size={25} />} label="Estudio" value={manga.studio || 'N/A'} />
        <MetaRow icon={<PlatformIcon size={26} />} label="Plataforma" value={manga.platform || 'N/A'} />
        <MetaRow icon={<PublishedIcon size={27} />} label="Publicación" value={formatDate(manga.publishedAt || manga.rawFecha)} />
      </div>

      <section aria-label="Mukai Music" className="ml-[16.8182%] mt-[22px] w-[min(288px,80%)] max-[400px]:mx-auto">
        <div className="h-40 overflow-hidden rounded-2xl border border-white/50">{secondaryReady && <MukaiMusicPromo />}</div>
      </section>

      {/* Pestañas */}
      <nav aria-label="Secciones del manga" className="mx-auto mt-[46px] w-[88.6364%]">
        <div className="relative flex h-11 items-center rounded-3xl border border-stone-300/75 bg-black">
          {/* Píldora blanca: una sola pieza que viaja entre las pestañas. */}
          <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1/3 rounded-full bg-white transition-transform duration-[360ms] ease-[cubic-bezier(0.22,0.9,0.3,1)] will-change-transform motion-reduce:transition-none ${tab === 'synopsis' ? 'translate-x-full' : ''}`} />
          <button type="button" onClick={() => setTab('chapters')} aria-current={tab === 'chapters'} className={tabClass(tab === 'chapters')}>
            <ChaptersTabIcon size={13} />
            Capítulos
          </button>
          <button type="button" onClick={() => setTab('synopsis')} aria-current={tab === 'synopsis'} className={tabClass(tab === 'synopsis')}>
            <SynopsisTabIcon size={14} />
            Sinopsis
          </button>
          <a href="#comentarios" className={tabClass()}>
            <CommentsTabIcon size={16} />
            Comentarios
          </a>
        </div>
      </nav>

      {tab === 'chapters' ? (
        <section aria-label="Capítulos" className="mx-auto mt-7 w-[89.0909%]">
          <div className="flex items-center gap-1.5">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border-[0.5px] border-zinc-400/60 bg-zinc-500/10 px-3.5">
              <SearchIcon size={22} className="shrink-0 text-white/60" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busca por número de capitulo o titulo"
                aria-label="Buscar capítulos"
                className="h-full min-w-0 flex-1 bg-transparent font-montserrat text-xs leading-5 text-white caret-mukai-magenta outline-none placeholder:text-white/40 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))}
              aria-label={sortOrder === 'desc' ? 'Ordenar del menor al mayor' : 'Ordenar del mayor al menor'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-[0.5px] border-zinc-400/60 bg-zinc-500/10 text-white"
            >
              <SortDownIcon size={22} className={sortOrder === 'desc' ? 'opacity-100' : 'opacity-50'} />
              <SortUpIcon size={22} className={sortOrder === 'asc' ? 'opacity-100' : 'opacity-50'} />
            </button>
          </div>

          <div className="mt-5">
            {query && filteredChapters.length === 0 ? (
              <p className="rounded-lg border border-zinc-400/25 py-14 text-center font-montserrat text-xs text-white/50">No encontramos capítulos con esa búsqueda.</p>
            ) : (
              <ChapterList
                loading={chaptersLoading}
                loadError={chaptersError}
                chapters={filteredChapters}
                purchasedChapterIds={purchasedIds}
                userCoins={userCoins}
                userInfo={userInfo}
                onPurchaseSuccess={onPurchaseSuccess}
                sortOrder={sortOrder}
              />
            )}
          </div>
        </section>
      ) : (
        <section aria-label="Sinopsis" className="mx-auto mt-7 w-[89.0909%]">
          <div className="rounded-2xl border-[0.5px] border-zinc-400/60 p-4">
            <p className={`text-justify font-montserrat text-xs font-normal leading-5 text-white/90 ${synopsisExpanded ? '' : 'line-clamp-6'}`}>
              {synopsis || 'La sinopsis de este manga todavía no está disponible.'}
            </p>
            {synopsis && (
              <button type="button" onClick={() => setSynopsisExpanded((current) => !current)} className="mx-auto mt-3 flex items-center gap-1 font-montserrat text-[11px] font-semibold text-mukai-magenta">
                {synopsisExpanded ? 'Ver menos' : 'Ver más'}
                <ChevronDown size={14} className={synopsisExpanded ? 'rotate-180' : ''} />
              </button>
            )}
          </div>
        </section>
      )}

      <div className="mx-auto w-[89.0909%]"><MangaCommunityLinks /></div>
      <div className="mt-[35px]">
        <MobileReactions counts={reactionCounts} selected={selectedReaction} error={reactionError} onReact={onReact} />
      </div>

      <div className="mt-14">
        <MangaComments mangaId={String(manga.id)} initialComments={initialComments} loading={commentsLoading} loadError={commentsError} forceDark />
      </div>

      <MangaRecommendations loading={relatedLoading} items={related} currentId={manga.id} className="mx-auto mt-[37px] min-h-[709px] w-[89.0909%]" />

      <div className="mt-12">
        <Footer className="-mt-6" />
      </div>
    </div>
  );
};
