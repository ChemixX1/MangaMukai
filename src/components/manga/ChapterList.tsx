import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { CoinMarketModal, PurchaseModal } from "../modals";
import {
  Countdown,
  DetailBook3DIcon,
  DetailCoin3DIcon,
  DetailPurchasedIcon,
  DetailTicket3DIcon,
} from "../common";
import { buyChapter } from "../../services/authService";

export interface Chapter {
  id: number | string;
  chapter_number: number;
  title: string;
  created_at: string;
  is_paid: boolean;
  price_coins: number;
  free_at: string | null;
}

interface ChapterListProps {
  chapters: Chapter[];
  purchasedChapterIds: Set<string>;
  userCoins: number;
  userInfo: { id: string; username: string };
  onPurchaseSuccess: () => void;
  isLight?: boolean;
}

export const ChapterList = ({ chapters, purchasedChapterIds, userCoins, userInfo, onPurchaseSuccess, isLight = false }: ChapterListProps) => {
  const navigate = useNavigate();

  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [localUnlocked, setLocalUnlocked] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const now = new Date();
  const isChapterPurchased = (chapter: Chapter) => {
    const idStr = String(chapter.id);
    return purchasedChapterIds.has(idStr) || localUnlocked.has(idStr);
  };

  const totalChapters = chapters.length;
  const freeChapters = chapters.filter(c => !c.is_paid || (!!c.free_at && new Date(c.free_at) <= now)).length;
  const purchasedChapters = chapters.filter(isChapterPurchased).length;
  const paidChapters = totalChapters - freeChapters;

  const orderedChapters = [...chapters].sort((a, b) => {
    const chapterDifference = Number(b.chapter_number) - Number(a.chapter_number);
    if (chapterDifference !== 0) return chapterDifference;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const visibleChapters = showAll ? orderedChapters : orderedChapters.slice(0, 5);

  const isChapterLocked = (chapter: Chapter) => {
    if (!chapter.is_paid) return false;
    if (chapter.free_at && new Date(chapter.free_at) <= new Date()) return false;

    if (isChapterPurchased(chapter)) {
      return false;
    }
    return true;
  };

  // --- LÓGICA DE CLIC ---
  const handleChapterClick = (chapter: Chapter) => {
    const locked = isChapterLocked(chapter);

    // Si el capítulo es GRATUITO → entrar directamente, sin login
    if (!locked) {
      navigate(`/read/${chapter.id}`);
      return;
    }

    // El capítulo es de PAGO → necesita sesión
    if (!userInfo.id) {
      // Sin sesión → llevar a la página de acceso y regresar después al manga.
      navigate('/auth/login', {
        state: { returnTo: `${window.location.pathname}${window.location.search}` },
      });
      return;
    }

    // Con sesión y capítulo bloqueado → mostrar modal de compra
    setSelectedChapter(chapter);
    setIsModalOpen(true);
  };


  const handleConfirmPurchase = async () => {
    if (!selectedChapter) return;
    setIsProcessing(true);
    try {
      const result = await buyChapter(selectedChapter.id);
      if (result.success) {
        setLocalUnlocked(prev => new Set(prev).add(String(selectedChapter.id)));
        onPurchaseSuccess();
        setIsModalOpen(false);
        navigate(`/read/${selectedChapter.id}`);
      } else if (result.message.includes("saldo") || result.message.includes("insuficiente")) {
        alert("Saldo insuficiente. Recarga tus monedas en mangamukai.com");
        setIsModalOpen(false);
      } else {
        alert("Error: " + (result.message || "No se pudo comprar"));
      }
    } catch (err: unknown) {
      console.error("Error comprando:", err);
      alert("Error técnico al procesar la compra.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className={`manga-chapter-list relative z-20 w-full ${isLight ? 'is-light' : 'is-dark'}`}>

        {/* HEADER */}
        <div className="manga-chapter-header mb-7 flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-5 md:flex-row md:items-end">
          <h2 className="manga-chapter-heading flex items-center gap-3 text-xl font-black uppercase italic tracking-tight text-white md:text-2xl">
            <span className="h-8 w-1 rounded-full bg-[#FF4D88] shadow-[0_0_18px_rgba(255,77,136,0.6)]" />
            <DetailBook3DIcon
              size={31}
              className="h-[31px] w-[31px] object-contain drop-shadow-[0_7px_9px_rgba(255,77,136,0.3)]"
              style={{ filter: 'grayscale(1) sepia(1) saturate(12) hue-rotate(300deg) brightness(1.04)' }}
            /> Capítulos
          </h2>

          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
            <div className="manga-chapter-stat manga-chapter-stat-total flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2">
              <DetailBook3DIcon
                size={23}
                className="h-[23px] w-[23px] object-contain"
                style={{ filter: 'grayscale(1) sepia(1) saturate(12) hue-rotate(300deg) brightness(1.04)' }}
              />
              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider">
                {totalChapters} Cap.
              </span>
            </div>
            <div className="manga-chapter-stat manga-chapter-stat-paid flex items-center gap-1.5 rounded-lg border border-yellow-500/15 bg-yellow-500/[0.06] px-3 py-2">
              <DetailCoin3DIcon size={23} className="h-[23px] w-[23px] object-contain" />
              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider">
                {paidChapters} Pago
              </span>
            </div>
            <div className="manga-chapter-stat manga-chapter-stat-free flex items-center gap-1.5 rounded-lg border border-[#FF4D88]/20 bg-[#FF4D88]/[0.07] px-3 py-2">
              <DetailTicket3DIcon size={23} className="h-[23px] w-[23px] object-contain" />
              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider">
                {freeChapters} Gratis
              </span>
            </div>
            <div className="manga-chapter-stat manga-chapter-stat-purchased flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2">
              <DetailPurchasedIcon size={16} />
              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider">
                {purchasedChapters} Comprado
              </span>
            </div>
          </div>
        </div>

        {/* LISTA */}
        <div className="manga-chapter-surface overflow-hidden rounded-2xl border border-white/[0.07] bg-black shadow-[0_20px_55px_rgba(0,0,0,0.25)]">
          <div className="manga-chapter-table-head hidden grid-cols-12 border-b border-white/[0.06] bg-white/[0.035] px-5 py-4 text-[11px] font-semibold md:grid">
            <div className="col-span-1">Nro</div>
            <div className="col-span-5">Título</div>
            <div className="col-span-4 text-center">Estado</div>
            <div className="col-span-2 text-right">Acceso</div>
          </div>

          <div className="flex flex-col">
            {totalChapters === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
                <DetailBook3DIcon
                  size={42}
                  className="h-[42px] w-[42px] object-contain opacity-45"
                  style={{ filter: 'grayscale(1) sepia(1) saturate(12) hue-rotate(300deg) brightness(1.04)' }}
                />
                <p className="text-xs font-semibold text-white/35">Sin capítulos disponibles</p>
              </div>
            ) : visibleChapters.map((chapter) => {
              const locked = isChapterLocked(chapter);
              const isPurchased = isChapterPurchased(chapter);
              const isFutureFree = !!chapter.free_at && new Date(chapter.free_at) > new Date();
              const isExpiredFree = !!chapter.free_at && new Date(chapter.free_at) <= new Date();
              const statusLabel = isPurchased
                ? "Comprado"
                : (!chapter.is_paid || isExpiredFree)
                  ? "Gratis"
                  : "Premium";
              const statusClass = isPurchased
                ? "text-gray-400 bg-white/[0.045] border-white/10"
                : statusLabel === "Gratis"
                  ? "text-[#FF4D88] bg-[#FF4D88]/10 border-[#FF4D88]/20"
                  : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";

              return (
                <div
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter)}
                  className={`manga-chapter-row
                          flex flex-col md:grid md:grid-cols-12 
                          px-4 py-4 md:px-5 md:py-4
                          border-b border-white/[0.045] last:border-b-0
                          transition-all duration-200 group
                          items-start md:items-center 
                          text-sm cursor-pointer
                          ${locked ? 'opacity-90 hover:opacity-100' : ''}
                        `}
                >
                  {/* Contenido Fila */}
                  <div className="flex w-full justify-between items-center md:contents">
                    <div className="md:col-span-1 font-mono font-bold text-pink-600 group-hover:text-pink-500 transition-colors text-xs md:text-sm mb-1 md:mb-0">
                      <span className="text-white/30 mr-1 md:hidden">Cap</span>
                      <span className="text-xs opacity-50 mr-0.5 hidden md:inline">#</span>{chapter.chapter_number}
                    </div>

                    <div className="manga-chapter-row-title w-full truncate pl-2 text-left text-gray-400 transition-colors group-hover:text-white md:col-span-5 md:pl-0">
                      {chapter.title || "Sin título"}
                    </div>

                    <div className="md:hidden pl-2 flex items-center gap-1.5">
                      {locked ? (
                        <Lock size={14} className="text-white/40" />
                      ) : (
                        isPurchased ? <DetailPurchasedIcon size={15} className="text-gray-400" /> : null
                      )}
                      {!locked && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${isPurchased ? 'text-gray-400' : 'text-[#FF4D88]'}`}>
                          {!isPurchased && <DetailTicket3DIcon size={14} className="h-[14px] w-[14px] object-contain" />}
                          {statusLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:flex col-span-4 justify-center items-center">
                    {locked && isFutureFree ? (
                      <div className="flex items-center gap-1.5 text-pink-400 bg-pink-500/10 px-2 py-1 rounded border border-pink-500/20">
                        <Clock size={10} />
                        <Countdown targetDate={chapter.free_at!} />
                      </div>
                    ) : (
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded border ${statusClass}`}>
                        {statusLabel}
                      </span>
                    )}
                  </div>

                  <div className="hidden md:flex col-span-2 text-right justify-end items-center gap-3">
                    {locked ? (
                      <>
                        <span className="font-mono font-bold text-xs flex items-center gap-1.5 text-yellow-400 bg-yellow-400/5 px-2 py-0.5 rounded">
                          <DetailCoin3DIcon size={18} className="h-[18px] w-[18px] object-contain" /> {chapter.price_coins}
                        </span>
                        <Lock size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
                      </>
                    ) : (
                      <>
                        {isPurchased ? (
                          <span className="inline-flex items-center gap-1.5 rounded bg-white/[0.045] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                            <DetailPurchasedIcon size={14} /> Comprado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded bg-[#FF4D88]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FF4D88]">
                            <DetailTicket3DIcon size={17} className="h-[17px] w-[17px] object-contain" />
                            Gratis
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Info Móvil */}
                  <div className="md:hidden w-full flex justify-between items-center mt-2 pl-8">
                    <div className="text-[10px] text-white/30 font-mono">
                      {locked && isFutureFree ? (
                        <div className="flex items-center gap-1 text-pink-400">
                          <Clock size={10} /> Gratis en: <Countdown targetDate={chapter.free_at!} />
                        </div>
                      ) : !locked ? (
                        <span className={`inline-flex items-center gap-1 ${isPurchased ? "text-gray-400" : "text-[#FF4D88]"}`}>
                          {!isPurchased && <DetailTicket3DIcon size={14} className="h-[14px] w-[14px] object-contain" />}
                          {statusLabel}
                        </span>
                      ) : (
                        <span>{new Date(chapter.created_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    {locked && (
                      <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-bold bg-yellow-500/10 px-2 py-0.5 rounded">
                        <DetailCoin3DIcon size={18} className="h-[18px] w-[18px] object-contain" /> {chapter.price_coins}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalChapters > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="manga-chapter-toggle flex w-full items-center justify-center gap-2 border-t border-white/[0.06] bg-white/[0.025] py-4 text-xs font-semibold text-white/40 transition-all duration-300 hover:bg-[#FF4D88]/10 hover:text-[#FF4D88]"
            >
              {showAll ? (<> <ChevronUp size={14} /> Mostrar menos </>) : (<> <ChevronDown size={14} /> Mostrar todos </>)}
            </button>
          )}
        </div>
      </div>

      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmPurchase}
        onRecharge={() => {
          setIsModalOpen(false);
          setIsCoinModalOpen(true);
        }}
        chapterTitle={selectedChapter?.title || `Capítulo ${selectedChapter?.chapter_number}`}
        price={selectedChapter?.price_coins || 0}
        userBalance={userCoins}
        loading={isProcessing}
        freeAt={selectedChapter?.free_at || null}
      />

      <CoinMarketModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        username={userInfo?.username || ''}
        userId={userInfo?.id || ''}
      />
    </>
  );
};
