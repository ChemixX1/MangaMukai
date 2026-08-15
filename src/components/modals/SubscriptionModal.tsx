import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Crown, Headphones, Loader2, Star } from "lucide-react";
import React, { useState } from "react";
import modalBgHombre from "../../assets/modals/auth-register.webp";
import { startSubscriptionPayment } from "../../services/authService";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscription = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    const result = await startSubscriptionPayment('monthly');
    if (result.success && result.url) {
      window.location.href = result.url;
      return;
    }

    setError(result.message || "No se pudo generar el pago.");
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-md"
          />

          <motion.div
              key="payment-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto z-[101] w-[95%] md:w-full max-w-3xl h-[85vh] md:h-[550px] flex items-center justify-center pointer-events-none"
            >
              <div className="w-full h-full bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden relative flex flex-col md:flex-row shadow-2xl pointer-events-auto">
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-zinc-800 border border-white/10 rounded-full text-zinc-400 hover:text-white transition-colors backdrop-blur-md"
                >
                  <X size={20} />
                </button>

                {/* COLUMNA 1: GRATUITO */}
                <div className="w-full md:w-5/12 p-6 flex flex-col justify-center bg-zinc-900/50 border-b md:border-b-0 md:border-r border-white/5 relative z-10 overflow-y-auto md:overflow-visible shrink-0 h-auto md:h-full">
                  <div className="flex flex-col h-full justify-center">
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter mb-2 md:mb-3">
                      Tu Nivel <br/>
                      <span className="text-zinc-500">Actual</span>
                    </h2>
                    <p className="text-zinc-400 text-xs font-medium leading-relaxed mb-4 hidden md:block">
                      Disfruta de MangaMukai gratis.
                    </p>
                    <div className="bg-black border border-white/10 rounded-2xl p-4 relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                          <UserIcon size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-white uppercase tracking-wider text-xs">Plan Gratuito</h4>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        <FeatureItem text="Acceso al catálogo" active={true} />
                        <FeatureItem text="Comentarios" active={true} />
                        <FeatureItem text="Rango 'Kouhai'" active={true} />
                        <FeatureItem text="Música / Soundtracks" active={false} />
                      </ul>
                    </div>
                  </div>
                </div>

                {/* COLUMNA 2: PRO */}
                <div className="w-full md:w-7/12 relative flex-1 bg-black overflow-y-auto custom-scrollbar">
                  <div className="absolute inset-0 z-0">
  <img src={modalBgHombre} alt="Background" className="w-full h-full object-cover" />
  <div className="absolute inset-0 bg-zinc-900/80"></div>
</div>

                  <div className="relative z-10 flex flex-col min-h-full justify-center p-6 md:p-8 max-w-md mx-auto w-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                        Mukai <span className="text-[#FF4D88]">PRO</span>
                      </h3>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF4D88]/10 border border-[#FF4D88]/20 text-[#FF4D88] text-[9px] font-black uppercase tracking-widest rounded-full">
                        <Star size={10} fill="currentColor" /> Best
                      </div>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-4 border-b border-white/10 pb-4">
                      <span className="text-3xl font-black text-white tracking-tighter">$4.99</span>
                      <span className="text-zinc-500 font-bold text-sm">/mes</span>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex flex-col h-full"
                    >
                      <div className="space-y-3 mb-6">
                        <PremiumFeature icon={<Headphones size={16} />} title="Soundtracks Inmersivos" desc="Música integrada mientras lees." highlight={true} />
                        <PremiumFeature icon={<Crown size={16} />} title="Insignia Exclusiva" desc="Rango dorado en tu perfil." highlight={true} />
                      </div>

                      <div className="mt-auto pb-4 md:pb-0">
                        <button
                          onClick={handleSubscription}
                          disabled={loading}
                          className="w-full py-3.5 bg-white hover:bg-[#FF4D88] hover:text-white text-black font-black uppercase tracking-[0.05em] text-xs rounded-xl border border-transparent transition-all flex items-center justify-center gap-3 group shadow-lg shadow-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {loading && <Loader2 size={14} className="animate-spin" />}
                          <span>{loading ? "Procesando..." : "Obtener Premium"}</span>
                        </button>

                        {error && (
                          <p className="text-center text-[10px] text-red-400 mt-2 font-bold">
                            {error}
                          </p>
                        )}

                        <p className="text-center text-[9px] text-zinc-300 mt-2 font-mono uppercase tracking-widest">
                          Sin compromisos • Cancela cuando quieras
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const FeatureItem = ({ text, active }: { text: string, active: boolean }) => (
  <li className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide ${active ? 'text-zinc-300' : 'text-zinc-700 decoration-zinc-800'}`}>
    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${active ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-800 bg-transparent text-zinc-800'}`}>
      {active ? <Check size={8} strokeWidth={4} /> : <X size={8} strokeWidth={4} />}
    </div>
    {text}
  </li>
);

const PremiumFeature = ({ icon, title, desc, highlight = false }: { icon: React.ReactNode, title: string, desc: string, highlight?: boolean }) => (
  <div className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${highlight ? 'bg-[#FF4D88]/5 border-[#FF4D88]/20' : 'bg-transparent border-transparent'}`}>
    <div className={`p-2 rounded-lg ${highlight ? 'bg-[#FF4D88] text-white' : 'bg-zinc-800 text-zinc-400'}`}>
      {icon}
    </div>
    <div>
      <h4 className={`text-xs font-black uppercase tracking-wide leading-none mb-1 ${highlight ? 'text-white' : 'text-zinc-300'}`}>
        {title}
      </h4>
      <p className="text-[10px] text-zinc-400 font-medium leading-none">{desc}</p>
    </div>
  </div>
);

const UserIcon = ({size}:{size:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

