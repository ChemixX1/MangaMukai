import { motion, AnimatePresence } from "framer-motion";
import { Coins, X, Lock, AlertCircle, Clock, Sparkles, Zap } from "lucide-react";
import { Countdown } from "./Countdown";
import logoModal from "../assets/logosnovedades/logomodal.webp";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRecharge: () => void;
  chapterTitle: string;
  price: number;
  userBalance: number;
  loading: boolean;
  freeAt: string | null;
}

export const PurchaseModal = ({
  isOpen, onClose, onConfirm, onRecharge,
  chapterTitle, price, userBalance, loading: _loading, freeAt
}: PurchaseModalProps) => {
  if (!isOpen) return null;

  const canAfford = userBalance >= price;
  const isFutureFree = freeAt && new Date(freeAt) > new Date();

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(234, 179, 8, 0.1) 0%, rgba(0, 0, 0, 0.95) 70%)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm md:max-w-md" // En móvil más angosto, en PC normal
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-transparent to-purple-500/20 rounded-2xl blur-3xl" />
          
          {/* Main Container */}
          <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Animated Border Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-purple-500/20 to-yellow-500/20 opacity-50 animate-pulse" style={{ clipPath: 'inset(0 0 99.5% 0)' }} />
            
            {/* Header con gradiente - Padding reducido en móvil */}
            <div className="relative bg-gradient-to-br from-[#1f1f1f] to-[#141414] p-6 md:p-8 pb-5 text-center border-b border-white/5 overflow-hidden">
              {/* Background Image */}
              <div className="absolute inset-0 opacity-40">
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${logoModal}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/95" />
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-full opacity-10 z-[1]">
                <div className="absolute top-4 left-8 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <div className="absolute top-8 right-12 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-300" />
              </div>

              <button 
                onClick={onClose} 
                className="absolute top-3 right-3 md:top-4 md:right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all duration-300 group z-20"
              >
                <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>

              {/* Icon con efecto glow - Más pequeño en móvil */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="relative w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 z-10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl blur-xl opacity-60 animate-pulse" />
                <div className="relative w-full h-full bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Lock size={24} className="text-black md:w-7 md:h-7" strokeWidth={2.5} />
                  <Sparkles size={12} className="absolute -top-1 -right-1 text-white animate-pulse" />
                </div>
              </motion.div>

              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative z-10 text-xl md:text-2xl font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent mb-1"
              >
                Desbloquear Capítulo
              </motion.h3>

              {/* CONTADOR PEQUEÑO */}
              {isFutureFree && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative z-10 flex justify-center mb-2"
                >
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 backdrop-blur-md">
                    <Clock size={10} className="text-pink-400 md:w-3 md:h-3" />
                    <span className="text-[9px] md:text-[10px] font-bold text-pink-400 tracking-widest flex items-center gap-1">
                       GRATIS EN: <Countdown targetDate={freeAt!} />
                    </span>
                  </div>
                </motion.div>
              )}

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative z-10 text-white/50 text-[10px] md:text-xs px-4 font-medium tracking-wide uppercase truncate"
              >
                {chapterTitle}
              </motion.p>
            </div>

            {/* Body - Padding ajustado */}
            <div className="p-5 md:p-8 space-y-5 md:space-y-6">
              
              {/* --- Price Summary COMPACTO --- */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                // AQUÍ ESTÁ EL CAMBIO PRINCIPAL DE ALTURA: p-4 en móvil, p-6 en desktop
                className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-4 md:p-6"
              >
                <div className="flex justify-between items-center gap-4 md:gap-6">
                  {/* Costo */}
                  <div className="flex-1 text-left">
                    <p className="text-[9px] md:text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1 md:mb-2 flex items-center gap-1">
                      <Zap size={10} className="text-yellow-500" />
                      Costo
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <Coins size={14} className="text-yellow-400 md:w-[18px] md:h-[18px]" />
                      </div>
                      {/* Texto responsive */}
                      <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent font-mono">
                        {price}
                      </span>
                    </div>
                  </div>

                  {/* Divider - Altura reducida en móvil */}
                  <div className="w-px h-10 md:h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                  {/* Saldo */}
                  <div className="flex-1 text-right">
                    <p className="text-[9px] md:text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1 md:mb-2">
                      Tu Saldo
                    </p>
                    <div className={`text-xl md:text-2xl font-bold font-mono transition-colors duration-300 ${
                      canAfford 
                        ? 'text-white' 
                        : 'text-red-400'
                    }`}>
                      {userBalance}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {canAfford && (
                  <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/5">
                    <div className="h-1 md:h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((userBalance / price) * 100, 100)}%` }}
                        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
                      />
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Error Message */}
              {!canAfford && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent p-3 md:p-4"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
                  <div className="relative flex items-start gap-3">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle size={16} className="text-red-400 md:w-[18px] md:h-[18px]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] md:text-xs text-red-200/90 leading-relaxed">
                        Saldo insuficiente. Necesitas{" "}
                        <span className="font-bold text-red-300">{price - userBalance}</span>{" "}
                        monedas más para desbloquear.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose} 
                  className="py-3 md:py-4 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/5 transition-all duration-300 border border-white/5 hover:border-white/10"
                >
                  Cancelar
                </motion.button>
                
                {canAfford ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onConfirm}
                    className="relative py-3 md:py-4 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 group-hover:from-yellow-500 group-hover:to-yellow-400 transition-all duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <span className="relative text-black font-extrabold flex items-center justify-center gap-2">
                      <Sparkles size={14} className="md:w-4 md:h-4" />
                      Desbloquear
                    </span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onRecharge}
                    className="relative py-3 md:py-4 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider overflow-hidden bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-white/30 text-white transition-all duration-300"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Coins size={14} className="md:w-4 md:h-4" />
                      Recargar
                    </span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};