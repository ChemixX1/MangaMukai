import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Crown, Headphones, Loader2, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import subscriptionBg from "../../assets/modals/subscription-bg.webp";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { getStoredToken, startSubscriptionPayment } from "../../services/authService";
import { lockPageScroll } from "../../utils/scrollLock";
import { preloadImages } from "../../utils/preloadImages";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isLightMode = theme === 'light';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void preloadImages([subscriptionBg]);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const releaseScroll = lockPageScroll();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setError(null);
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
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleSubscription = async () => {
    if (loading) return;

    // Sin sesión no hay pago posible: se pasa por el login y se vuelve aquí.
    if (!getStoredToken()) {
      handleClose();
      navigate('/auth/login', {
        state: { returnTo: `${window.location.pathname}${window.location.search}` },
      });
      return;
    }

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

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            onClick={handleClose}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xl"
          />

          <div className="pointer-events-none fixed inset-0 z-[301] flex items-center justify-center p-3 sm:p-5">
            <motion.div
              key="payment-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className={`pointer-events-auto relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-y-auto rounded-3xl border shadow-2xl transition-colors md:h-[520px] md:flex-row md:overflow-hidden ${
                isLightMode ? 'border-black/10 bg-white' : 'border-white/10 bg-[#09090b]'
              }`}
            >
                <div className={`pointer-events-none absolute inset-0 bg-[size:20px_20px] ${isLightMode ? 'opacity-30 bg-[linear-gradient(45deg,rgba(0,0,0,0.08)_1px,transparent_1px)]' : 'opacity-10 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_1px,transparent_1px)]'}`}></div>

                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden md:hidden">
                  <img
                    src={subscriptionBg}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    draggable={false}
                  />
                  <div className={`absolute inset-0 ${isLightMode ? 'bg-white/80' : 'bg-[#08080b]/75'}`} />
                </div>

                <button 
                  type="button"
                  aria-label="Cerrar modal de suscripción"
                  onClick={handleClose}
                  className={`absolute right-4 top-4 z-50 rounded-full border p-2 backdrop-blur-md transition-colors ${isLightMode ? 'border-black/10 bg-white/60 text-zinc-600 hover:bg-white/90 hover:text-black' : 'border-white/10 bg-black/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                >
                  <X size={20} />
                </button>

                {/* COLUMNA 1: GRATUITO */}
                <div className={`relative z-10 flex h-auto w-full shrink-0 flex-col justify-center border-b bg-transparent px-6 pb-8 pt-6 md:h-full md:w-5/12 md:overflow-visible md:border-b-0 md:border-r md:p-6 md:backdrop-blur-md ${isLightMode ? 'border-black/10 md:bg-white/65' : 'border-white/10 md:bg-zinc-900/55'}`}>
                  <div className="flex flex-col h-full justify-center">
                    <h2 className={`mb-2 text-xl font-black uppercase italic tracking-tighter md:mb-3 md:text-2xl ${isLightMode ? 'text-black' : 'text-white'}`}>
                      Tu Nivel <br/>
                      <span className={isLightMode ? 'text-zinc-500' : 'text-zinc-400'}>Actual</span>
                    </h2>
                    <p className={`mb-4 hidden text-xs font-medium leading-relaxed md:block ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Disfruta de MangaMukai gratis.
                    </p>
                    <div className={`relative rounded-2xl border p-4 md:backdrop-blur-md ${isLightMode ? 'border-black/10 bg-white/55' : 'border-white/15 bg-black/45'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`rounded-lg p-2 ${isLightMode ? 'bg-black/5 text-zinc-600' : 'bg-white/10 text-zinc-300'}`}>
                          <UserIcon size={16} />
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-black' : 'text-white'}`}>Plan Gratuito</h4>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        <FeatureItem text="Acceso a la biblioteca" active={true} isLightMode={isLightMode} />
                        <FeatureItem text="Comentarios" active={true} isLightMode={isLightMode} />
                        <FeatureItem text="Rango 'Kouhai'" active={true} isLightMode={isLightMode} />
                        <FeatureItem text="Música / Soundtracks" active={false} isLightMode={isLightMode} />
                      </ul>
                    </div>
                  </div>
                </div>

                {/* COLUMNA 2: PRO */}
                <div className={`custom-scrollbar relative z-10 w-full flex-1 overflow-y-auto bg-transparent md:w-7/12 md:backdrop-blur-md ${isLightMode ? 'md:bg-white' : 'md:bg-black'}`}>
                  <div className="absolute inset-0 z-0 hidden md:block">
                    <img src={subscriptionBg} alt="" className="h-full w-full object-cover" loading="eager" decoding="async" />
                    <div className={`absolute inset-0 ${isLightMode ? 'bg-white/75' : 'bg-zinc-900/80'}`}></div>
                  </div>

                  <div className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 pb-7 pt-8 md:p-8">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-2xl font-black uppercase italic tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>
                        Mukai <span className="text-[#FF4D88]">PRO</span>
                      </h3>
                      <div className="ml-auto flex items-center gap-2">
                        <div className="flex shrink-0 items-baseline gap-1 md:hidden">
                          <span className={`text-[28px] font-black leading-none tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>$4.99</span>
                          <span className="text-[13px] font-bold text-zinc-500">/mes</span>
                        </div>
                        <div className="hidden items-center gap-1.5 rounded-full border border-[#FF4D88]/20 bg-[#FF4D88]/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#FF4D88] md:inline-flex">
                          <Star size={10} fill="currentColor" /> Best
                        </div>
                      </div>
                    </div>
                    
                    <div className={`mb-4 hidden items-baseline gap-2 border-b pb-4 md:flex ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                      <span className={`text-3xl font-black tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>$4.99</span>
                      <span className="text-zinc-500 font-bold text-sm">/mes</span>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex flex-col h-full"
                    >
                      <div className="mb-7 space-y-4 md:mb-6 md:space-y-3">
                        <PremiumFeature icon={<Headphones size={16} />} title="Soundtracks Inmersivos" desc="Música integrada mientras lees." highlight={true} isLightMode={isLightMode} />
                        <PremiumFeature icon={<Crown size={16} />} title="Insignia Exclusiva" desc="Rango dorado en tu perfil." highlight={true} isLightMode={isLightMode} />
                      </div>

                      <div className="mt-auto pb-4 md:pb-0">
                        <button
                          onClick={handleSubscription}
                          disabled={loading}
                          className={`group flex w-full items-center justify-center gap-3 rounded-xl border border-transparent py-3.5 text-xs font-black uppercase tracking-[0.05em] shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60 ${isLightMode ? 'bg-[#FF4D88] text-white shadow-[#FF4D88]/20 hover:bg-[#e13c75]' : 'bg-white text-black shadow-white/10 hover:bg-[#FF4D88] hover:text-white'}`}
                        >
                          {loading && <Loader2 size={14} className="animate-spin" />}
                          {loading ? (
                            <span>Procesando...</span>
                          ) : (
                            <span className="flex items-center justify-center gap-0.5">
                              <span>Vuélvete Premium</span>
                              <span aria-hidden="true" className="inline-block text-base leading-none">
                                😎
                              </span>
                            </span>
                          )}
                        </button>

                        {error && (
                          <p className="text-center text-[10px] text-red-400 mt-2 font-bold">
                            {error}
                          </p>
                        )}

                        <p className={`subscription-modal-note mt-2 text-center text-[10px] ${isLightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>
                          Sin compromisos - Cancela cuando quieras
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

const FeatureItem = ({ text, active, isLightMode }: { text: string, active: boolean, isLightMode: boolean }) => (
  <li className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide ${active ? (isLightMode ? 'text-zinc-700' : 'text-zinc-300') : (isLightMode ? 'text-zinc-400' : 'text-zinc-600')}`}>
    <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${active ? (isLightMode ? 'border-zinc-300 bg-zinc-200 text-black' : 'border-zinc-700 bg-zinc-800 text-white') : (isLightMode ? 'border-zinc-300 bg-transparent text-zinc-400' : 'border-zinc-700 bg-transparent text-zinc-600')}`}>
      {active ? <Check size={8} strokeWidth={4} /> : <X size={8} strokeWidth={4} />}
    </div>
    {text}
  </li>
);

const PremiumFeature = ({ icon, title, desc, highlight = false, isLightMode }: { icon: React.ReactNode, title: string, desc: string, highlight?: boolean, isLightMode: boolean }) => (
  <div className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors md:backdrop-blur-md ${highlight ? (isLightMode ? 'border-[#FF4D88]/25 bg-white/50' : 'border-[#FF4D88]/25 bg-black/35') : 'border-transparent bg-transparent'}`}>
    <div className={`p-2 rounded-lg ${highlight ? 'bg-[#FF4D88] text-white' : 'bg-zinc-800 text-zinc-400'}`}>
      {icon}
    </div>
    <div>
      <h4 className={`mb-1 text-xs font-black uppercase leading-none tracking-wide ${isLightMode ? 'text-black' : (highlight ? 'text-white' : 'text-zinc-300')}`}>
        {title}
      </h4>
      <p className={`text-[10px] font-medium leading-none ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{desc}</p>
    </div>
  </div>
);

const UserIcon = ({size}:{size:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

