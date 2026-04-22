import { motion, AnimatePresence } from "framer-motion";
import { AlarmClock } from "lucide-react";

// Puedes importar un sonido aquí si quieres
// import alarmSound from "../assets/alarm.mp3"; 

export const AlarmAlert = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    
    // Reproducir sonido al abrir (Opcional - Descomentar imports y useEffect si se usa)
    /* useEffect(() => {
        if (isOpen) {
            const audio = new Audio(alarmSound);
            audio.play().catch(e => console.log("Audio play failed", e));
        }
    }, [isOpen]); */

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 50 }}
                    className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-10 sm:right-10 z-[300] bg-[#0F1115] border border-[#FF4D88] rounded-xl shadow-[0_0_30px_rgba(255,77,136,0.4)] p-6 w-auto sm:w-80 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[#FF4D88]/5 animate-pulse" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 bg-[#FF4D88] rounded-full flex items-center justify-center animate-bounce">
                            <AlarmClock size={32} className="text-white" strokeWidth={2.5} />
                        </div>
                        
                        <div>
                            <h3 className="text-xl font-[1000] text-white uppercase italic">¡Tiempo Cumplido!</h3>
                            <p className="text-xs text-zinc-400 mt-1 font-medium">
                                Ha finalizado tu sesión de lectura programada.
                            </p>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full py-2 bg-white text-black font-black uppercase tracking-widest text-xs rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};