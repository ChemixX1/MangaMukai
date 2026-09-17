import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Headphones, Loader2, MessagesSquare, UserRoundPen, X } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { getStoredToken, startSubscriptionPayment } from "../../services/authService";
import { lockPageScroll } from "../../utils/scrollLock";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRICE = "$4.99";

/* Beneficios PRO: título en Montserrat semibold, descripción en Glacial Indifference regular. */
const BENEFITS: Array<{ icon: ComponentType<{ size?: number; strokeWidth?: number }>; title: string; desc: string }> = [
  { icon: Headphones, title: "Soundtracks inmersivos", desc: "Música integrada mientras lees." },
  { icon: BadgeCheck, title: "Insignia de verificación", desc: "El check azul junto a tu nombre en todo el sitio." },
  { icon: UserRoundPen, title: "Diseño de perfil mejorado", desc: "Portada, marco y estilo exclusivos para tu perfil." },
  { icon: MessagesSquare, title: "Acceso anticipado al chat", desc: "Habla antes que nadie con los personajes de tus mangas favoritos." },
];

/**
 * Modal de suscripción: solo el precio, los beneficios y el botón de pago.
 * Montserrat (semibold) para nombre, precio y títulos; Glacial Indifference
 * (regular) para descripciones y notas.
 */
export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isLightMode = theme === 'light';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const glacial = "font-['Glacial_Indifference'] font-normal";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            onClick={handleClose}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xl"
          />

          <div className="pointer-events-none fixed inset-0 z-[301] flex items-center justify-center p-4">
            <motion.div
              key="payment-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="subscription-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className={`pointer-events-auto relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl border p-6 shadow-2xl transition-colors sm:p-7 ${
                isLightMode ? 'border-black/10 bg-white text-black' : 'border-white/10 bg-[#09090b] text-white'
              }`}
            >
              <button
                type="button"
                aria-label="Cerrar modal de suscripción"
                onClick={handleClose}
                className={`absolute right-4 top-4 rounded-full p-2 transition-colors ${isLightMode ? 'text-zinc-500 hover:bg-black/5 hover:text-black' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}
              >
                <X size={20} />
              </button>

              {/* Nombre y precio */}
              <h2 id="subscription-modal-title" className="font-[Montserrat] text-[22px] font-semibold leading-none tracking-tight">
                Mukai <span className="text-[#FF4D88]">PRO</span>
              </h2>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="font-[Montserrat] text-[40px] font-semibold leading-none tracking-tight">{PRICE}</span>
                <span className={`${glacial} text-[15px] ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>/ mes</span>
              </p>

              {/* Beneficios */}
              <ul className={`mt-6 divide-y border-y ${isLightMode ? 'divide-black/[0.06] border-black/[0.06]' : 'divide-white/[0.08] border-white/[0.08]'}`}>
                {BENEFITS.map(({ icon: Icon, title, desc }) => (
                  <li key={title} className="flex items-start gap-3 py-3.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF4D88]/10 text-[#FF4D88]">
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-[Montserrat] text-[14px] font-semibold leading-snug">{title}</span>
                      <span className={`${glacial} mt-0.5 block text-[13.5px] leading-snug ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{desc}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleSubscription}
                disabled={loading}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-[Montserrat] text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isLightMode ? 'bg-[#FF4D88] text-white hover:bg-[#e13c75]' : 'bg-white text-black hover:bg-[#FF4D88] hover:text-white'}`}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Procesando…' : 'Vuélvete Premium'}
              </button>

              {error && (
                <p className={`${glacial} mt-2 text-center text-[12px] text-red-400`}>{error}</p>
              )}

              <p className={`${glacial} mt-3 text-center text-[12px] ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Sin compromisos · Cancela cuando quieras
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
