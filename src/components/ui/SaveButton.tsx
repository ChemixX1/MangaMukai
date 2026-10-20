import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useSavedMangas } from '../../hooks/useSavedMangas';
import { useTheme } from '../../hooks/useTheme';
import { CheckMark } from './CheckMark';
import { BookmarkIcon } from './icons';

const SAVE_FLASH_MS = 1000;

interface SaveButtonProps {
  mangaId: number | string;

  className?: string;

  iconClassName?: string;
  icon?: ReactNode;
}

export const SaveButton = ({ mangaId, className = 'h-12 w-36 text-sm', iconClassName, icon }: SaveButtonProps) => {
  const { isSaved, toggle } = useSavedMangas();
  const { theme } = useTheme();
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const saved = isSaved(mangaId);
  const isFlashing = flashId === String(mangaId);
  const flashFill = theme === 'light' ? '#000000' : '#ffffff';
  const flashInk = theme === 'light' ? '#ffffff' : '#000000';

  useEffect(() => () => { if (flashTimer.current !== null) window.clearTimeout(flashTimer.current); }, []);

  const handleSave = () => {
    const id = String(mangaId);
    if (!saved) {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      setFlashId(id);
      flashTimer.current = window.setTimeout(() => setFlashId(null), SAVE_FLASH_MS);
    }
    void toggle(mangaId).then((outcome) => {

      if (outcome.status !== 'ok') setFlashId(null);
    });
  };

  return (
    <motion.button
      type="button"
      onClick={handleSave}
      aria-pressed={saved}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center justify-center rounded-[7px] border border-[#8d8d8d] bg-ink px-2 font-montserrat font-extrabold uppercase text-surface transition-colors duration-300 ${className}`}
      style={isFlashing ? { backgroundColor: flashFill, borderColor: flashFill, color: flashInk } : undefined}
    >
      <AnimatePresence initial={false} mode="wait">
        {isFlashing ? (
          <CheckMark key="check" background={flashInk} ink={flashFill} />
        ) : (
          <motion.span
            key={saved ? 'saved' : 'save'}
            className="flex items-center gap-[3px]"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {!saved && icon ? icon : <BookmarkIcon size={24} filled={saved} className={iconClassName} />} {saved ? 'Guardado' : 'Guardar'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
