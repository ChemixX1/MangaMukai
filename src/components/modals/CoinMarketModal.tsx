import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Zap, Star, Flame, ArrowRight, Diamond, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import coinLogo from "../../assets/modals/coin.webp";
import { MANGAMUKAI_API } from "../../config/api";
import { useTheme } from "../../hooks/useTheme";
import { lockPageScroll } from "../../utils/scrollLock";
import { preloadImages } from "../../utils/preloadImages";


interface CoinPack {
  coins: number;
  price: number;
  label: string;
  icon: React.ElementType;
  special?: boolean;
}

import { getStoredToken, refreshUser } from "../../services/authService";

interface CoinMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  userId: string;
}

const COIN_PACKS: CoinPack[] = [
  { coins: 500, price: 5, label: "Basic", icon: Zap },
  { coins: 1000, price: 10, label: "Popular", icon: Star },
  { coins: 1500, price: 15, label: "Advanced", icon: Diamond },
  { coins: 2500, price: 25, label: "Elite", icon: Crown },
  { coins: 5000, price: 50, label: "Legendario", icon: Flame, special: true },
];

const PAYPAL_LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg";

export const CoinMarketModal = ({ isOpen, onClose, username }: Omit<CoinMarketModalProps, 'userId'> & { userId?: string }) => {
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void preloadImages([coinLogo]);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const releaseScroll = lockPageScroll();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedPack(null);
      setLoading(false);
      onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      releaseScroll();
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    setSelectedPack(null);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  const cardClass = `coin-pack-card group relative flex h-[136px] flex-col justify-between overflow-hidden rounded-xl border p-4 text-left backdrop-blur-md transition-all duration-300 hover:border-[#FF4D88] hover:shadow-[0_0_18px_rgba(255,77,136,0.2)] ${
    isLightMode ? 'border-black/10 bg-white/55' : 'border-white/15 bg-black/45'
  }`;

  const handlePayment = async () => {
    if (!selectedPack) return;
    setLoading(true);
    try {
      let token = getStoredToken();
      if (token) {
        await refreshUser();
        token = getStoredToken() || token;
      }
      if (!token) {
        alert("Debes iniciar sesión para comprar.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${MANGAMUKAI_API}/buy-coins`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: selectedPack.coins,
          cost: selectedPack.price,
          _token: token
        })
      });

      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        alert("Error: " + (data.message || "No se pudo generar el pago."));
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
      setLoading(false);
    }
  };

  return createPortal(
    <div className="coin-market-overlay fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl" onClick={handleClose}>
      <motion.div
        layout="size"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 28,
          layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        }}
        onClick={(event) => event.stopPropagation()}
        className={`coin-market-dialog ${selectedPack ? 'coin-market-dialog-checkout' : ''} relative flex h-[min(620px,calc(100dvh-2.5rem))] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border shadow-2xl transition-[height,background-color,border-color] md:h-[620px] md:flex-row md:rounded-3xl ${
          isLightMode ? 'border-black/10 bg-white' : 'border-white/10 bg-[#09090b]'
        }`}
      >
        {/* LADO IZQUIERDO (DECORATIVO) */}
        <div className={`coin-market-decor relative hidden w-[32%] flex-col justify-between overflow-hidden border-r md:flex ${
          isLightMode ? 'border-black/10 bg-zinc-100' : 'border-white/5 bg-[#050505]'
        }`}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[380%] h-[195%] z-0 pointer-events-none flex items-end justify-center">
  <img src={coinLogo} alt="" className="h-full w-auto object-contain object-bottom drop-shadow-[0_0_40px_rgba(255,77,136,0.15)]" loading="eager" decoding="async" />
