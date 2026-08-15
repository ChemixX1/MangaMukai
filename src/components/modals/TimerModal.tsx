import { useState, useEffect } from "react";
import { X, Play, Square, AlarmClock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from '../../hooks/useTheme';
import { lockPageScroll } from '../../utils/scrollLock';

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
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // BLOQUEO DE SCROLL
  useEffect(() => {
    if (!isOpen) return;
    return lockPageScroll();
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
             className={`fixed inset-0 backdrop-blur-md ${isLight ? 'bg-white/45' : 'bg-black/65'}`}
             onClick={onClose}
           />
           
           {/* Modal Centrado */}
           <motion.div
             initial={{ opacity: 0, scale: 0.9, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.9, y: 20 }}
             transition={{ type: "spring", duration: 0.5 }}
             role="dialog"
             aria-modal="true"
             aria-label="Temporizador de lectura"
             className={`relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border p-6 shadow-2xl ${isLight ? 'border-zinc-200 bg-white text-zinc-950' : 'border-white/10 bg-black text-white'}`}
           >
             {/* Header */}
             <div className="flex justify-between items-center mb-6">
                 <h3 className={`flex items-center gap-2 text-sm font-[1000] uppercase italic tracking-wider ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                     <AlarmClock size={18} className="text-[#FF4D88]" /> Temporizador
                 </h3>
                 <button onClick={onClose} aria-label="Cerrar temporizador" className={`rounded-full p-1 text-zinc-500 transition-colors ${isLight ? 'hover:bg-zinc-100 hover:text-black' : 'hover:bg-white/10 hover:text-white'}`}>
                    <X size={18} />
                 </button>
             </div>

             {isActive && activeTimer !== null ? (
                 // VISTA: ACTIVO
                 <div className="flex flex-col items-center py-6">
                     <div className={`mb-2 text-6xl font-[1000] tabular-nums tracking-tighter ${isLight ? 'text-zinc-950' : 'text-white'}`}>
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
                                 className={`rounded-xl border py-3 text-xs font-bold transition-all active:scale-95 hover:border-[#FF4D88] ${isLight ? 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-pink-50 hover:text-zinc-950' : 'border-white/5 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'}`}
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
                             className={`timer-minutes-input w-full rounded-xl border py-3.5 pl-4 pr-12 text-sm outline-none transition-colors focus:border-[#FF4D88] ${isLight ? 'border-zinc-200 bg-zinc-50 text-zinc-950 placeholder:text-zinc-400' : 'border-white/10 bg-[#050505] text-white placeholder:text-zinc-600'}`}
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
