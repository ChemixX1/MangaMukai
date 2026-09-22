import { motion } from 'framer-motion';

interface CheckMarkProps {
  /** Color del círculo. */
  background: string;
  /** Color del trazo del check. */
  ink: string;
  size?: number;
}

/**
 * Círculo que aparece con un rebote y dibuja un check dentro (botones
 * "Guardar" del hero y "UNIRME" del footer). Se monta al confirmar y se
 * desmonta al volver al estado normal; AnimatePresence lo anima al salir.
 */
export const CheckMark = ({ background, ink, size = 28 }: CheckMarkProps) => (
  <motion.span
    className="grid place-items-center rounded-full"
    style={{ width: size, height: size, backgroundColor: background, color: ink }}
    initial={{ scale: 0.3, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.3, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 520, damping: 24 }}
  >
    <svg width={Math.round(size * 0.57)} height={Math.round(size * 0.57)} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <motion.path
        d="M3 8.4 6.6 12 13 4.6"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.36, ease: 'easeOut', delay: 0.08 }}
      />
    </svg>
  </motion.span>
);
