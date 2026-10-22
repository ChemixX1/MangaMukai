import { SaveButton } from '../../ui/SaveButton';
import { GooeySelector } from '../../ui/GooeySelector';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

import { MangaCommunityLinks } from '../MangaCommunityLinks';
import { MangaSeriesLikeButton } from '../MangaSeriesLikeButton';
import { MangaRewardProgress } from '../MangaRewardProgress';
import { MangaSeasonSelector } from '../MangaSeasonSelector';
import HoloCard from '../HoloCard';
import { MangaDetailSocials } from '../MangaDetailSocials';
import { MangaDetailClock } from '../../common';
import { DetailViewsIcon, DetailNewIcon } from '../referenceIcons';
import { AlarmIcon, MoonIcon, SunIcon } from '../../ui';
import { useTheme } from '../../../hooks/useTheme';
import { OPEN_TIMER_EVENT } from '../../layout/useNavbarState';
import { Footer } from '../../layout/Footer';
import { ChapterList } from '../ChapterList';
import { MangaComments } from '../MangaComments';
import { MangaRecommendations } from '../MangaRecommendations';
import { MangaMusicCard } from '../MangaMusicCard';
import { MobileReactions } from './MobileReactions';
import type { MangaReactionId } from '../reactions';
import {
  ChaptersTabIcon,
  CommentsTabIcon,
  PaletteIcon,
  PlatformIcon,
  PublishedIcon,
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
    <span className="flex w-[26px] shrink-0 justify-center text-ink">{icon}</span>
    <span className="shrink-0 pt-1 font-montserrat text-base font-extrabold leading-4 tracking-tight text-ink max-[400px]:text-sm">{label}</span>
    <span className="ml-auto inline-flex min-w-0 items-center gap-2 pt-1 text-right font-montserrat text-base font-normal leading-4 tracking-tight text-ink max-[400px]:text-sm">
      {dotColor && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 animate-dot-blink rounded-full motion-reduce:animate-none" style={{ backgroundColor: dotColor }} />}
      <span className="truncate">{value || 'N/A'}</span>
    </span>
  </div>
);

const tabClass = (active = false) => `manga-detail-tab ${active ? 'is-active' : ''}`;

export const MobileMangaDetail = ({
  manga, chapters, related, initialComments, commentsLoading, commentsError, chaptersLoading, chaptersError, relatedLoading, secondaryReady,
  isBookmarked, isLiked, likes, interactionBusy, onBookmark, onLike,
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
  onBookmark: () => Promise<boolean>;
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
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [tab, setTab] = useState<'chapters' | 'synopsis' | 'comments'>('chapters');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  const genres = (manga.genres || []).slice(0, 6);
  const badge = collectionBadge(manga);

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
    <main className="manga-detail-mobile-shell relative min-h-screen overflow-x-clip bg-surface text-ink">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <img src={manga.portada} alt="" className="h-full w-full origin-top scale-105 object-cover object-top blur-[2px]" />
        <div className="absolute inset-0 bg-surface/[.95]" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-transparent to-surface" />
      </div>
    <div className="manga-detail-mobile focus-scope tap-transparent relative z-10 mx-auto flow-root min-h-screen w-full max-w-[440px] overflow-x-hidden text-ink [--focus-color:#ff008c] [--focus-offset:2px]">
      <div className="manga-detail-mobile-topbar">
        <div className="manga-detail-mobile-clock-row">
          <div className="manga-detail-mobile-controls">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? <MoonIcon size={26} /> : <SunIcon size={26} />}
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_TIMER_EVENT))}
              aria-label="Abrir temporizador"
              title="Abrir temporizador"
            >
              <AlarmIcon size={22} />
            </button>
            <Link
              to="/recargar"
              state={{ returnTo: `${location.pathname}${location.search}` }}
              aria-label="Recargar monedas"
              title="Recargar monedas"
            >
              <svg width="26" height="26" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M6.123 7.25L6.914 2H2.8L1.081 6.5C1.02767 6.66 1.00067 6.82667 1 7C1 8.104 2.15 9 3.571 9C4.881 9 5.964 8.236 6.123 7.25ZM10 9C11.42 9 12.571 8.104 12.571 7C12.5703 6.95867 12.5687 6.91833 12.566 6.879L12.057 2H7.943L7.433 6.875L7.429 7C7.429 8.104 8.58 9 10 9ZM15 10.046V14H5V10.052C4.562 10.21 4.08 10.3 3.571 10.3C3.376 10.3 3.187 10.277 3 10.251V16.6C3 17.37 3.629 18 4.398 18H15.6C16.37 18 17 17.369 17 16.6V10.252C16.8111 10.282 16.6203 10.2983 16.429 10.301C15.9415 10.2996 15.4579 10.2133 15 10.046ZM18.92 6.5L17.199 2H13.086L13.876 7.242C14.03 8.232 15.113 9 16.429 9C17.849 9 19 8.104 19 7C18.9993 6.82667 18.9727 6.66 18.92 6.5Z" fill="currentColor" />
              </svg>
            </Link>
          </div>
          <MangaDetailClock />
        </div>
        <div className="manga-detail-mobile-follow">
          <span className="manga-detail-mobile-clock-divider" aria-hidden="true" />
          <MangaDetailSocials />
        </div>
      </div>

      <header className="manga-detail-mobile-cover relative aspect-[440/630]">
        <HoloCard image={manga.portada} alt={`Portada de ${toTitleCase(manga.titulo)}`} foilEnabled={false} shadow={false} tiltMax={8} tiltDamping={26} hoverScale={1.015} radius={14} idle={false} />
      </header>


      <div className="manga-detail-mobile-actions flex min-h-[50px] items-start justify-center">
        <button
          type="button"
          onClick={onReadFirst}
          disabled={!hasFirstChapter}
          className="flex h-12 w-44 min-w-0 shrink items-center justify-center gap-2.5 whitespace-nowrap rounded-md bg-mukai-magenta font-montserrat text-sm font-extrabold text-white transition-transform active:scale-95 disabled:opacity-45 max-[400px]:gap-1.5 max-[400px]:text-xs"
        >
          Leer Capítulo 1
        </button>
        <SaveButton
          mangaId={manga.id}
          onSave={onBookmark}
          disabled={interactionBusy === 'bookmark'}
          saved={isBookmarked}
          iconClassName="size-5"
          className={`mt-0.5 flex h-12 w-36 min-w-0 shrink items-center justify-center gap-2 whitespace-nowrap rounded-md border bg-black font-montserrat text-sm font-extrabold uppercase transition-transform active:scale-95 max-[400px]:gap-1.5 max-[400px]:text-xs ${'border-neutral-400 text-white'}`}
        />
      </div>

        <h1 className="manga-detail-mobile-title">
          {toTitleCase(manga.titulo)}
        </h1>
        {manga.tituloOriginal?.trim() && <p className="manga-detail-original-title">{manga.tituloOriginal.trim()}</p>}

      {genres.length > 0 && (
        <div role="list" aria-label="Géneros" className="manga-detail-genres">
          {genres.map((genre) => (
            <span key={genre} role="listitem" className="flex h-5 items-center border border-mukai-magenta bg-mukai-magenta px-[7px] font-anta text-[10px] font-normal leading-5 text-white">
              {genre}
            </span>
          ))}
        </div>
      )}

      <MangaRewardProgress purchasedIds={purchasedIds} userId={userInfo.id} loading={chaptersLoading} />
      <MangaSeasonSelector key={manga.id} cover={manga.portada} title={toTitleCase(manga.titulo)} likeAction={
        <MangaSeriesLikeButton liked={isLiked} likes={likes} busy={interactionBusy === 'like'} disabled={interactionBusy === 'like'} onClick={onLike} />
      } />

      <div className="manga-detail-badges">
        <span className="manga-detail-views" aria-label={manga.totalViews === undefined ? 'Vistas no disponibles' : `${new Intl.NumberFormat('es-PE').format(manga.totalViews)} vistas`}><DetailViewsIcon size={18} />{manga.totalViews === undefined ? '--' : new Intl.NumberFormat('es-PE', { notation: 'compact' }).format(manga.totalViews)}</span>
        <span className="manga-mobile-new-badge flex items-center justify-center rounded-lg bg-mukai-magenta font-montserrat text-xs font-bold leading-4 text-white"><DetailNewIcon size={16} />Estreno</span>
        {badge === 'bn' ? (
          <span className="flex h-6 w-16 items-center justify-center rounded-lg bg-zinc-100 font-montserrat text-xs font-bold leading-4 text-black">B&amp;N</span>
        ) : badge === 'hot' ? (
          <span className="flex h-6 w-16 items-center justify-center rounded-lg bg-red-600 font-montserrat text-xs font-bold leading-4 text-white">Hot</span>
        ) : (
          <span className="flex h-6 w-16 items-center justify-center gap-1 rounded-lg bg-mukai-purple font-montserrat text-xs font-bold leading-4 text-white">
            <PaletteIcon size={16} />
            Color
          </span>
        )}
      </div>


      <div className="manga-detail-mobile-metadata mx-auto mt-7 w-[74.5455%] max-[400px]:w-[calc(100%-48px)]">
        <MetaRow icon={<TypeIcon size={26} />} label="Tipo" value={manga.tipo?.trim() || '--'} dotColor={manga.tipo?.trim() ? typeColor : undefined} />
        {manga.author && <MetaRow icon={<StudioIcon size={25} />} label="Autor" value={manga.author} />}
        <MetaRow icon={<StudioIcon size={25} />} label="Estudio" value={manga.studio?.trim() || '--'} />
        <MetaRow icon={<PlatformIcon size={26} />} label="Plataforma" value={manga.platform?.trim() || '--'} />
        <MetaRow icon={<PublishedIcon size={27} />} label="Publicación" value={formatDate(manga.publishedAt || manga.rawFecha)} />
      </div>

      <section aria-label="Mukai Music" className="manga-detail-mobile-music">
        <div className="h-full overflow-hidden rounded-2xl">{secondaryReady && <MangaMusicCard cover={manga.portada} compactHeight isLight={theme === 'light'} />}</div>
      </section>


      <nav aria-label="Secciones del manga" className="mx-auto mt-[46px] w-[88.6364%]">
        <div className="manga-detail-tabs">

          <GooeySelector activeIndex={sectionIndex} />
          <button type="button" onClick={() => { setTab('chapters'); setSectionIndex(0); }} aria-current={sectionIndex === 0} className={tabClass(sectionIndex === 0)}>
            <ChaptersTabIcon size={13} />
            Capítulos ({Math.max(chapters.length, manga.chapterCount ?? 0)})
          </button>
          <button type="button" onClick={() => { setTab('synopsis'); setSectionIndex(1); }} aria-current={sectionIndex === 1} className={tabClass(sectionIndex === 1)}>
            <SynopsisTabIcon size={14} />
            Sinopsis
          </button>
          <button type="button" onClick={() => { setTab('comments'); setSectionIndex(2); }} aria-current={sectionIndex === 2} className={tabClass(sectionIndex === 2)}>
            <CommentsTabIcon size={16} />
            Comentarios
          </button>
        </div>
      </nav>

      {tab === 'chapters' ? (
        <section aria-label="Capítulos" className="manga-chapters-section mx-auto w-[89.0909%]">
          <div className="manga-chapter-search">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border-[0.5px] border-zinc-400/60 bg-zinc-500/10 px-3.5">
              <SearchIcon size={22} className="shrink-0 text-ink/60" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busca por número de capitulo o titulo"
                aria-label="Buscar capítulos"
                className="h-full min-w-0 flex-1 bg-transparent font-montserrat text-xs leading-5 text-ink caret-mukai-magenta outline-none placeholder:text-ink/40 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))}
              aria-label={sortOrder === 'desc' ? 'Ordenar del menor al mayor' : 'Ordenar del mayor al menor'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-[0.5px] border-zinc-400/60 bg-zinc-500/10 text-ink"
            >
              <SortDownIcon size={22} className={sortOrder === 'desc' ? 'opacity-100' : 'opacity-50'} />
              <SortUpIcon size={22} className={sortOrder === 'asc' ? 'opacity-100' : 'opacity-50'} />
            </button>
          </div>

          <div>
            {query && filteredChapters.length === 0 ? (
              <p className="rounded-lg border border-zinc-400/25 py-14 text-center font-montserrat text-xs text-ink/50">No encontramos capítulos con esa búsqueda.</p>
            ) : (
              <ChapterList
                    mangaId={String(manga.eroSeri || manga.id)}
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
      ) : tab === 'synopsis' ? (
        <section aria-label="Sinopsis" className="mx-auto mt-7 w-[89.0909%]">
          <div className="rounded-2xl border-[0.5px] border-zinc-400/60 p-4">
            <p className={`text-justify font-montserrat text-[13px] font-normal leading-5 text-ink/90 ${synopsisExpanded ? '' : 'line-clamp-6'}`}>
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
      ) : null}

      <div className="flex flex-col">
      <div className="mx-auto w-[89.0909%]"><MangaCommunityLinks /></div>
      <div className="mt-[35px]">
        <MobileReactions counts={reactionCounts} selected={selectedReaction} error={reactionError} onReact={onReact} />
      </div>

      <MangaRecommendations loading={relatedLoading} items={related} currentId={manga.id} className="mx-auto mt-[37px] min-h-[709px] w-[89.0909%]" />

      <div className={`manga-detail-comments${tab === 'comments' ? ' order-first' : ''}`}>
        <MangaComments mangaId={String(manga.id)} initialComments={initialComments} loading={commentsLoading} loadError={commentsError} />
      </div>
      </div>

      <div className="mt-12">
        <Footer ready={!chaptersLoading && !commentsLoading && !relatedLoading} homeDesign className="-mt-6" />
      </div>
    </div>
    </main>
  );
};
