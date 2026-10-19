import { motion, AnimatePresence } from "framer-motion";
import { AlarmClock } from "lucide-react";
import { useTheme } from '../../hooks/useTheme';

export const AlarmAlert = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 50 }}
                    role="alertdialog"
                    aria-modal="true"
                    aria-label="Alarma de lectura"
                    className={`fixed bottom-4 left-4 right-4 z-[300] w-auto overflow-hidden rounded-3xl border border-[#FF4D88]/40 p-6 font-montserrat font-normal shadow-[0_0_30px_rgba(255,77,136,0.22)] sm:bottom-10 sm:left-auto sm:right-10 sm:w-80 ${isLight ? 'bg-white text-zinc-950' : 'bg-black text-white'}`}
                >
                    <div className="absolute inset-0 bg-[#FF4D88]/5" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 bg-[#FF4D88] rounded-2xl flex items-center justify-center">
                            <AlarmClock size={36} className="text-white" strokeWidth={1.8} />
                        </div>
                        
                        <div>
                            <h3 className={`text-xl font-normal ${isLight ? 'text-zinc-950' : 'text-white'}`}>Tiempo cumplido</h3>
                            <p className={`mt-1 text-xs font-normal ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                Ha finalizado tu sesión de lectura programada.
                            </p>
                        </div>

                        <button 
                            onClick={onClose}
                            className={`w-full rounded-lg py-2 text-xs font-normal transition-colors ${isLight ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
                        >
                            Entendido
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
