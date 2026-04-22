import { useState, useEffect } from "react";
import { X, Play, Square, AlarmClock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTimer: (minutes: number) => void;
  onStopTimer: () => void;
  activeTimer: number | null;
  isActive: boolean;
}

const PRESETS = [15, 30, 45, 60, 90, 120];

export const TimerModal = ({ isOpen, onClose, onStartTimer, onStopTimer, activeTimer, isActive }: TimerModalProps) => {
  const [customMinutes, setCustomMinutes] = useState("");

  // BLOQUEO DE SCROLL
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"; // Bloquea scroll
    } else {
      document.body.style.overflow = "unset"; // Restaura scroll
    }
    return () => { document.body.style.overflow = "unset"; }; // Limpieza al desmontar
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleStartCustom = () => {
    const mins = parseInt(customMinutes);
    if (!isNaN(mins) && mins > 0) {
      onStartTimer(mins);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           {/* Overlay Oscuro */}
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm"
             onClick={onClose}
           />
           
           {/* Modal Centrado */}
           <motion.div
             initial={{ opacity: 0, scale: 0.9, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.9, y: 20 }}
             transition={{ type: "spring", duration: 0.5 }}
             className="relative w-full max-w-sm bg-[#0F1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 z-10"
           >
             {/* Header */}
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-[1000] text-white uppercase italic tracking-wider flex items-center gap-2">
                     <AlarmClock size={18} className="text-[#FF4D88]" /> Temporizador
                 </h3>
                 <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                    <X size={18} />
                 </button>
             </div>

             {isActive && activeTimer !== null ? (
                 // VISTA: ACTIVO
                 <div className="flex flex-col items-center py-6">
                     <div className="text-6xl font-[1000] text-white tabular-nums tracking-tighter mb-2">
                         {formatTime(activeTimer)}
                     </div>
                     <p className="text-xs text-[#FF4D88] font-bold uppercase tracking-widest animate-pulse mb-8">
                         Tiempo restante
                     </p>
                     <button 
                         onClick={onStopTimer}
                         className="w-full py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                     >
                         <Square size={14} fill="currentColor" /> Detener
                     </button>
                 </div>
             ) : (
                 // VISTA: CONFIGURACIÓN
                 <div className="space-y-5">
                     <div className="grid grid-cols-3 gap-3">
                         {PRESETS.map(min => (
                             <button
                                 key={min}
                                 onClick={() => { onStartTimer(min); onClose(); }}
                                 className="py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#FF4D88] rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition-all active:scale-95"
                             >
                                 {min} min
                             </button>
                         ))}
                     </div>

                     <div className="relative">
                         <input 
                             type="number" 
                             placeholder="Minutos personalizados..."
                             value={customMinutes}
                             onChange={(e) => setCustomMinutes(e.target.value)}
                             className="w-full bg-[#050505] border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm text-white placeholder:text-zinc-600 focus:border-[#FF4D88] outline-none transition-colors"
                         />
                         <button 
                             onClick={handleStartCustom}
                             disabled={!customMinutes}
                             className="absolute right-2 top-2 p-1.5 bg-[#FF4D88] text-white rounded-lg hover:bg-[#ff3377] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                         >
                             <Play size={16} fill="currentColor" />
                         </button>
                     </div>
                 </div>
             )}
           </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};