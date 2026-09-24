import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpenText, ChevronDown, ChevronLeft, Loader2 } from 'lucide-react';

import { Footer } from '../../layout/Footer';
import { MobileChapterList } from './MobileChapterList';
import { MobileMangaComments } from './MobileMangaComments';
import { MobileMukaiMusic } from './MobileMukaiMusic';
import { MobileReactions, type MobileReactionId } from './MobileReactions';
import { MobileRecommendations } from './MobileRecommendations';
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
} from './designIcons';
import type { RelatedManga, SeriesChapter } from '../../../services/mangaService';
import type { MangaComment } from '../../../services/communityService';
import type { MangaCapitulo } from '../../../types/manga';
import { collectionBadge } from '../../../utils/womenBlackWhite';
import { toTitleCase } from '../../../utils/titleCase';
import '../../home/mobile/mobile-home.css';
import './mobile-manga-detail.css';

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const MetaRow = ({ icon, label, value, dotColor }: { icon: React.ReactNode; label: string; value: string; dotColor?: string }) => (
  <div className="mmd-meta-row flex min-h-[37px] items-center gap-4">
    <span className="flex w-[26px] shrink-0 justify-center text-white">{icon}</span>
    <span className="mmd-montserrat shrink-0 text-base font-extrabold leading-4 tracking-tight text-white">{label}</span>
    <span className="mmd-montserrat ml-auto inline-flex min-w-0 items-center gap-2 text-right text-base font-normal leading-4 tracking-tight text-white">
      {dotColor && <span aria-hidden="true" className="mmd-type-dot h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />}
      <span className="truncate">{value || 'N/A'}</span>
    </span>
  </div>
);

/**
 * Ficha de manga en móvil (< 1024px), según el diseño: portada a sangre con el
 * título encima, géneros, título original, los dos botones, el contador de
 * "Me gusta" con su barra en pico, las etiquetas, la ficha técnica, el cartel
 * de Mukai Music, las pestañas con los capítulos o la sinopsis, las reacciones,
 * los comentarios, las recomendaciones y el footer del inicio.
 */
export const MobileMangaDetail = ({
  manga, chapters, related, initialComments,
  isBookmarked, isLiked, likes, interactionBusy, onBookmark, onLike,
  reactionCounts, selectedReaction, reactionError, onReact,
  purchasedIds, userCoins, userInfo, onPurchaseSuccess, onReadFirst, hasFirstChapter,
  synopsis,
}: {
  manga: MangaCapitulo;
  chapters: SeriesChapter[];
  related: RelatedManga[];
  initialComments: MangaComment[];
  isBookmarked: boolean;
  isLiked: boolean;
  likes: number;
  interactionBusy: 'bookmark' | 'like' | '';
  onBookmark: () => void;
  onLike: () => void;
  reactionCounts: Record<MobileReactionId, number>;
  selectedReaction: MobileReactionId | null;
  reactionError: string;
  onReact: (id: MobileReactionId) => void;
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

  const genres = (manga.genres || []).slice(0, 4);
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
    <div className="mmd-root min-h-screen">
      {/* Portada a sangre: el título se apoya en el degradado de su parte baja. */}
      <header className="mmd-cover relative">
        <img src={manga.portada} alt={`Portada de ${toTitleCase(manga.titulo)}`} fetchPriority="high" className="mmd-cover-image block w-full" />
        <div aria-hidden="true" className="mmd-cover-shade absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-t from-black via-black/85 to-transparent" />

        <button
          type="button"
          onClick={() => { if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1); else navigate('/'); }}
          aria-label="Volver"
          title="Volver"
          className="absolute left-3 top-[calc(env(safe-area-inset-top)+12px)] flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:bg-black/60"
        >
          <ChevronLeft size={24} strokeWidth={2.6} className="-ml-0.5" />
        </button>

        <h1 className="mmd-title mmd-montserrat absolute inset-x-0 bottom-2 px-8 text-center text-lg font-black leading-5 text-stone-50">
          {toTitleCase(manga.titulo)}
        </h1>
      </header>

      {/* Título original: caja difuminada, por encima de las etiquetas de genero. */}
      {manga.tituloOriginal && (
        <p className="mmd-original-title mmd-anta mx-auto mt-3.5 flex min-h-[26px] w-[74%] items-center justify-center px-2 py-1 text-center text-[11px] leading-tight text-white">
          {manga.tituloOriginal}
        </p>
      )}

      {/* Géneros */}
      {genres.length > 0 && (
        <nav aria-label="Géneros" className="mmd-genres mt-3.5 flex flex-wrap items-center justify-center gap-[7px] px-6">
          {genres.map((genre) => (
            <Link key={genre} to={`/biblioteca?genre=${encodeURIComponent(genre)}`} className="mmd-anta flex h-5 items-center border border-neutral-500/70 bg-black px-[7px] text-[10px] leading-5 text-white">
              {genre}
            </Link>
          ))}
        </nav>
      )}

      {/* Acciones */}
      <div className="mmd-actions mt-4 flex items-center justify-center gap-4 px-6">
        <button
          type="button"
          onClick={onReadFirst}
          disabled={!hasFirstChapter}
          className="mmd-montserrat flex h-12 w-44 items-center justify-center gap-2.5 rounded-md bg-[#FF008C] text-sm font-extrabold text-white transition-transform active:scale-95 disabled:opacity-45"
        >
          <BookOpenText size={20} strokeWidth={2} aria-hidden="true" className="shrink-0" />
          Leer Capítulo 1
        </button>
        <button
          type="button"
          onClick={onBookmark}
          disabled={interactionBusy === 'bookmark'}
          aria-pressed={isBookmarked}
          className={`mmd-montserrat flex h-12 w-36 items-center justify-center gap-2 rounded-md border bg-black text-sm font-extrabold uppercase transition-transform active:scale-95 ${isBookmarked ? 'border-[#FF008C] text-[#FF008C]' : 'border-neutral-400 text-white'}`}
        >
          {interactionBusy === 'bookmark' ? <Loader2 size={20} className="animate-spin" /> : <SaveBookmarkIcon size={20} />}
          {isBookmarked ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {/* Me gusta y barra en pico */}
      <div className="mmd-likes mt-8 px-6">
        <button type="button" onClick={onLike} disabled={interactionBusy === 'like'} aria-pressed={isLiked} className="mx-auto flex items-center gap-2 text-white disabled:opacity-60">
          {interactionBusy === 'like'
            ? <Loader2 size={28} className="animate-spin" />
            : <LikeHeartIcon size={28} className={isLiked ? 'text-[#FF008C]' : 'text-white'} />}
          <span className="mmd-anta text-base leading-4 tabular-nums">{likes}</span>
          <span className="mmd-orbitron text-base font-bold leading-4">Me gusta</span>
        </button>
        <LikeBarShape className="mmd-like-bar mx-auto mt-4 block h-7 w-[73%]" />
      </div>

      {/* Etiquetas de la colección */}
      <div className="mmd-badges mt-4 flex items-center justify-center gap-2.5 px-6">
        <span className="mmd-montserrat flex h-6 w-16 items-center justify-center rounded-lg bg-[#FF008C] text-xs font-bold leading-4 text-white">Estreno</span>
        {badge === 'bn' ? (
          <span className="mmd-montserrat flex h-6 w-16 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold leading-4 text-black">B&amp;N</span>
        ) : badge === 'hot' ? (
          <span className="mmd-montserrat flex h-6 w-16 items-center justify-center rounded-lg bg-red-600 text-xs font-bold leading-4 text-white">Hot</span>
        ) : (
          <span className="mmd-montserrat flex h-6 w-16 items-center justify-center gap-1 rounded-lg bg-[#B000AD] text-xs font-bold leading-4 text-white">
            Color
            <PaletteIcon size={13} />
          </span>
        )}
      </div>

      {/* Ficha técnica */}
      <div className="mmd-metadata mx-auto mt-6 w-[75%]">
        <MetaRow icon={<TypeIcon size={26} />} label="Tipo" value={manga.tipo || 'Manga'} dotColor={typeColor} />
        <MetaRow icon={<StudioIcon size={25} />} label="Estudio" value={manga.studio || 'N/A'} />
        <MetaRow icon={<PlatformIcon size={26} />} label="Plataforma" value={manga.platform || 'N/A'} />
        <MetaRow icon={<PublishedIcon size={27} />} label="Publicación" value={formatDate(manga.publishedAt || manga.rawFecha)} />
      </div>

      <div className="mmd-music-spacing">
        <MobileMukaiMusic />
      </div>

      {/* Pestañas */}
      <nav aria-label="Secciones del manga" className="mmd-tabs mx-auto mt-10 w-[88.6%]">
        <div className="mmd-tabs-track relative flex h-11 items-center rounded-3xl border border-stone-300/75 bg-black">
          {/* Píldora blanca: una sola pieza que viaja entre las pestañas. */}
          <span aria-hidden="true" className="mmd-tabs-pill" data-tab={tab} />
          <button type="button" onClick={() => setTab('chapters')} aria-current={tab === 'chapters'} className={`mmd-tab mmd-montserrat ${tab === 'chapters' ? 'is-active' : ''}`}>
            <ChaptersTabIcon size={13} />
            Capítulos
          </button>
          <button type="button" onClick={() => setTab('synopsis')} aria-current={tab === 'synopsis'} className={`mmd-tab mmd-montserrat ${tab === 'synopsis' ? 'is-active' : ''}`}>
            <SynopsisTabIcon size={14} />
            Sinopsis
          </button>
          <a href="#comentarios" className="mmd-tab mmd-montserrat">
            <CommentsTabIcon size={16} />
            Comentarios
          </a>
        </div>
      </nav>

      {tab === 'chapters' ? (
        <section aria-label="Capítulos" className="mmd-content mx-auto mt-6 w-[88.6%]">
          <div className="flex items-center gap-1.5">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border-[0.5px] border-zinc-400/60 bg-zinc-500/10 px-3.5">
              <SearchIcon size={22} className="shrink-0 text-white/60" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busca por número de capitulo o titulo"
                aria-label="Buscar capítulos"
                className="mmd-montserrat h-full min-w-0 flex-1 bg-transparent text-xs leading-5 text-white outline-none placeholder:text-white/40 [&::-webkit-search-cancel-button]:hidden"
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
              <p className="mmd-montserrat rounded-lg border border-zinc-400/25 py-14 text-center text-xs text-white/50">No encontramos capítulos con esa búsqueda.</p>
            ) : (
              <MobileChapterList
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
        <section aria-label="Sinopsis" className="mmd-content mx-auto mt-6 w-[88.6%]">
          <div className="rounded-2xl border-[0.5px] border-zinc-400/60 p-4">
            <p className={`mmd-montserrat text-justify text-xs font-normal leading-5 text-white/90 ${synopsisExpanded ? '' : 'line-clamp-6'}`}>
              {synopsis || 'La sinopsis de este manga todavía no está disponible.'}
            </p>
            {synopsis && (
              <button type="button" onClick={() => setSynopsisExpanded((current) => !current)} className="mmd-montserrat mx-auto mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#FF008C]">
                {synopsisExpanded ? 'Ver menos' : 'Ver más'}
                <ChevronDown size={14} className={synopsisExpanded ? 'rotate-180' : ''} />
              </button>
            )}
          </div>
        </section>
      )}

      <div className="mmd-reactions-spacing">
        <MobileReactions counts={reactionCounts} selected={selectedReaction} error={reactionError} onReact={onReact} />
      </div>

      <div className="mmd-comments-spacing">
        <MobileMangaComments mangaId={String(manga.id)} initialComments={initialComments} />
      </div>

      <div className="mmd-recommendations-spacing">
        <MobileRecommendations items={related} currentId={manga.id} />
      </div>

      <div className="mt-12">
        <Footer className="-mt-6" />
      </div>
    </div>
  );
};
