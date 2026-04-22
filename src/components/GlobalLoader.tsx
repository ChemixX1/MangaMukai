import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const GlobalLoader = ({ isLoaded }: { isLoaded: boolean }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        setShow(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="global-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#030303] cursor-default select-none overflow-hidden"
        >
          {/* Animated Tech Grid Background (Fondo con líneas definidas sin blur) */}
          <div 
            className="absolute inset-0 opacity-[0.07] pointer-events-none" 
            style={{ 
              backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', 
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
            }} 
          />

          {/* Anillo expansivo de impacto agudo (Sin blur) */}
          <motion.div
            initial={{ opacity: 1, scale: 0, borderWidth: "8px" }}
            animate={{ opacity: 0, scale: 3.5, borderWidth: "1px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-white pointer-events-none"
          />



          <div className="relative z-10 flex flex-col items-center">
            {/* Contenedor del Logo (Textos limpios y sólidos, sin drop-shadow) */}
            <div className="flex items-center gap-1 overflow-hidden py-4 px-6 relative">
              <motion.span
                initial={{ y: 100, opacity: 0, skewX: 30 }}
                animate={{ y: 0, opacity: 1, skewX: 0 }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.5 }}
                className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic text-white"
              >
                Manga
              </motion.span>
              <motion.span
                initial={{ y: -100, opacity: 0, skewX: -30 }}
                animate={{ y: 0, opacity: 1, skewX: 0 }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.5, delay: 0.1 }}
                className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic text-[#FF4D88]"
              >
                Mukai
              </motion.span>
            </div>

            {/* Barra de Carga Sólida (Skewed, sin blur ni degradados trasparentes) */}
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "100%", opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6, ease: "circOut" }}
              className="mt-6 w-56 md:w-72 relative flex items-center justify-center h-2"
            >
              <div className="absolute inset-0 bg-[#1a1a1a] overflow-hidden skew-x-[-20deg]">
                <motion.div
                  className="h-full relative w-[40%]"
                  animate={{
                    x: ["-100%", "350%", "-100%", "350%"],
                    backgroundColor: ["#ffffff", "#ffffff", "#FF4D88", "#FF4D88"]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "linear",
                    times: [0, 0.499, 0.5, 1]
                  }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
