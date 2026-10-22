import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Lock, AlertCircle, Home, LogIn } from "lucide-react";
import { Countdown } from "../common";
import navbarCoins from "../../assets/recharge/icon-2-small.webp";
import logoModal from "../../assets/modals/coin-purchase.webp";
import { useTheme } from "../../hooks/useTheme";
import { lockPageScroll } from "../../utils/scrollLock";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRecharge: () => void;
  chapterNumber: string | number;
  price: number;
  userBalance: number;
  loading: boolean;
  freeAt: string | null;

  onBack?: () => void;

  loginRequired?: boolean;
  purchaseComplete?: boolean;
  onReadChapter?: () => void;
}

export const PurchaseModal = ({
  isOpen, onClose, onConfirm, onRecharge,
  chapterNumber, price, userBalance, loading, freeAt,
  onBack, loginRequired = false, purchaseComplete = false, onReadChapter,
}: PurchaseModalProps) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    return lockPageScroll({ preservePosition: true });
  }, [isOpen]);

  const canAfford = !loginRequired && userBalance >= price;
  const isFutureFree = freeAt && new Date(freeAt) > new Date();

  return createPortal(
    <AnimatePresence>
      {isOpen && <motion.div
        key="purchase-dialog"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : .2 }}
        className="fixed inset-x-0 top-0 z-[300] flex h-dvh items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-modal-title"
      >
        <div
          className="absolute inset-0"
          style={{
            background: isLight ? '#ffffff59' : '#0d081473',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
          onClick={() => {
            if (!loading) onClose();
          }}
        />

        <motion.div
          layout="size"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: reduceMotion ? 0 : .3, ease: [0.22, 1, 0.36, 1], layout: { duration: reduceMotion ? 0 : .32 } }}
          className="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white bg-cover bg-top font-montserrat text-black md:max-w-[560px]"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.18) 20%, rgba(255,255,255,0.88) 43%, #fff 78%), url('${logoModal}')` }}
          onClick={(event) => event.stopPropagation()}
        >
          <AnimatePresence initial={false} mode="popLayout">
          {purchaseComplete ? (
            <motion.div key="complete" layout="position" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0 : .28, ease: 'easeOut' }} className="relative px-6 pb-10 pt-40 text-center md:px-10 md:pt-48" role="status">
              <motion.svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-5" aria-hidden="true">
                <motion.path initial={{ pathLength: reduceMotion ? 1 : 0, fillOpacity: reduceMotion ? 1 : 0 }} animate={{ pathLength: 1, fillOpacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.8, fillOpacity: { delay: reduceMotion ? 0 : 0.65 } }} stroke="#FFA43D" strokeWidth="0.25" fill="#FFA43D" d="M19.96 8.52C19.98 8.35 20 8.17 20 8C20 5.62 17.86 3.71 15.48 4.04C14.79 2.81 13.47 2 12 2C10.53 2 9.21 2.8 8.52 4.04C6.14 3.71 4 5.63 4 8C4 8.17 4.01 8.35 4.04 8.52C2.81 9.21 2 10.53 2 12C2 13.47 2.8 14.79 4.04 15.48C4.02 15.65 4 15.83 4 16C4 18.38 6.14 20.28 8.52 19.96C9.21 21.19 10.53 22 12 22C13.47 22 14.79 21.2 15.48 19.96C17.86 20.28 20 18.37 20 16C20 15.83 19.99 15.65 19.96 15.48C21.19 14.79 22 13.47 22 12C22 10.53 21.2 9.21 19.96 8.52ZM18.52 13.92L17.42 14.21L17.85 15.26C17.94 15.49 17.99 15.74 17.99 15.99C17.99 17.09 17.09 17.99 15.99 17.99C15.74 17.99 15.49 17.94 15.26 17.84L14.21 17.41L13.92 18.51C13.69 19.38 12.9 19.99 12 19.99C11.1 19.99 10.31 19.38 10.08 18.51L9.79 17.41L8.74 17.84C8.51 17.93 8.26 17.99 8.01 17.99C6.91 17.99 6.01 17.09 6.01 15.99C6.01 15.74 6.06 15.49 6.15 15.26L6.58 14.21L5.48 13.92C4.61 13.69 4 12.9 4 12C4 11.1 4.61 10.31 5.48 10.08L6.58 9.79L6.15 8.74C6.06 8.51 6.01 8.26 6.01 8.01C6.01 6.91 6.91 6.01 8.01 6.01C8.26 6.01 8.51 6.06 8.74 6.16L9.79 6.59L10.08 5.49C10.31 4.62 11.1 4.01 12 4.01C12.9 4.01 13.69 4.62 13.92 5.49L14.21 6.59L15.26 6.16C15.49 6.07 15.74 6.01 15.99 6.01C17.09 6.01 17.99 6.91 17.99 8.01C17.99 8.26 17.94 8.51 17.85 8.74L17.42 9.79L18.52 10.08C19.39 10.31 20 11.1 20 12C20 12.9 19.39 13.69 18.52 13.92Z" />
                <motion.path initial={{ pathLength: reduceMotion ? 1 : 0, fillOpacity: reduceMotion ? 1 : 0 }} animate={{ pathLength: 1, fillOpacity: 1 }} transition={{ delay: reduceMotion ? 0 : 0.6, duration: reduceMotion ? 0 : 0.45 }} stroke="#FFA43D" strokeWidth="0.25" fill="#FFA43D" d="M11 12.59L9.71004 11.29L8.29004 12.71L11 15.41L15.74 10.71L14.33 9.28998L11 12.59Z" />
              </motion.svg>
              <h3 id="purchase-modal-title" className="text-2xl font-bold">Gracias por tu compra</h3>
              <p className="mt-3 text-lg">Capítulo {chapterNumber}</p>
              <p className="mt-2 flex items-center justify-center gap-2 font-semibold"><img src={navbarCoins} alt="" aria-hidden="true" className="h-7 w-8 object-contain" />{price} {price === 1 ? 'moneda' : 'monedas'}</p>
              <div className="mt-7 grid grid-cols-2 gap-3">
                <button type="button" onClick={onReadChapter} className="rounded-xl bg-[#FFA43D] px-3 py-3 text-sm font-bold text-black hover:bg-orange-300">Ir al Capítulo</button>
                <button type="button" onClick={onClose} className="rounded-xl border border-current/20 px-3 py-3 text-sm font-bold hover:bg-zinc-500/10">Regresar</button>
              </div>
            </motion.div>
          ) : (
          <motion.div key="confirm" layout="position" initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, pointerEvents: 'none' }} transition={{ duration: reduceMotion ? 0 : .18 }} className="relative overflow-hidden">


            <div className="relative px-6 pb-5 pt-44 text-center overflow-hidden md:px-10 md:pt-52">

              <div className="absolute top-0 left-0 w-full h-full opacity-10 z-[1]">
                <div className="absolute top-4 left-8 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <div className="absolute top-8 right-12 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-300" />
              </div>

              <button
                onClick={onClose}
                disabled={loading}
                aria-label="Cerrar modal"
                className="absolute top-3 right-3 md:top-4 md:right-4 w-8 h-8 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center text-black hover:text-black transition-all duration-300 group z-20"
              >
                <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>

              <motion.h3
                id="purchase-modal-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative z-10 text-xl md:text-2xl font-bold text-black mb-1"
              >
                Comprar capítulo {chapterNumber}
              </motion.h3>


              {isFutureFree && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative z-10 mt-3 mb-2 flex justify-center"
                >
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 backdrop-blur-md">
                    <span className="text-xs md:text-sm font-semibold text-black flex flex-wrap justify-center items-center gap-2">
                       Gratis en: <Countdown targetDate={freeAt!} />
                    </span>
                  </div>
                </motion.div>
              )}

            </div>


            <div className="px-6 pb-8 pt-3 md:px-10 md:pb-10 space-y-6 md:space-y-7">

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="relative py-2"
              >
                <div className="flex justify-between items-center gap-4 px-4 md:gap-6 md:px-6">

                  <div className="flex-1 text-left">
                    <p className="text-xs md:text-sm text-black uppercase font-bold tracking-widest mb-0">
                      Costo
                    </p>
                    <div className="flex items-center gap-2">
                      <img src={navbarCoins} alt="" aria-hidden="true" className="h-10 w-12 shrink-0 object-contain md:h-12 md:w-14" />

                      <span className="text-xl md:text-2xl font-bold tabular-nums text-black">
                        {price}
                      </span>
                    </div>
                  </div>


                  <div className="w-px h-10 md:h-16 bg-gradient-to-b from-transparent via-zinc-900/15 to-transparent" />


                  <div className="flex-1 text-right">
                    <p className="text-xs md:text-sm text-black uppercase font-bold tracking-widest mb-0">
                      Tu Saldo
                    </p>
                    <div className="flex h-10 items-center justify-end text-xl md:h-12 md:text-2xl font-bold tabular-nums text-black">
                      {userBalance}
                    </div>
                  </div>
                </div>


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


              {loginRequired ? (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative overflow-hidden rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent p-3 md:p-4"
                >
                  <div className="relative flex items-start gap-3">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                      <LogIn size={16} className="text-yellow-400 md:w-[18px] md:h-[18px]" />
                    </div>
                    <p className="flex-1 text-[10px] md:text-xs text-black leading-relaxed">
                      Inicia sesión para comprar este capítulo con tus monedas.
                    </p>
                  </div>
                </motion.div>
              ) : !canAfford && (
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
                      <p className="text-[10px] md:text-xs text-black leading-relaxed">
                        Saldo insuficiente. Necesitas{" "}
                        <span className="font-bold text-black">{price - userBalance}</span>{" "}
                        monedas más para comprar.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}


              <div className="grid grid-cols-2 gap-3 pt-1">
                <motion.button
                  whileHover={reduceMotion || loading ? undefined : { scale: 1.045, y: -2 }}
                  whileTap={reduceMotion || loading ? undefined : { scale: 0.96, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                  onClick={onBack ?? onClose}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 md:py-4 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-zinc-500/10 transition-colors duration-200 border border-current/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {onBack ? <><Home size={15} /> Regresar</> : 'Cancelar'}
                </motion.button>

                {canAfford ? (
                  <motion.button
                    whileHover={reduceMotion || loading ? undefined : { scale: 1.045, y: -2 }}
                    whileTap={reduceMotion || loading ? undefined : { scale: 0.96, y: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                    onClick={onConfirm}
                    disabled={loading}
                    className="relative py-3 md:py-4 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider overflow-hidden group disabled:cursor-wait disabled:opacity-80"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFA43D] to-[#FFCD0F] transition-opacity duration-300 group-hover:opacity-90" />
                    <span className="relative text-black font-extrabold flex items-center justify-center gap-2">
                      <Lock size={16} aria-hidden="true" />
                      {loading ? "Procesando..." : "Comprar"}
                    </span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onRecharge}
                    className="relative py-3 md:py-4 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider overflow-hidden hover:bg-zinc-500/10 border border-current/20 transition-all duration-300"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {loginRequired ? <LogIn size={16} /> : <img src={navbarCoins} alt="" aria-hidden="true" className="h-5 w-6 object-contain" />}
                      {loginRequired ? 'Iniciar sesión' : 'Recargar'}
                    </span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      </motion.div>}
    </AnimatePresence>,
    document.body,
  );
};
