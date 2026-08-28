import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

export interface ProfileBackdropCover {
  id: string | number;
  title: string;
  cover: string;
}

interface ProfileMotionBackdropProps {
  covers: ProfileBackdropCover[];
  isLight: boolean;
}

const TILE_HEIGHTS = [
  'h-40 sm:h-52',
  'h-52 sm:h-64',
  'h-44 sm:h-56',
  'h-56 sm:h-72',
  'h-48 sm:h-60',
  'h-40 sm:h-52',
];

const buildMosaic = (covers: ProfileBackdropCover[]) => {
  if (covers.length === 0) return [];
  return Array.from({ length: 24 }, (_, index) => covers[index % covers.length]);
};

export const ProfileMotionBackdrop = ({ covers, isLight }: ProfileMotionBackdropProps) => {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const mosaicY = useTransform(scrollYProgress, [0, 1], ['-4%', '12%']);
  const mosaicRotate = useTransform(scrollYProgress, [0, 1], [-3.5, 2]);
  const glowY = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const mosaic = buildMosaic(covers);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className={`absolute -left-28 top-[4%] h-80 w-80 rounded-full bg-[#FF4D88] blur-[110px] ${isLight ? 'opacity-[0.14]' : 'opacity-[0.2]'}`}
        style={reduceMotion ? undefined : { y: glowY }}
        animate={reduceMotion ? undefined : { x: [0, 110, 28, 0], scale: [1, 1.22, 0.94, 1] }}
        transition={reduceMotion ? undefined : { duration: 20, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className={`absolute -right-32 top-[38%] h-96 w-96 rounded-full bg-[#7C3AED] blur-[130px] ${isLight ? 'opacity-[0.1]' : 'opacity-[0.17]'}`}
        style={reduceMotion ? undefined : { y: glowY }}
        animate={reduceMotion ? undefined : { x: [0, -120, -24, 0], scale: [0.95, 1.16, 1, 0.95] }}
        transition={reduceMotion ? undefined : { duration: 24, ease: 'easeInOut', repeat: Infinity, delay: 1.2 }}
      />

      {mosaic.length > 0 && (
        <motion.div
          className="absolute -inset-x-[13%] -inset-y-28 grid grid-cols-3 content-around gap-x-5 gap-y-12 sm:grid-cols-4 sm:gap-x-8 lg:grid-cols-6 lg:gap-x-10"
          style={reduceMotion ? { rotate: -2 } : { y: mosaicY, rotate: mosaicRotate }}
        >
          {mosaic.map((cover, index) => (
            <motion.figure
              key={`profile-mosaic-${cover.id}-${index}`}
              className={`mx-auto w-[78%] max-w-36 overflow-hidden rounded-2xl border shadow-[0_18px_48px_rgba(0,0,0,.3)] ${TILE_HEIGHTS[index % TILE_HEIGHTS.length]} ${isLight ? 'border-black/15 bg-white opacity-[0.19]' : 'border-white/15 bg-black opacity-[0.28]'}`}
              animate={reduceMotion ? undefined : {
                y: [0, index % 2 === 0 ? -18 : 16, 0],
                rotate: [index % 3 === 0 ? -2 : 1.5, index % 2 === 0 ? 2.5 : -2, index % 3 === 0 ? -2 : 1.5],
                scale: [0.98, index % 4 === 0 ? 1.045 : 1.015, 0.98],
              }}
              transition={reduceMotion ? undefined : {
                duration: 9 + (index % 6),
                ease: 'easeInOut',
                repeat: Infinity,
                delay: (index % 8) * 0.32,
              }}
            >
              <img src={cover.cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover saturate-[0.8]" />
            </motion.figure>
          ))}
        </motion.div>
      )}

      <div className={`absolute inset-0 ${isLight ? 'bg-[linear-gradient(180deg,rgba(240,242,245,.76),rgba(240,242,245,.58)_45%,rgba(240,242,245,.86))]' : 'bg-[linear-gradient(180deg,rgba(24,25,26,.75),rgba(24,25,26,.55)_45%,rgba(24,25,26,.88))]'}`} />
      <div
        className="absolute inset-0"
        style={{
          background: isLight
            ? 'radial-gradient(circle at center, transparent 0%, transparent 34%, rgba(240, 242, 245, 0.72) 100%)'
            : 'radial-gradient(circle at center, transparent 0%, transparent 34%, rgba(24, 25, 26, 0.76) 100%)',
        }}
      />
    </div>
  );
};
