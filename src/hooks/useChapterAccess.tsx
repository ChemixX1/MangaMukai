import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PurchaseModal } from '../components/modals';
import { buyChapter, getStoredToken, getUnlockedChapters, refreshUser } from '../services/authService';
import { getChaptersBySeries } from '../services/mangaService';

interface OpenChapterOptions {
  chapterId: string | number;

  seriesId?: string | number | null;
  isFree: boolean;
  chapterNumber?: string | number;
}

interface PendingPurchase {
  chapterId: string | number;
  chapterNumber: string | number;
  price: number;
  freeAt: string | null;
}

export const useChapterAccess = () => {
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingPurchase | null>(null);
  const [coins, setCoins] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const openChapter = useCallback(async ({ chapterId, seriesId, isFree, chapterNumber }: OpenChapterOptions) => {
    const readerPath = `/read/${chapterId}`;

    if (isFree) {
      navigate(readerPath);
      return;
    }

    if (!getStoredToken()) {
      navigate('/auth/login', { state: { returnTo: readerPath } });
      return;
    }

    if (preparing) return;
    setPreparing(true);
    try {
      const unlocked = await getUnlockedChapters().catch(() => new Set<string>());
      if (unlocked.has(String(chapterId))) {
        navigate(readerPath);
        return;
      }

      const [user, chapters] = await Promise.all([
        refreshUser().catch(() => null),
        seriesId ? getChaptersBySeries(seriesId).catch(() => []) : Promise.resolve([]),
      ]);
      const detail = chapters.find((chapter) => String(chapter.id) === String(chapterId));

      setCoins(user?.coins || 0);
      setPending({
        chapterId,
        chapterNumber: detail?.chapter_number ?? chapterNumber ?? '',
        price: detail?.price_coins ?? 0,
        freeAt: detail?.free_at ?? null,
      });
    } finally {
      setPreparing(false);
    }
  }, [navigate, preparing]);

  const confirmPurchase = async () => {
    if (!pending) return;
    setProcessing(true);
    try {
      const result = await buyChapter(pending.chapterId);
      if (result.success) {
        setPending(null);
        navigate(`/read/${pending.chapterId}`);
        return;
      }
      window.alert(result.message || 'No se pudo completar la compra.');
    } catch {
      window.alert('Error técnico al procesar la compra.');
    } finally {
      setProcessing(false);
    }
  };

  const chapterAccessModal = (
    <PurchaseModal
      isOpen={pending !== null}
      onClose={() => setPending(null)}
      onConfirm={() => void confirmPurchase()}
      onRecharge={() => {
        setPending(null);
        navigate('/recargar', { state: { returnTo: `${window.location.pathname}${window.location.search}` } });
      }}
      chapterNumber={pending?.chapterNumber ?? ''}
      price={pending?.price ?? 0}
      userBalance={coins}
      loading={processing}
      freeAt={pending?.freeAt ?? null}
    />
  );

  return { openChapter, chapterAccessModal };
};