</div>
          <div className={`pointer-events-none absolute inset-0 z-10 bg-gradient-to-t via-transparent ${
            isLightMode ? 'from-white to-white/80' : 'from-[#050505] to-[#050505]'
          }`} />
          <div className="relative z-20 p-6">
            <h2 className={`select-none text-xl font-[1000] uppercase italic tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>
              MANGA<span className="text-[#FF4D88]">MUKAI</span>
            </h2>
          </div>
          <div className="relative z-20 p-6">
            <div className={`rounded-r-xl border-y border-r border-l-4 border-l-[#FF4D88] py-2 pl-4 shadow-lg backdrop-blur-md ${isLightMode ? 'border-black/10 bg-white/55' : 'border-white/5 bg-black/50'}`}>
              <p className={`mb-1 text-[8px] font-black uppercase tracking-[0.25em] ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Recargando a</p>
              <p className={`truncate text-xl font-[1000] uppercase italic leading-none tracking-tighter drop-shadow-lg ${isLightMode ? 'text-black' : 'text-white'}`}>{username}</p>
            </div>
          </div>
        </div>

        {/* LADO DERECHO (CONTENIDO) */}
        <div className={`coin-market-panel relative flex h-full w-full flex-col transition-colors md:w-[68%] ${isLightMode ? 'bg-white' : 'bg-[#09090b]'}`}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden md:hidden">
            <img src={coinLogo} alt="" className="h-full w-full scale-125 object-cover object-center" loading="eager" decoding="async" />
            <div className={`absolute inset-0 backdrop-blur-[2px] ${isLightMode ? 'bg-white/[0.72]' : 'bg-black/[0.68]'}`} />
          </div>
          
          <div className="coin-market-header relative z-10 p-8 pb-2 flex justify-between items-start shrink-0">
            <h3 className={`flex items-center gap-2 pb-2 text-3xl font-[1000] uppercase italic tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>
              {selectedPack ? "Confirmar" : "Tienda de"} <span className="text-[#FF4D88]">{selectedPack ? "Compra" : "Poder"}</span>
            </h3>
            <button type="button" aria-label="Cerrar tienda de monedas" onClick={handleClose} className={`z-50 rounded-full p-2 transition-colors ${isLightMode ? 'bg-black/5 text-zinc-600 hover:bg-black/10 hover:text-black' : 'bg-white/10 text-zinc-300 hover:bg-white/15 hover:text-white'}`}>
              <X size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="coin-market-body relative z-10 p-8 pt-2 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait" initial={false}>
              
              {/* VISTA 1: GRID DE PACKS */}
              {!selectedPack && (
                <motion.div key="grid" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="coin-pack-grid grid grid-cols-2 gap-4 w-full max-w-[500px] mx-auto">
                  {COIN_PACKS.map((pack) => (
                    <button key={pack.coins} onClick={() => setSelectedPack(pack)} className={cardClass}>
                      <div className="absolute inset-0 bg-[#FF4D88] opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                      <div className="flex justify-between items-start mb-1 relative z-10 w-full">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <div className={`absolute inset-0 rounded-lg border bg-gradient-to-br shadow-lg transition-colors group-hover:border-[#FF4D88] ${isLightMode ? 'border-black/10 from-white/80 to-zinc-200/70' : 'border-white/10 from-zinc-800/80 to-black/80'}`}></div>
                          <pack.icon size={14} className="text-[#FF4D88] relative z-10" strokeWidth={2.5} />
                        </div>
                        <span className={`pt-1 text-[9px] font-black uppercase tracking-widest transition-colors ${isLightMode ? 'text-zinc-600 group-hover:text-black' : 'text-zinc-400 group-hover:text-white'}`}>{pack.label}</span>
                      </div>
                      <p className={`relative z-10 mb-1 text-3xl font-[1000] italic leading-none ${isLightMode ? 'text-black' : 'text-white'}`}>
                        {pack.coins} <span className={`ml-0.5 align-middle text-[9px] font-bold uppercase not-italic tracking-widest ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Coins</span>
                      </p>
                      <div className={`relative z-10 mt-auto flex w-full items-end justify-between border-t pt-3 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                        <span className="text-lg font-[1000] text-[#FF4D88] tracking-tight">${pack.price}.00</span>
                        <div className={`flex items-center gap-2 transition-colors ${isLightMode ? 'text-zinc-600 group-hover:text-black' : 'text-zinc-400 group-hover:text-white'}`}>
                          <span className="text-[8px] font-bold uppercase tracking-widest hidden sm:inline-block">Adquirir</span>
                          <div className={`rounded-full p-1 transition-colors group-hover:bg-[#FF4D88] group-hover:text-white ${isLightMode ? 'bg-black/5' : 'bg-white/10'}`}><ArrowRight size={12} strokeWidth={3} /></div>
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}

              {/* VISTA 2: FORMULARIO DE PAGO */}
              {selectedPack && (
                <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="coin-checkout w-full max-w-[400px] mx-auto flex flex-col gap-6">
                  
                  <div className={`coin-checkout-summary flex items-center justify-between rounded-xl border p-6 shadow-xl backdrop-blur-md ${isLightMode ? 'border-black/10 bg-white/55' : 'border-white/15 bg-black/45'}`}>
                    <div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Vas a comprar</p>
                      <p className={`flex items-center gap-2 text-3xl font-[1000] italic ${isLightMode ? 'text-black' : 'text-white'}`}>{selectedPack.coins} <span className="text-[#FF4D88]">COINS</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Total</p>
                      <p className={`text-2xl font-[1000] ${isLightMode ? 'text-black' : 'text-white'}`}>${selectedPack.price}.00</p>
                    </div>
                  </div>
                  
                  <div className="coin-paypal-zone relative z-50 min-h-[82px] flex flex-col justify-center">
                    <button
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full py-4 bg-[#0070BA] hover:bg-[#005ea6] text-white font-black uppercase tracking-[0.05em] text-sm rounded-xl border border-transparent transition-all flex items-center justify-center gap-3 group shadow-xl shadow-blue-900/20 disabled:opacity-50"
                    >
                      {loading ? (
                        <span>Conectando con PayPal...</span>
                      ) : (
                        <span className="flex items-center justify-center gap-2.5">
                          <span>Pagar con</span>
                          <span className="rounded-md bg-white px-2 py-1 shadow-sm">
                            <img src={PAYPAL_LOGO_URL} alt="PayPal" className="h-4 w-auto" loading="lazy" decoding="async" />
                          </span>
                        </span>
                      )}
                    </button>
                  </div>

                  <button onClick={() => setSelectedPack(null)} className={`coin-cancel-button -mt-2 flex items-center justify-center rounded-lg py-2 text-sm font-bold transition-all ${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'}`}>
                    Cancelar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-20 shrink-0 px-4 pb-4 pt-1 md:hidden">
            <div className={`rounded-r-xl border-y border-r border-l-4 border-l-[#FF4D88] px-4 py-2 shadow-lg backdrop-blur-md ${isLightMode ? 'border-black/10 bg-white/55' : 'border-white/10 bg-black/45'}`}>
              <p className={`mb-1 text-[8px] font-black uppercase tracking-[0.25em] ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Recargando a</p>
              <p className={`truncate text-lg font-[1000] uppercase italic leading-none tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>{username}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
