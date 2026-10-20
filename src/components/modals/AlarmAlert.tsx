import { motion, AnimatePresence } from "framer-motion";
import { AlarmClock } from "lucide-react";
import { useTheme } from '../../hooks/useTheme';
import { useEffect, useRef } from 'react';
import { lockPageScroll } from '../../utils/scrollLock';

export const AlarmAlert = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const dismissRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        const unlock = lockPageScroll();
        dismissRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'Tab') { event.preventDefault(); dismissRef.current?.focus(); }
        };
        window.addEventListener('keydown', onKey);
        return () => { unlock(); window.removeEventListener('keydown', onKey); previousFocus?.focus({ preventScroll: true }); };
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 z-[300] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div aria-hidden="true" className={`absolute inset-0 backdrop-blur-md ${isLight ? 'bg-white/45' : 'bg-black/65'}`} />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 50 }}
                    role="alertdialog"
                    aria-modal="true"
                    aria-label="Alarma de lectura"
                    className={`relative w-full max-w-sm overflow-hidden rounded-3xl border bg-gradient-to-br p-7 font-montserrat font-normal shadow-2xl ${isLight ? 'border-zinc-200 from-zinc-100 via-zinc-50 to-white text-zinc-950' : 'border-white/10 from-zinc-800 via-zinc-950 to-black text-white'}`}
                >
                    <div className="relative z-10 flex flex-col items-center text-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isLight ? 'bg-zinc-200/60' : 'bg-white/5'}`}>
                            <AlarmClock size={36} strokeWidth={1.8} />
                        </div>
                        
                        <div>
                            <h3 className={`text-xl font-normal ${isLight ? 'text-zinc-950' : 'text-white'}`}>Tiempo de Lectura</h3>
                            <p className={`mt-1 text-xs font-normal ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                Tu tiempo de lectura establecido ha culminado.
                            </p>
                        </div>

                        <button 
                            ref={dismissRef}
                            onClick={onClose}
                            className={`min-h-12 w-40 max-w-full rounded-lg px-5 py-3 text-xs font-normal transition-colors ${isLight ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
                        >
                            Entendido
                        </button>
                    </div>
                </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
