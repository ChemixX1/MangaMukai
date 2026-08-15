import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { activateSubscription, confirmCoinPurchase, refreshUser } from "../services/authService";

type Status = "verifying" | "success" | "timeout";

export const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const [attempt, setAttempt] = useState(0);

  const MAX_ATTEMPTS = 20;    // 20 × 1500ms = 30 s máximo
  const POLL_MS      = 1500;

  useEffect(() => {
    const orderId      = searchParams.get("order_id");
    const paymentId    = searchParams.get("payment_id");
    const isSubscription = searchParams.get("sub") === "1";
    const isCoinPurchase = searchParams.get("coins") === "1";

    if (!isSubscription && !isCoinPurchase) {
      setStatus("success");
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      setAttempt(attempts);

      try {
        if (isSubscription && orderId) {
          const activated = await activateSubscription(orderId);
          if (activated) {
            window.clearInterval(timer);
            await refreshUser();
            setStatus("success");
            return;
          }
        }

        if (isCoinPurchase && paymentId) {
          const result = await confirmCoinPurchase(paymentId);
          if (result.completed) {
            window.clearInterval(timer);
            await refreshUser();
            setStatus("success");
            return;
          }
        }
      } catch {
        // network hiccup — keep polling
      }

      if (attempts >= MAX_ATTEMPTS) {
        window.clearInterval(timer);
        setStatus("timeout");
      }
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [searchParams]);

  const progress = Math.min((attempt / MAX_ATTEMPTS) * 100, 100);

  return (
    <div className="min-h-screen w-full bg-[#09090b] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">

        {/* VERIFICANDO */}
        {status === "verifying" && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl text-center"
          >
            <div className="w-20 h-20 rounded-full bg-yellow-500/10 ring-4 ring-yellow-500/20 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-[1000] text-white uppercase italic tracking-tighter mb-2">
              Verificando Pago
            </h2>
            <p className="text-zinc-400 text-sm font-medium mb-6">
              Confirmando tu pago con PayPal...
            </p>
            {/* barra de progreso */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-zinc-600 text-xs mt-3">
              Intento {attempt} de {MAX_ATTEMPTS}…
            </p>
          </motion.div>
        )}

        {/* ÉXITO */}
        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/20 mx-auto"
            >
              <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={3} />
            </motion.div>
            <h2 className="text-3xl font-[1000] text-white uppercase italic tracking-tighter mb-2">
              ¡Pago Exitoso!
            </h2>
            <p className="text-zinc-400 font-medium mb-8">
              Tu compra ha sido procesada y activada correctamente.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-white text-black font-bold uppercase tracking-widest text-xs py-3 px-8 rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Volver al Inicio
            </button>
          </motion.div>
        )}

        {/* TIMEOUT */}
        {status === "timeout" && (
          <motion.div
            key="timeout"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-yellow-500/20">
              <AlertCircle className="w-10 h-10 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-[1000] text-white uppercase italic tracking-tighter mb-2">
              Pago en Proceso
            </h2>
            <p className="text-zinc-400 text-sm font-medium mb-4 leading-relaxed">
              Tu pago fue recibido, pero la confirmación de PayPal está tardando más de lo normal.
              Tu cuenta se actualizará automáticamente en unos minutos.
            </p>
            <p className="text-zinc-500 text-xs mb-8">
              Si tienes dudas, contacta soporte con tu ID de transacción de PayPal.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-white text-black font-bold uppercase tracking-widest text-xs py-3 px-8 rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Volver al Inicio
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
