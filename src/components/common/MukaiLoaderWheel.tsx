import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
const LOADER_RING_RADIUS = 48;
const LOADER_RING_CIRCUMFERENCE = 2 * Math.PI * LOADER_RING_RADIUS;

export function MukaiLoaderWheel({ size = 36, progress = 72, isLight = false }: { size?: number; progress?: number; isLight?: boolean }) {
  const id = useId().replace(/:/g, '');
  const reduceMotion = useReducedMotion();
  return (<div className="relative shrink-0" style={{ width: size, height: size }} role="status" aria-label="Cargando">
                <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full overflow-visible fill-none">
                  <defs>
                    <linearGradient id={`${id}-pink`} x1="18" y1="18" x2="102" y2="102" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#7c3aed" />
                      <stop offset="0.46" stopColor="#d946ef" />
                      <stop offset="1" stopColor="#FF4D88" />
                    </linearGradient>
                    <linearGradient id={`${id}-cyan`} x1="22" y1="96" x2="98" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#67e8f9" />
                      <stop offset="1" stopColor="#dffcff" />
                    </linearGradient>
                    <filter id={`${id}-pink-glow`} x="-45%" y="-45%" width="190%" height="190%">
                      <feGaussianBlur stdDeviation="2.6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id={`${id}-electric`} x="-55%" y="-55%" width="210%" height="210%">
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.045 0.28"
                        numOctaves="2"
                        seed="7"
                        result="electricNoise"
                      >
                        {!reduceMotion && (
                          <animate
                            attributeName="seed"
                            values="2;18;7;26;2"
                            dur="0.72s"
                            repeatCount="indefinite"
                          />
                        )}
                      </feTurbulence>
                      <feDisplacementMap
                        in="SourceGraphic"
                        in2="electricNoise"
                        scale="4.8"
                        xChannelSelector="R"
                        yChannelSelector="B"
                        result="electricStroke"
                      />
                      <feGaussianBlur in="electricStroke" stdDeviation="2.4" result="electricGlow" />
                      <feMerge>
                        <feMergeNode in="electricGlow" />
                        <feMergeNode in="electricStroke" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id={`${id}-cyan-glow`} x="-45%" y="-45%" width="190%" height="190%">
                      <feGaussianBlur stdDeviation="1.7" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <circle
                    cx="60"
                    cy="60"
                    r={LOADER_RING_RADIUS}
                    stroke={`url(#${id}-pink)`}
                    strokeWidth="1.6"
                    opacity={isLight ? 0.28 : 0.34}
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r={LOADER_RING_RADIUS}
                    stroke={`url(#${id}-pink)`}
                    strokeWidth="3.1"
                    strokeLinecap="round"
                    strokeDasharray={LOADER_RING_CIRCUMFERENCE}
                    initial={{ strokeDashoffset: LOADER_RING_CIRCUMFERENCE }}
                    animate={{ strokeDashoffset: LOADER_RING_CIRCUMFERENCE * (1 - progress / 100) }}
                    transition={{ duration: reduceMotion ? 0 : 0.36, ease: 'easeOut' }}
                    transform="rotate(-90 60 60)"
                    filter={`url(#${id}-electric)`}
                  />
                </svg>

                <motion.svg
                  viewBox="0 0 120 120"
                  className="absolute inset-0 h-full w-full overflow-visible fill-none"
                  animate={reduceMotion ? undefined : { rotate: 360, opacity: [0.72, 1, 0.78, 1] }}
                  transition={reduceMotion ? undefined : {
                    rotate: { duration: 1.15, ease: 'linear', repeat: Infinity },
                    opacity: { duration: 0.34, ease: 'easeInOut', repeat: Infinity },
                  }}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r={LOADER_RING_RADIUS}
                    stroke="#f5d0fe"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeDasharray="18 284"
                    filter={`url(#${id}-electric)`}
                  />
                </motion.svg>

                <motion.svg
                  viewBox="0 0 120 120"
                  className="absolute inset-0 h-full w-full overflow-visible fill-none"
                  animate={reduceMotion ? undefined : { rotate: -360 }}
                  transition={reduceMotion ? undefined : { duration: 2.25, ease: 'linear', repeat: Infinity }}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="39.5"
                    stroke={`url(#${id}-cyan)`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeDasharray="54 19 10 31 37 97"
                    filter={`url(#${id}-cyan-glow)`}
                  />
                </motion.svg>

                <motion.svg
                  viewBox="0 0 120 120"
                  className="absolute inset-0 h-full w-full overflow-visible fill-none"
                  animate={reduceMotion ? undefined : { rotate: 360 }}
                  transition={reduceMotion ? undefined : { duration: 4.4, ease: 'linear', repeat: Infinity }}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke={isLight ? '#7c3aed' : '#c4b5fd'}
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeDasharray="2 9 16 12 3 15"
                    opacity={isLight ? 0.42 : 0.62}
                  />
                </motion.svg>
              </div>);
}
