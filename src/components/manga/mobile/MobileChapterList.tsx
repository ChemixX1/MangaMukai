import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PurchaseModal } from '../../modals';
import { getChapterPreviewImage, type SeriesChapter } from '../../../services/mangaService';
import { getChapterEngagement, setEntityReaction } from '../../../services/communityService';
import { buyChapter, getStoredToken } from '../../../services/authService';
import {
  ChapterCommentIcon,
  ChapterLikeHeartIcon,
  CoinStackIcon,
  LikeHeartIcon,
  PurchasedIcon,
  ShowAllIcon,
} from './designIcons';

const VISIBLE_CHAPTERS = 5;

/** "Hoy", "3 días", "3 meses"… igual que en la versión de escritorio. */
const formatChapterAge = (createdAt: string): string => {
  const published = new Date(createdAt).getTime();
  if (!Number.isFinite(published)) return '';
  const elapsedDays = Math.max(0, Math.floor((Date.now() - published) / 86_400_000));
  if (elapsedDays === 0) return 'Hoy';
  if (elapsedDays === 1) return '1 día';
  if (elapsedDays >= 365) {
    const years = Math.floor(elapsedDays / 365);
    return `${years} ${years === 1 ? 'año' : 'años'}`;
  }
  if (elapsedDays > 30) {
    const months = Math.floor(elapsedDays / 30);
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  return `${elapsedDays} días`;
};

/** Miniatura: la portada subida del capítulo y, si no hay, su primera página. */
function ChapterThumbnail({ chapter }: { chapter: SeriesChapter }) {
  const uploadedCover = chapter.cover_url?.trim() || '';
  const [imageUrl, setImageUrl] = useState(uploadedCover);

  useEffect(() => {
    if (uploadedCover) { setImageUrl(uploadedCover); return; }
    let active = true;
    setImageUrl('');
    void getChapterPreviewImage(chapter.id, chapter.chapter_number, getStoredToken()).then((preview) => {
      if (active && preview) setImageUrl(preview);
    });
    return () => { active = false; };
  }, [chapter.id, chapter.chapter_number, uploadedCover]);

  return (
    <span className="mmd-chapter-thumbnail h-[76px] w-[87px] shrink-0 overflow-hidden rounded-lg border border-white bg-white/10">
      {imageUrl && <img src={imageUrl} alt="" aria-hidden="true" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
    </span>
  );
}

/**
 * Lista de capítulos del diseño: cinco filas de 96 px y el botón "Mostrar
 * Todos". Cada fila lleva la miniatura, el número, la antigüedad y, a la
 * derecha, el precio en monedas (o el sello verde si ya es suyo), los
 * comentarios y los me gusta.
 */
export const MobileChapterList = ({ chapters, purchasedChapterIds, userCoins, userInfo, onPurchaseSuccess, sortOrder }: {
  chapters: SeriesChapter[];
  purchasedChapterIds: Set<string>;
  userCoins: number;
  userInfo: { id: string; username: string };
  onPurchaseSuccess: () => void;
  sortOrder: 'asc' | 'desc';
}) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<SeriesChapter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localUnlocked, setLocalUnlocked] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [chapterLikes, setChapterLikes] = useState<Record<string, number>>({});
  const [likedChapterIds, setLikedChapterIds] = useState<Set<string>>(new Set());
  const [likeBusy, setLikeBusy] = useState(false);

  const chapterIds = chapters.map((chapter) => String(chapter.id)).join(',');
  useEffect(() => {
    let active = true;
    const load = () => {
      if (!chapterIds) return;
      void getChapterEngagement(chapterIds.split(',')).then(({ counts, engagement }) => {
        if (!active) return;
        setCommentCounts(counts);
        setChapterLikes(Object.fromEntries(Object.entries(engagement).map(([id, state]) => [id, state.reactions.like || 0])));
        setLikedChapterIds(new Set(Object.entries(engagement).filter(([, state]) => state.my_reaction === 'like').map(([id]) => id)));
      }).catch(() => undefined);
    };
    load();
    window.addEventListener('focus', load);
    window.addEventListener('mm_chapter_comments_changed', load);
    return () => { active = false; window.removeEventListener('focus', load); window.removeEventListener('mm_chapter_comments_changed', load); };
  }, [chapterIds]);

  const goToLogin = () => navigate('/auth/login', { state: { returnTo: `${window.location.pathname}${window.location.search}` } });

  const isPurchased = (chapter: SeriesChapter) => purchasedChapterIds.has(String(chapter.id)) || localUnlocked.has(String(chapter.id));
  const isLocked = (chapter: SeriesChapter) => {
    if (!chapter.is_paid) return false;
    if (chapter.free_at && new Date(chapter.free_at) <= new Date()) return false;
    return !isPurchased(chapter);
  };

  const openChapter = (chapter: SeriesChapter) => {
    if (!isLocked(chapter)) { navigate(`/read/${chapter.id}`); return; }
    if (!userInfo.id) { goToLogin(); return; }
    setSelectedChapter(chapter);
    setIsModalOpen(true);
  };

  const toggleLike = async (chapterId: number | string) => {
    if (likeBusy) return;
    if (!getStoredToken()) { goToLogin(); return; }
    const id = String(chapterId);
    setLikeBusy(true);
    try {
      const result = await setEntityReaction('chapter', id, likedChapterIds.has(id) ? '' : 'like');
      setChapterLikes((current) => ({ ...current, [id]: result.reactions.like || 0 }));
      setLikedChapterIds((current) => {
        const next = new Set(current);
        if (result.my_reaction === 'like') next.add(id); else next.delete(id);
        return next;
      });
    } catch { /* Un me gusta perdido no interrumpe la lectura. */ }
    finally { setLikeBusy(false); }
  };

  const confirmPurchase = async () => {
    if (!selectedChapter) return;
    setIsProcessing(true);
    try {
      const result = await buyChapter(selectedChapter.id);
      if (result.success) {
        setLocalUnlocked((current) => new Set(current).add(String(selectedChapter.id)));
        onPurchaseSuccess();
        setIsModalOpen(false);
        navigate(`/read/${selectedChapter.id}`);
      } else {
        window.alert(result.message || 'No se pudo comprar el capítulo.');
        setIsModalOpen(false);
      }
    } catch {
      window.alert('Error técnico al procesar la compra.');
    } finally {
      setIsProcessing(false);
    }
  };

  const ordered = [...chapters].sort((a, b) => (sortOrder === 'asc'
    ? a.chapter_number - b.chapter_number
    : b.chapter_number - a.chapter_number));
  const visible = showAll ? ordered : ordered.slice(0, VISIBLE_CHAPTERS);

  if (chapters.length === 0) {
    return <p className="mmd-montserrat rounded-lg border border-zinc-400/25 py-14 text-center text-[15px] font-bold italic text-white/60">Próximamente</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {visible.map((chapter) => {
          const id = String(chapter.id);
          const locked = isLocked(chapter);
          const liked = likedChapterIds.has(id);
          const comments = commentCounts[id] || 0;
          return (
            <li key={id}>
              <div className="mmd-chapter-row flex h-24 items-center gap-2 rounded-lg border border-zinc-400/25 pl-1.5 pr-2.5">
                <button type="button" onClick={() => openChapter(chapter)} className="mmd-chapter-link flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`Leer capítulo ${chapter.chapter_number}`}>
                  <ChapterThumbnail chapter={chapter} />
                  <span className="flex min-w-0 flex-col gap-2">
                    <span className="mmd-montserrat truncate text-xs font-semibold leading-3 text-white">Capítulo {chapter.chapter_number}</span>
                    <span className="mmd-montserrat truncate text-xs font-light leading-3 text-white/80">{formatChapterAge(chapter.created_at)}</span>
                  </span>
                </button>

                <span className="mmd-chapter-stats flex shrink-0 items-center gap-2">
                  {/* Precio mientras esté bloqueado; si ya es suyo, el sello verde. */}
                  {locked ? (
                    <span className="mmd-anta flex items-center gap-1 text-sm text-[#FB923C]">
                      <CoinStackIcon size={20} />
                      {chapter.price_coins}
                    </span>
                  ) : chapter.is_paid ? (
                    <PurchasedIcon size={30} className="text-green-500" />
                  ) : null}

                  <span className="mmd-anta flex items-center gap-1 text-base text-white">
                    <ChapterCommentIcon size={20} className={comments ? 'text-[#FF008C]' : 'text-white'} />
                    <span className={comments ? 'text-[#FF008C]' : ''}>{comments}</span>
                  </span>

                  <button type="button" onClick={() => void toggleLike(chapter.id)} disabled={likeBusy} aria-label={liked ? 'Quitar me gusta' : 'Me gusta'} aria-pressed={liked} className="mmd-anta flex items-center gap-1 text-base text-white disabled:opacity-60">
                    {liked ? <ChapterLikeHeartIcon size={16} /> : <LikeHeartIcon size={18} className="text-white" />}
                    <span className={liked ? 'text-[#FF008C]' : ''}>{chapterLikes[id] || 0}</span>
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {ordered.length > VISIBLE_CHAPTERS && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mmd-chapters-expand mmd-montserrat mx-auto mt-4 flex h-12 w-48 items-center justify-center gap-2 rounded-[20px] border-[0.5px] border-zinc-400/25 text-sm text-white/75"
        >
          {showAll ? 'Mostrar Menos' : 'Mostrar Todos'}
          <ShowAllIcon size={20} className={showAll ? 'rotate-180' : ''} />
        </button>
      )}

      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmPurchase}
        onRecharge={() => { setIsModalOpen(false); navigate('/recargar'); }}
        chapterNumber={selectedChapter?.chapter_number || 0}
        price={selectedChapter?.price_coins || 0}
        userBalance={userCoins}
        loading={isProcessing}
        freeAt={selectedChapter?.free_at || null}
      />
    </>
  );
};
