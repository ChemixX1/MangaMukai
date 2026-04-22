import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export const PaymentSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#09090b] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/20">
            <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-[1000] text-white uppercase italic tracking-tighter mb-2">
            ¡Pago Exitoso!
          </h2>
          <p className="text-zinc-400 font-medium mb-8">
            Tu compra ha sido procesada correctamente.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-white text-black font-bold uppercase tracking-widest text-xs py-3 px-8 rounded-xl hover:bg-zinc-200 transition-colors"
          >
            Volver al Inicio
          </button>
        </motion.div>
      </div>
    </div>
  );
};
