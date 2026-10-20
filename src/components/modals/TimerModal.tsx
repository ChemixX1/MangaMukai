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

           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className={`fixed inset-0 backdrop-blur-md ${isLight ? 'bg-white/45' : 'bg-black/65'}`}
             onClick={onClose}
           />


           <motion.div
             initial={{ opacity: 0, scale: 0.9, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.9, y: 20 }}
             transition={{ type: "spring", duration: 0.5 }}
             role="dialog"
             aria-modal="true"
             aria-label="Temporizador de lectura"
             className={`relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border bg-gradient-to-br p-5 sm:p-7 shadow-2xl font-montserrat font-normal ${isLight ? 'border-zinc-200 from-zinc-100 via-zinc-50 to-white text-zinc-950' : 'border-white/10 from-zinc-800 via-zinc-950 to-black text-white'}`}
           >

             <div className="flex justify-between items-center mb-6">
                 <h3 style={{ fontFamily: 'MuseoModerno, sans-serif' }} className={`flex items-center gap-3 text-lg font-normal ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                     <AlarmClock size={28} strokeWidth={1.8} className="shrink-0 text-[#FF4D88]" /> Temporizador
                 </h3>
                 <button onClick={onClose} aria-label="Cerrar temporizador" className={`rounded-full p-1 text-zinc-500 transition-colors ${isLight ? 'hover:bg-zinc-100 hover:text-black' : 'hover:bg-white/10 hover:text-white'}`}>
                    <X size={18} />
                 </button>
             </div>

             {isActive && activeTimer !== null ? (

                 <div className="flex flex-col items-center py-6">
                     <div style={{ fontFamily: 'MuseoModerno, sans-serif' }} className={`mb-2 text-6xl font-normal tabular-nums tracking-tighter ${isLight ? 'text-zinc-950' : 'text-white'}`}>
                         {formatTime(activeTimer)}
                     </div>
                     <p className="text-xs text-[#FF4D88] font-normal mb-8">
                         Tiempo restante
                     </p>
                     <button
                         onClick={onStopTimer}
                         className="w-full py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded-xl text-xs font-normal flex items-center justify-center gap-2 transition-all"
                     >
                         <Square size={14} fill="currentColor" /> Detener
                     </button>
                 </div>
             ) : (

                 <div className="space-y-5">
                     <div className="grid grid-cols-3 gap-3">
                         {PRESETS.map(min => (
                             <button
                                 key={min}
                                 onClick={() => { onStartTimer(min); onClose(); }}
                                 className={`rounded-xl border py-3.5 text-sm font-normal transition-transform duration-200 ease-out motion-safe:hover:scale-105 motion-safe:focus-visible:scale-105 motion-safe:active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${isLight ? 'border-zinc-200 bg-white/60 text-zinc-700 focus-visible:outline-zinc-500' : 'border-white/10 bg-white/5 text-zinc-300 focus-visible:outline-zinc-400'}`}
                             >
                                 <span className="font-semibold">{min}</span> min
                             </button>
                         ))}
                     </div>

                     <div className="relative">
                         <input
                             type="number"
                             placeholder="Minutos personalizados"
                             value={customMinutes}
                             onChange={(e) => setCustomMinutes(e.target.value)}
                             className={`timer-minutes-input font-semibold placeholder:font-normal w-full rounded-xl border-0 py-3.5 pl-4 pr-16 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-zinc-400/50 ${isLight ? 'bg-zinc-50 text-zinc-950 placeholder:text-zinc-400 shadow-[0_4px_14px_rgba(0,0,0,0.10)]' : 'bg-[#050505] text-white placeholder:text-zinc-600 shadow-[0_4px_16px_rgba(0,0,0,0.55)]'}`}
                         />
                         <button
                             aria-label="Iniciar temporizador" onClick={handleStartCustom}
                             disabled={!customMinutes}
                             className="absolute right-2 top-1/2 flex h-8 w-11 -translate-y-1/2 items-center justify-center bg-[#FF4D88] text-white rounded-lg hover:bg-[#ff3377] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
