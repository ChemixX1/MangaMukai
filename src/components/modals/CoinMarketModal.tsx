import { useState } from "react";
import { X, Zap, Star, Flame, ArrowRight, Diamond, Crown, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import coinLogo from "../../assets/modals/coin.png";
import { MANGAMUKAI_API } from "../../config/api";


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

export const CoinMarketModal = ({ isOpen, onClose, username }: Omit<CoinMarketModalProps, 'userId'> & { userId?: string }) => {
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const cardClass = "coin-pack-card relative flex flex-col justify-between p-4 bg-[#02040a] border border-white/10 rounded-xl transition-all duration-300 group hover:border-[#FF4D88] hover:shadow-[0_0_15px_rgba(255,77,136,0.15)] overflow-hidden text-left h-[136px]";

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

  return (
    <div className="coin-market-overlay fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="coin-market-dialog relative bg-[#0F1115] w-full max-w-[720px] h-[95vh] max-h-[920px] flex flex-col md:flex-row rounded-none md:rounded-3xl overflow-hidden shadow-2xl border border-white/10"
      >
        {/* LADO IZQUIERDO (DECORATIVO) */}
        <div className="coin-market-decor hidden md:flex w-[32%] bg-[#050505] relative flex-col justify-between border-r border-white/5 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[380%] h-[195%] z-0 pointer-events-none flex items-end justify-center">
  <img src={coinLogo} alt="Coin Decor" className="h-full w-auto object-contain object-bottom drop-shadow-[0_0_40px_rgba(255,77,136,0.15)]" />
</div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] z-10 pointer-events-none" />
          <div className="relative z-20 p-6">
            <h2 className="text-xl font-[1000] tracking-tighter uppercase text-white italic select-none">
              MANGA<span className="text-[#FF4D88]">MUKAI</span>
            </h2>
          </div>
          <div className="relative z-20 p-6">
            <div className="backdrop-blur-md bg-black/50 border-l-4 border-[#FF4D88] pl-4 py-2 rounded-r-xl border-y border-r border-white/5 shadow-lg">
              <p className="text-zinc-400 text-[8px] font-black uppercase tracking-[0.25em] mb-1">Recargando a</p>
              <p className="text-xl font-[1000] text-white uppercase italic tracking-tighter truncate leading-none drop-shadow-lg">{username}</p>
            </div>
          </div>
        </div>

        {/* LADO DERECHO (CONTENIDO) */}
        <div className="coin-market-panel w-full md:w-[68%] bg-[#ffffff] relative flex flex-col h-full">
          
          <div className="coin-market-header p-8 pb-2 flex justify-between items-start shrink-0">
            <h3 className="text-3xl font-[1000] text-black uppercase italic tracking-tighter flex items-center gap-2 pb-2">
              {selectedPack ? "Confirmar" : "Tienda de"} <span className="text-[#FF4D88]">{selectedPack ? "Compra" : "Poder"}</span>
            </h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-black transition-colors bg-black/5 p-2 rounded-full hover:bg-black/10 z-50">
              <X size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="coin-market-body p-8 pt-2 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-center relative">
            <AnimatePresence mode="wait">
              
              {/* VISTA 1: GRID DE PACKS */}
              {!selectedPack && (
                <motion.div key="grid" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="coin-pack-grid grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[500px] mx-auto">
                  {COIN_PACKS.map((pack) => (
                    <button key={pack.coins} onClick={() => setSelectedPack(pack)} className={cardClass}>
                      <div className="absolute inset-0 bg-[#FF4D88] opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                      <div className="flex justify-between items-start mb-1 relative z-10 w-full">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black rounded-lg border border-white/10 group-hover:border-[#FF4D88] transition-colors shadow-lg"></div>
                          <pack.icon size={14} className="text-[#FF4D88] relative z-10" strokeWidth={2.5} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors pt-1">{pack.label}</span>
                      </div>
                      <p className="text-3xl font-[1000] italic leading-none text-white mb-1 relative z-10">
                        {pack.coins} <span className="text-[9px] not-italic font-bold text-zinc-600 uppercase tracking-widest ml-0.5 align-middle">Coins</span>
                      </p>
                      <div className="flex justify-between items-end relative z-10 w-full border-t border-white/5 pt-3 mt-auto">
                        <span className="text-lg font-[1000] text-[#FF4D88] tracking-tight">${pack.price}.00</span>
                        <div className="flex items-center gap-2 text-zinc-600 group-hover:text-white transition-colors">
                          <span className="text-[8px] font-bold uppercase tracking-widest hidden sm:inline-block">Adquirir</span>
                          <div className="bg-white/5 p-1 rounded-full group-hover:bg-[#FF4D88] group-hover:text-black transition-colors"><ArrowRight size={12} strokeWidth={3} /></div>
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}

              {/* VISTA 2: FORMULARIO DE PAGO */}
              {selectedPack && (
                <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="coin-checkout w-full max-w-[400px] mx-auto flex flex-col gap-6">
                  
                  <div className="coin-checkout-summary bg-[#02040a] border border-white/10 rounded-xl p-6 flex items-center justify-between shadow-xl">
                    <div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Vas a comprar</p>
                      <p className="text-3xl font-[1000] italic text-white flex items-center gap-2">{selectedPack.coins} <span className="text-[#FF4D88]">COINS</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Total</p>
                      <p className="text-2xl font-[1000] text-white">${selectedPack.price}.00</p>
                    </div>
                  </div>
                  
                  <div className="coin-paypal-zone relative z-50 min-h-[100px] flex flex-col justify-center">
                    <button
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full py-4 bg-[#0070BA] hover:bg-[#005ea6] text-white font-black uppercase tracking-[0.05em] text-sm rounded-xl border border-transparent transition-all flex items-center justify-center gap-3 group shadow-xl shadow-blue-900/20 disabled:opacity-50"
                    >
                      <span>{loading ? "Conectando con PayPal..." : "Pagar con PayPal"}</span>
                    </button>
                  </div>

                  <button onClick={() => setSelectedPack(null)} className="text-zinc-500 hover:text-black text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 py-2 hover:bg-black/5 rounded-lg transition-all mt-2">
                    <ArrowLeft size={14} /> Cancelar Operación
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
