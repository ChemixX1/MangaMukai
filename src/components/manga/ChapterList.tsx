import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListMusic, Lock, Unlock, Coins, Clock, ChevronDown, ChevronUp, Layers, Zap, CheckCircle2 } from "lucide-react";
import { CoinMarketModal, PurchaseModal } from "../modals";
import { Countdown } from "../common";
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
}

export const ChapterList = ({ chapters, purchasedChapterIds, userCoins, userInfo, onPurchaseSuccess }: ChapterListProps) => {
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

  const visibleChapters = showAll ? chapters : chapters.slice(0, 5);

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
      <div className="w-[94%] mx-auto mb-32 relative z-20">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 border-b border-white/5 pb-4 gap-4 md:gap-0">
          <h3 className="text-xl font-black italic uppercase text-white flex items-center gap-3 tracking-tighter border-l-2 border-pink-600 pl-4">
            <ListMusic size={20} className="text-pink-500" /> Capítulos
          </h3>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111] border border-white/5">
              <Layers size={12} className="text-white/40" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                {totalChapters} Cap.
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
              <Zap size={12} className="text-yellow-500" />
              <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider whitespace-nowrap">
                {paidChapters} Pago
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <Unlock size={12} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                {purchasedChapters} Comprado
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider whitespace-nowrap">
                {freeChapters} Gratis
              </span>
            </div>
          </div>
        </div>

        {/* LISTA */}
        <div className="bg-[#0A0A0A] border-y border-white/5">
          <div className="hidden md:grid grid-cols-12 bg-[#111] py-3 px-4 text-[9px] uppercase font-bold text-white/30 tracking-[0.2em]">
            <div className="col-span-1">Nro</div>
            <div className="col-span-5">Título</div>
            <div className="col-span-4 text-center">Estado</div>
            <div className="col-span-2 text-right">Acceso</div>
          </div>

          <div className="flex flex-col">
            {visibleChapters.map((chapter) => {
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
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : statusLabel === "Gratis"
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";

              return (
                <div
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter)}
                  className={`
                          flex flex-col md:grid md:grid-cols-12 
                          px-4 py-4 md:py-3.5 
                          border-b border-white/[0.03] 
                          transition-colors duration-200 group 
                          items-start md:items-center 
                          text-sm cursor-pointer
                          ${locked
                      ? 'hover:bg-red-500/[0.02] opacity-90 hover:opacity-100'
                      : 'hover:bg-white/[0.02]'
                    }
                        `}
                >
                  {/* Contenido Fila */}
                  <div className="flex w-full justify-between items-center md:contents">
                    <div className="md:col-span-1 font-mono font-bold text-pink-600 group-hover:text-pink-500 transition-colors text-xs md:text-sm mb-1 md:mb-0">
                      <span className="text-white/30 mr-1 md:hidden">Cap</span>
                      <span className="text-xs opacity-50 mr-0.5 hidden md:inline">#</span>{chapter.chapter_number}
                    </div>

                    <div className="md:col-span-5 text-gray-400 group-hover:text-gray-200 font-medium truncate w-full pl-2 md:pl-0 text-left">
                      {chapter.title || "Sin título"}
                    </div>

                    <div className="md:hidden pl-2 flex items-center gap-1.5">
                      {locked ? (
                        <Lock size={14} className="text-white/40" />
                      ) : (
                        isPurchased ? <Unlock size={14} className="text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      )}
                      {!locked && (
                        <span className={`text-[9px] font-black uppercase tracking-wider ${isPurchased ? 'text-emerald-400' : 'text-emerald-500'}`}>
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
                          <Coins size={10} /> {chapter.price_coins}
                        </span>
                        <Lock size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
                      </>
                    ) : (
                      <>
                        {isPurchased ? (
                          <span className="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                            <Unlock size={12} /> Comprado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                            <CheckCircle2 size={12} /> Gratis
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
                        <span className={isPurchased ? "text-emerald-400" : "text-emerald-500"}>{statusLabel}</span>
                      ) : (
                        <span>{new Date(chapter.created_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    {locked && (
                      <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-bold bg-yellow-500/10 px-2 py-0.5 rounded">
                        <Coins size={10} /> {chapter.price_coins}
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
              className="w-full py-4 bg-[#111] hover:bg-[#161616] text-white/40 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest border-t border-white/5"
            >
              {showAll ? (<> <ChevronUp size={14} /> Mostrar Menos </>) : (<> <ChevronDown size={14} /> Mostrar Todos ({totalChapters - 5} más) </>)}
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
