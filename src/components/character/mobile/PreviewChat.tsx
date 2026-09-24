import { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ChevronsDown } from 'lucide-react';

import type { CharacterPreview } from '../../../data/characterIntros';

/** Icono del narrador: ondas de audio. */
const NarratorIcon = () => (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 6.5v3M5 4v8M8 2v12M11 4.5v7M14 6.5v3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

/** Alto del borde del segundo bocadillo que asoma cuando está plegada. */
const PEEK_HEIGHT = 46;
const EASE = [0.22, 0.9, 0.3, 1] as const;

interface PreviewChatProps {
  preview: CharacterPreview;
  characterName: string;
  characterImage: string;
  accent: string;
}

/**
 * Vista previa como conversación: el narrador presenta la escena, tú das el
 * primer paso y el personaje responde. Plegada, solo se ve el primer bocadillo
 * y el borde del segundo desvanecido; el doble chevron la despliega (crece a su
 * alto real, sin saltos) y, girado hacia arriba, la vuelve a plegar.
 */
export const PreviewChat = ({ preview, characterName, characterImage, accent }: PreviewChatProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="mt-3">
        {/* Narrador */}
        <div className="flex items-start gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-200 text-[#1c1c1e] dark:bg-[#2a2a2e] dark:text-white"><NarratorIcon /></span>
          <div className="max-w-[82%] space-y-4 rounded-2xl px-3.5 py-3 font-raleway text-[13px] leading-[1.45] text-[#1c1c1e]" style={{ backgroundColor: `color-mix(in srgb, ${accent} 16%, white)` }}>
            {preview.scene.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>

        {/* Tu turno y su respuesta: plegados solo asoma el principio. */}
        <div className="relative">
          <motion.div
            initial={false}
            animate={{ height: expanded ? 'auto' : PEEK_HEIGHT }}
            transition={{ duration: 0.5, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex justify-end pt-3">
              <div className="max-w-[82%] space-y-3 rounded-2xl bg-[#e9e9ec] px-3.5 py-3 font-raleway text-[13px] leading-[1.45] text-[#1c1c1e] dark:bg-[#f1f1f3]">
                <p>{preview.user.line}</p>
                {preview.user.narration && <p className="italic opacity-80">{preview.user.narration}</p>}
              </div>
            </div>

            <div className="pt-3">
              <p className="flex items-center gap-2 font-montserrat text-[11px] font-semibold text-ink">
                <span className="block h-7 w-7 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-300"><img src={characterImage} alt="" className="h-full w-full object-cover object-top" /></span>
                {characterName}
              </p>
              <div className="mt-1.5 max-w-[82%] space-y-3 rounded-2xl px-3.5 py-3 font-raleway text-[13px] leading-[1.45] text-white" style={{ backgroundColor: accent }}>
                {preview.character.narration && <p className="italic">{preview.character.narration}</p>}
                <p>{preview.character.line}</p>
              </div>
            </div>
          </motion.div>

          {/* Velo que desvanece el borde que asoma; se funde al desplegar. */}
          <AnimatePresence initial={false}>
            {!expanded && (
              <motion.div
                key="fade"
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-full bg-gradient-to-b from-surface/15 via-surface/[.92] via-70% to-surface"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Un solo botón: plegada se monta sobre el velo; desplegada baja bajo el chat y el chevron gira. */}
        <motion.button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Plegar la vista previa' : 'Ver la vista previa completa'}
          className="relative z-10 flex w-full justify-center py-1"
          initial={false}
          animate={{ marginTop: expanded ? 6 : -26 }}
          transition={{ duration: 0.5, ease: EASE }}
          whileTap={{ scale: 0.88 }}
        >
          <motion.span
            className="flex text-ink"
            initial={false}
            animate={{ rotate: expanded ? 180 : 0, y: expanded ? 0 : [0, 3, 0] }}
            transition={{
              rotate: { type: 'spring', stiffness: 260, damping: 18 },
              // Plegada, el chevron "invita" con un pequeño rebote cada dos segundos.
              y: expanded ? { duration: 0.2 } : { duration: 1.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.9 },
            }}
          >
            <ChevronsDown size={22} strokeWidth={2.2} />
          </motion.span>
        </motion.button>
      </div>
    </MotionConfig>
  );
};
