import { HERO_AUTOPLAY_MS, HERO_TRANSITION_SECONDS, HERO_COVER_EASE } from './heroMotion';
import { HERO_TAG_CLASS, HERO_TAG_ROW, HERO_TITLE_CLASS } from './heroTagStyles';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import { useHomePrefetchGroup } from '../../context/HomePrefetchContext';
import { useNavigate } from 'react-router-dom';

import { HomeReadIcon, HomeSaveIcon } from '../../components/home/HomeIcons';
import { ACCENT_COLOR, EyeIcon, SaveButton, type Accent } from '../../components/ui';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import { formatHomeViews } from '../../utils/mangaFormat';
import { preloadImages } from '../../utils/preloadImages';

import { HERO_TAGS, MOBILE_HERO_TAGS, type HeroItem } from './homeModels';

const HIDDEN_COVER_DEPTH = { z: -260, rotateY: 62 } as const;

interface HeroBaseGeometry {

  path: string;
  from: number;
  to: number;

  shadow: string;
  glow: { cy: number; rx: number; ry: number };

  faces: { deck: string; front: string; deckTop: number; deckBottom: number; frontTop: number; bottom: number };

  box: { x: number; y: number; width: number; height: number };

  weight: number;
}

const PODIUM_PROFILE = [[0, 0], [0.3, 0.82], [0.5, 1], [0.7, 0.82], [1, 0]] as const;

const PODIUM_EDGE_DEPTH = 2.5;

const PODIUM_COMET_SEGMENTS = 24;

const HERO_BASES = {
  podium: {
    path: 'M-358.44 161H-132L-150.46 193H150.46L132 161H366.56',
    from: -358.44,
    to: 366.56,
    shadow: 'M-150 201H150',
    glow: { cy: 198, rx: 210, ry: 18 },
    faces: { deck: 'M-358.44 161L-322 141H-132V161ZM366.56 161L330 141H132V161Z', front: 'M-132 161L-150.46 193H150.46L132 161Z', deckTop: 141, deckBottom: 161, frontTop: 161, bottom: 193 },
    box: { x: -380, y: 100, width: 760, height: 138 },
    weight: 1,
  },
  podiumMobile: {
    path: 'M-200 113H-88.5L-104.5 137H104.5L88.5 113H200',
    from: -200,
    to: 200,
    shadow: 'M-100 142.5H100',
    glow: { cy: 140.5, rx: 140, ry: 12 },
    faces: { deck: 'M-200 113L-175.6 99.6H-88.5V113ZM200 113L175.6 99.6H88.5V113Z', front: 'M-88.5 113L-104.5 137H104.5L88.5 113Z', deckTop: 99.6, deckBottom: 113, frontTop: 113, bottom: 137 },
    box: { x: -260, y: 80, width: 520, height: 75 },
    weight: 0.8,
  },
} satisfies Record<string, HeroBaseGeometry>;

type HeroBase = keyof typeof HERO_BASES;

interface CoverLayoutConfig {
  active: { width: number; height: number };
  side: { width: number; height: number };
  slots: { first: number; last: number };
  prev: number;
  next: number;

  activeBorder: boolean;
  sideBorder: boolean;

  badges: boolean;
  perspective: number;
  sideDepth: { z: number; rotateY: number };
  base: HeroBase | null;
  coverClass: string;

  sectionClass: string;

  stageClass: string;
  anchorClass: string;

  spacing: { tags: string; synopsis: string; bars: string };
}

type CoverLayout = 'stacked' | 'row';

const DESKTOP_SPACING = { tags: '', synopsis: '', bars: '' };

const COVER_LAYOUTS: Record<CoverLayout, CoverLayoutConfig> = {

  stacked: {
    active: { width: 269.58, height: 386 },
    side: { width: 220.13, height: 305.92 },
    slots: { first: -1, last: 1 },
    prev: -185.39,
    next: 188.43,
    activeBorder: true,
    sideBorder: false,
    badges: false,
    perspective: 1000,
    sideDepth: { z: 0, rotateY: 12 },
    base: 'podium',
    coverClass: '',
    sectionClass: '',
    stageClass: '',
    anchorClass: 'lg:left-[calc(100%-300px)] lg:top-[266px] xl:left-[calc(50%+339.44px)]',
    spacing: DESKTOP_SPACING,
  },

  row: {
    active: { width: 269.58, height: 386 },
    side: { width: 277, height: 386 },
    slots: { first: 0, last: 2 },
    prev: -120,
    next: 294.06,
    activeBorder: true,
    sideBorder: true,
    badges: false,
    perspective: 1200,
    sideDepth: { z: 0, rotateY: 12 },
    base: null,
    coverClass: 'home-hero-cover-lifted',
    sectionClass: 'lg:shadow-[0_-4px_5px_rgba(108,108,108,0.57)]',
    stageClass: '',
    anchorClass: 'lg:left-[calc(50%+96px)] lg:top-[272px] xl:left-[calc(50%+127.5px)]',
    spacing: DESKTOP_SPACING,
  },
};

const MOBILE_COVER_LAYOUTS: Record<CoverLayout, CoverLayoutConfig> = {
  stacked: {
    active: { width: 165, height: 234 },
    side: { width: 135, height: 185 },
    slots: { first: -1, last: 1 },
    prev: -124.62,
    next: 126.96,
    activeBorder: true,
    sideBorder: false,
    badges: false,
    perspective: 670,
    sideDepth: { z: 0, rotateY: 12 },
    base: 'podiumMobile',
    coverClass: '',
    sectionClass: '',
    stageClass: 'h-[406px]',
    anchorClass: 'left-1/2 top-[210px]',
    spacing: { tags: 'mt-[17px]', synopsis: 'mt-[19px]', bars: 'mt-[57px]' },
  },
  row: {
    active: { width: 166, height: 245 },
    side: { width: 165, height: 245 },
    slots: { first: 0, last: 2 },
    prev: -83,
    next: 181.5,
    activeBorder: false,
    sideBorder: false,
    badges: false,
    perspective: 830,
    sideDepth: { z: 0, rotateY: 12 },
    base: null,
    coverClass: 'home-hero-cover-lifted',
    sectionClass: '',
    stageClass: 'h-[432px]',
    anchorClass: 'left-[calc(50%-9px)] top-[248.5px]',
    spacing: { tags: 'mt-2', synopsis: 'mt-[21px]', bars: 'mt-12' },
  },
};

const COVER_BADGE_CLASS = 'absolute flex items-center font-montserrat italic leading-none';
const COVER_BADGES = {
  desktop: {
    type: 'h-5 rounded-[3px] px-1.5 text-sm font-semibold tracking-tight text-white',
    views: 'h-5 gap-[3px] rounded-[3px] px-1.5 text-sm font-semibold tracking-tight text-white',
    eye: 'size-3.5',
    active: { type: 'bottom-1.5 left-1.5', views: 'bottom-1.5 right-1.5' },
    side: { type: 'bottom-1.5 left-1.5', views: 'bottom-1.5 right-1.5' },
  },
  mobile: {
    type: 'h-3.5 rounded-sm px-[3px] text-[9px] font-extrabold text-pink-50',
    views: 'h-3.5 gap-px rounded-[5px] pl-[5px] pr-1.5 text-[9px] font-semibold tracking-tight text-white',
    eye: 'size-3',
    active: { type: 'bottom-[7px] left-[9.88px]', views: 'bottom-[7px] right-[9.12px]' },
    side: { type: 'bottom-[6.76px] left-[5px]', views: 'bottom-[5.76px] right-[6.58px]' },
  },
} as const;

const SWIPE_THRESHOLD = 40;

const FittingTagRow = ({ tags, color, limit }: { tags: string[]; color: string; limit: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const shownTags = useMemo(() => tags.slice(0, limit), [tags, limit]);
  const [visibleCount, setVisibleCount] = useState(shownTags.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureRow = measureRef.current;
    if (!container || !measureRow) return;

    let animationFrame = 0;
    const updateVisibleTags = () => {
      const availableWidth = container.clientWidth;

      const scale = container.getBoundingClientRect().width / (availableWidth || 1) || 1;
      const gap = Number.parseFloat(window.getComputedStyle(measureRow).columnGap) || 0;
      let occupiedWidth = 0;
      let nextVisibleCount = 0;
      for (const chip of Array.from(measureRow.children)) {
        const chipWidth = (chip as HTMLElement).getBoundingClientRect().width / scale;
        const nextWidth = occupiedWidth + (nextVisibleCount > 0 ? gap : 0) + chipWidth;
        if (nextWidth > availableWidth + 0.5) break;
        occupiedWidth = nextWidth;
        nextVisibleCount += 1;
      }
      setVisibleCount(nextVisibleCount);
    };
    const scheduleMeasurement = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateVisibleTags);
    };

    const resizeObserver = new ResizeObserver(scheduleMeasurement);
    resizeObserver.observe(container);
    updateVisibleTags();
    void document.fonts?.ready.then(scheduleMeasurement);
    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [shownTags]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden">
      <div className={`flex w-full justify-center lg:justify-start ${HERO_TAG_ROW}`}>
        {shownTags.slice(0, visibleCount).map((tag, index) => (
          <span key={`${tag}-${index}`} className={HERO_TAG_CLASS} style={{ backgroundColor: color, borderColor: color }}>{tag}</span>
        ))}
      </div>
      <div ref={measureRef} aria-hidden="true" className={`pointer-events-none invisible absolute left-0 top-0 flex w-max ${HERO_TAG_ROW}`}>
        {shownTags.map((tag, index) => <span key={`${tag}-${index}`} className={HERO_TAG_CLASS}>{tag}</span>)}
      </div>
    </div>
  );
};

interface PodiumGradientProps {
  id: string;
  geometry: HeroBaseGeometry;
  color: string;
  peak: number;
}

const PodiumGradient = ({ id, geometry, color, peak }: PodiumGradientProps) => (
  <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={geometry.from} y1={0} x2={geometry.to} y2={0}>
    {PODIUM_PROFILE.map(([offset, share]) => <stop key={offset} offset={offset} stopColor={color} stopOpacity={peak * share} />)}
  </linearGradient>
);

const HeroPodium = ({ color, shape, animationKey }: { color: string; shape: HeroBase; animationKey: string | number }) => {
  const podiumId = `hero-podium-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const ref = (name: string) => `url(#${podiumId}-${name})`;
  const geometry: HeroBaseGeometry = HERO_BASES[shape];
  const { path, shadow, glow, faces, box, weight } = geometry;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="home-hero-podium pointer-events-none absolute z-[3] overflow-visible"
      style={{ left: box.x, top: box.y }}
      width={box.width}
      height={box.height}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      fill="none"
      strokeLinecap="butt"
      strokeLinejoin="miter"
    >
      <defs>
        <PodiumGradient id={`${podiumId}-line`} geometry={geometry} color={color} peak={0.8} />
        <PodiumGradient id={`${podiumId}-shade`} geometry={geometry} color="#000" peak={0.34} />
        <PodiumGradient id={`${podiumId}-shine`} geometry={geometry} color={color} peak={0.6} />
        <radialGradient id={`${podiumId}-glow`}>
          <stop stopColor={color} stopOpacity={0.3} />
          <stop offset={1} stopColor={color} stopOpacity={0} />
        </radialGradient>
        <PodiumGradient id={`${podiumId}-fade`} geometry={geometry} color="#fff" peak={1} />
        <linearGradient id={`${podiumId}-deck`} gradientUnits="userSpaceOnUse" x1={0} y1={faces.deckTop} x2={0} y2={faces.deckBottom}>
          <stop stopColor={color} stopOpacity={0} />
          <stop offset={1} stopColor={color} stopOpacity={0.24} />
        </linearGradient>
        <linearGradient id={`${podiumId}-front`} gradientUnits="userSpaceOnUse" x1={0} y1={faces.frontTop} x2={0} y2={faces.bottom}>
          <stop stopColor={color} stopOpacity={0.05} />
          <stop offset={1} stopColor={color} stopOpacity={0.26} />
        </linearGradient>
        <mask id={`${podiumId}-fade-mask`} maskUnits="userSpaceOnUse" x={box.x} y={box.y} width={box.width} height={box.height}>
          <rect x={box.x} y={box.y} width={box.width} height={box.height} fill={ref('fade')} />
        </mask>
        <mask id={`${podiumId}-reveal`} maskUnits="userSpaceOnUse" x={box.x} y={box.y} width={box.width} height={box.height}>
          <path className="home-podium-stroke" pathLength={1} d={path} stroke="#fff" strokeWidth={(faces.bottom - faces.deckTop) * 2 + 16} />
        </mask>
        <filter id={`${podiumId}-blur`} filterUnits="userSpaceOnUse" x={box.x - 20} y={box.y - 6} width={box.width + 40} height={box.height + 18} colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={3.5 * weight} />
        </filter>
      </defs>


      <g className="home-podium-surfaces" mask={ref('reveal')}>
        <ellipse className="home-podium-glow" cx={0} cy={glow.cy} rx={glow.rx} ry={glow.ry} fill={ref('glow')} />
        <g filter={ref('blur')}>
          <path d={path} stroke={ref('shade')} strokeWidth={5 * weight} transform={`translate(0 ${8 * weight})`} />
          <path d={shadow} stroke="#000" strokeOpacity={0.16} strokeWidth={7 * weight} />
        </g>


        <path className="home-podium-face" d={faces.deck} fill={ref('deck')} mask={ref('fade-mask')} />
        <path className="home-podium-face" d={faces.front} fill={ref('front')} />
      </g>


      <g transform={`translate(0 ${PODIUM_EDGE_DEPTH * weight})`}>
        <path className="home-podium-stroke" pathLength={1} d={path} stroke={ref('line')} strokeWidth={5 * weight} />
        <path className="home-podium-stroke" pathLength={1} d={path} stroke={ref('shade')} strokeWidth={5 * weight} />
      </g>
      <path className="home-podium-stroke" pathLength={1} d={path} stroke={ref('line')} strokeWidth={5 * weight} />
      <path className="home-podium-stroke" pathLength={1} d={path} stroke={ref('shine')} strokeWidth={1.25 * weight} transform={`translate(0 ${-1.4 * weight})`} />

      <g mask={ref('fade-mask')}>
        <g key={animationKey} className="home-podium-comet" style={{ color }}>
          {Array.from({ length: PODIUM_COMET_SEGMENTS }, (_, index) => {
            const strength = 1 - index / PODIUM_COMET_SEGMENTS;
            return (
              <path
                key={index}
                className="home-podium-comet-segment"
                pathLength={1}
                d={path}
                stroke={color}
                strokeWidth={(0.3 + 4.7 * strength ** 1.5) * weight}
                strokeOpacity={strength ** 1.5}
                style={{ '--podium-tail-offset': -index * 0.005 } as CSSProperties}
              />
            );
          })}
        </g>
      </g>
    </svg>
  );
};

interface HeroCarouselProps {
  items: HeroItem[];
  loading: boolean;
  accent: Accent;

  label: string;
  coverLayout: CoverLayout;

  keyboardNavigation?: boolean;
  className?: string;
}

export const HeroCarousel = ({ items, loading, accent, label, coverLayout, keyboardNavigation = false, className = '' }: HeroCarouselProps) => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const swiped = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);

  const [backdropSrc, setBackdropSrc] = useState('');
  const isMobile = useIsMobileViewport();
  const accentColor = ACCENT_COLOR[accent];
  const layout = (isMobile ? MOBILE_COVER_LAYOUTS : COVER_LAYOUTS)[coverLayout];
  const badges = COVER_BADGES[isMobile ? 'mobile' : 'desktop'];
  const count = items.length;
  const activeItem = count > 0 ? items[currentIndex % count] : null;

  const goTo = useCallback((index: number) => {
    if (count === 0) return;
    setCurrentIndex(((index % count) + count) % count);
  }, [count]);

  useEffect(() => {
    setCurrentIndex((index) => (count === 0 ? 0 : Math.min(index, count - 1)));
  }, [count]);

  useEffect(() => {
    const onVisibility = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const activeCover = activeItem?.coverImage ?? '';
  useEffect(() => {
    if (!activeCover) return;
    let cancelled = false;
    void preloadImages([activeCover]).then(() => { if (!cancelled) setBackdropSrc(activeCover); });
    return () => { cancelled = true; };
  }, [activeCover]);

  useEffect(() => {
    if (isPaused || count < 2 || !isPageVisible || !isInView || prefersReducedMotion) return;
    const interval = window.setInterval(() => setCurrentIndex((index) => (index + 1) % count), HERO_AUTOPLAY_MS);
    return () => window.clearInterval(interval);
  }, [isPaused, count, isPageVisible, isInView, prefersReducedMotion, currentIndex]);

  useEffect(() => {
    if (!keyboardNavigation) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select, [role="textbox"]'))) return;
      if (event.key === 'ArrowLeft') goTo(currentIndex - 1);
      if (event.key === 'ArrowRight') goTo(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardNavigation, goTo, currentIndex]);

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    swiped.current = false;
    setIsPaused(true);
  };

  const onTouchEnd = (event: TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    setIsPaused(false);
    if (startX === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    swiped.current = true;
    goTo(currentIndex + (delta < 0 ? 1 : -1));
  };

  const centered = layout.slots.first < 0;

  const relativeIndex = (index: number) => {
    const delta = (index - currentIndex + count) % count;
    const waitingBefore = centered ? Math.floor((count - 1) / 2) : Number(count > layout.slots.last + 1);
    return delta >= count - waitingBefore ? delta - count : delta;
  };
  useHomePrefetchGroup(sectionRef, items.filter((_, index) => {
    const delta = relativeIndex(index);
    return delta >= layout.slots.first && delta <= layout.slots.last;
  }).map(item => ({ mangaId: String(item.id), chapterIds: [] })));

  if (!loading && !activeItem) return null;

  const coverOffset = (delta: number) => {
    if (delta === 0) return 0;
    if (delta < 0) return layout.prev;

    return centered ? layout.next : Math.min(delta, layout.slots.last + 1) * layout.next;
  };

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      aria-busy={loading}
      className={`home-hero home-hero-${coverLayout} relative w-full overflow-hidden bg-surface text-ink lg:h-[642px] ${layout.sectionClass} ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >

      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false}>
          {backdropSrc && (
            <motion.div
              key={backdropSrc}
              className="absolute inset-0 bg-cover bg-[center_20%] bg-no-repeat"
              style={{ backgroundImage: `url("${backdropSrc}")` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}

              exit={{ opacity: 0, transition: { duration: 0, delay: prefersReducedMotion ? 0 : HERO_TRANSITION_SECONDS } }}
              transition={{ duration: prefersReducedMotion ? 0 : HERO_TRANSITION_SECONDS, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
        <div className="home-carousel-scrim absolute inset-0" />
      </div>


      <div
        className={`relative touch-pan-y lg:static ${layout.stageClass}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { touchStartX.current = null; setIsPaused(false); }}
      >
        <div
          className={`home-hero-stage absolute h-0 w-0 lg:scale-[0.8] xl:scale-100 ${layout.anchorClass}`}
          style={{ perspective: layout.perspective }}
        >
          {activeItem && layout.base && <HeroPodium key={activeItem.id} animationKey={activeItem.id} color={accentColor} shape={layout.base} />}
          {!activeItem ? (
            <div aria-hidden="true" className="absolute animate-pulse rounded-lg bg-ink/10" style={{ left: 0, top: 0, width: layout.active.width, height: layout.active.height, translate: '-50% -50%' }} />
          ) : items.map((item, index) => {
            const delta = relativeIndex(index);
            const isActive = delta === 0;
            const visible = delta >= layout.slots.first && delta <= layout.slots.last;
            const isSide = visible && !isActive;
            const size = isActive ? layout.active : layout.side;
            const bordered = isActive ? layout.activeBorder : layout.sideBorder;
            const badgeSpot = badges[isActive ? 'active' : 'side'];
            const depth = isSide ? layout.sideDepth : HIDDEN_COVER_DEPTH;
            const flat = prefersReducedMotion || isActive;
            const tilt = flat ? 0 : (delta < 0 ? 1 : -1) * depth.rotateY;
            return (
              <motion.button
                key={String(item.id)}
                type="button"
                tabIndex={visible ? 0 : -1}
                aria-hidden={!visible}
                aria-label={isActive ? `Ver detalle de ${item.title}` : `Mostrar ${item.title}`}
                draggable={false}
                onClick={(event) => {
                  const skipClick = swiped.current && event.detail !== 0;
                  swiped.current = false;
                  if (skipClick) return;
                  if (isActive) navigate(`/manga/${item.id}`, { state: { mangaAccent: accent } });
                  else goTo(index);
                }}
                className={`home-hero-cover absolute left-0 top-0 block overflow-hidden rounded-lg bg-media p-0 ${layout.coverClass} ${isSide && layout.base ? 'home-hero-cover-side' : ''} ${bordered ? 'border border-white' : ''} ${visible ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ translate: '-50% -50%', zIndex: isActive ? 3 : isSide ? 2 : 1, pointerEvents: visible ? 'auto' : 'none' }}
                initial={false}
                animate={{
                  x: coverOffset(delta),
                  z: flat ? 0 : depth.z,
                  rotateY: tilt,
                  width: size.width,
                  height: size.height,
                  opacity: visible ? 1 : 0,
                }}
                transition={prefersReducedMotion ? { duration: 0 } : {
                  duration: HERO_TRANSITION_SECONDS,
                  ease: HERO_COVER_EASE,

                  z: { duration: HERO_TRANSITION_SECONDS * 0.7, ease: HERO_COVER_EASE },
                  rotateY: { duration: HERO_TRANSITION_SECONDS * 0.75, ease: HERO_COVER_EASE },
                  opacity: { duration: HERO_TRANSITION_SECONDS * 0.55, ease: 'easeOut' },
                }}
              >
                <img
                  src={item.coverImage}
                  alt={isActive ? `Portada del manga ${item.title}` : ''}
                  draggable={false}
                  decoding="async"
                  loading={visible ? 'eager' : 'lazy'}
                  fetchPriority={isActive ? 'high' : 'low'}
                  className="h-full w-full object-cover"
                />
                {layout.badges && (
                  <>
                    <span aria-hidden={!isActive} className={`${COVER_BADGE_CLASS} ${badges.type} ${badgeSpot.type}`} style={{ backgroundColor: accentColor }}>
                      {item.type}
                    </span>
                    <span aria-hidden={!isActive} className={`${COVER_BADGE_CLASS} ${badges.views} ${badgeSpot.views} bg-black`}>
                      <EyeIcon size={14} className={`shrink-0 ${badges.eye}`} />
                      {formatHomeViews(item.views)}
                      <span className="sr-only"> vistas</span>
                    </span>
                  </>
                )}

                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{ background: `linear-gradient(${delta < 0 ? 100 : 260}deg, rgb(255 255 255 / 0.2), transparent 38%, rgb(0 0 0 / 0.32))` }}
                  initial={false}
                  animate={{ opacity: tilt === 0 ? 0 : 1 }}
                  transition={{ duration: prefersReducedMotion ? 0 : HERO_TRANSITION_SECONDS }}
                />

                {!prefersReducedMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="home-hero-sheen pointer-events-none absolute inset-0"
                    initial={false}
                    animate={{ x: isActive ? '120%' : '-120%' }}
                    transition={isActive ? { duration: 0.9, delay: HERO_TRANSITION_SECONDS * 0.35, ease: [0.4, 0, 0.2, 1] } : { duration: 0 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>


      <div className="home-hero-info relative mx-auto flex w-full max-w-[440px] flex-col px-[26px] lg:absolute lg:left-8 lg:top-0 lg:mx-0 lg:block lg:h-full lg:w-[555px] lg:max-w-none lg:origin-[0_266px] lg:scale-[0.8] lg:px-0 xl:left-[calc(50%-618px)] xl:scale-100">
        {!activeItem ? (
          <div className="flex animate-pulse flex-col lg:block">
            <div className="h-16 w-full rounded bg-ink/10 lg:absolute lg:left-[7px] lg:top-[127px] lg:h-[60px] lg:w-[548px]" />
            <div className={`order-3 h-32 w-full rounded bg-ink/10 lg:absolute lg:left-0 lg:top-[214px] lg:mt-0 lg:h-[144px] lg:w-[532px] ${layout.spacing.synopsis}`} />
            <div className={`order-2 mx-auto h-5 w-[247px] max-w-full bg-ink/10 lg:absolute lg:left-[4px] lg:top-[372px] lg:mx-0 lg:mt-0 lg:h-6 lg:w-[330px] ${layout.spacing.tags}`} />
            <div className="order-4 mx-auto mt-9 h-12 w-[327px] max-w-full rounded-md bg-ink/10 lg:absolute lg:left-[6px] lg:top-[435px] lg:mx-0 lg:mt-0 lg:h-[59px] lg:w-[383px] lg:rounded-[7px]" />
          </div>
        ) : (
          <>

            <div className="home-hero-title flex h-16 items-start justify-center lg:absolute lg:left-[7px] lg:top-[127px] lg:h-[60px] lg:w-[548px] lg:justify-start">
              <h2 className={`${HERO_TITLE_CLASS} text-ink`}>
                {activeItem.title}
              </h2>
            </div>

            <div className={`home-hero-synopsis relative order-3 h-32 lg:absolute lg:left-0 lg:top-[214px] lg:mt-0 lg:h-[144px] lg:w-[532px] ${layout.spacing.synopsis}`}>
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 lg:w-[3px]" style={{ backgroundColor: accentColor }} />
              <div className="home-hero-glass ml-0.5 h-full px-5 pt-[14px] lg:ml-[3px] lg:px-[18px] lg:pb-[27px] lg:pt-[17px]">
                <p className="line-clamp-5 text-justify font-inter text-sm font-normal leading-5 text-ink lg:text-[15px]">{activeItem.description}</p>
              </div>
            </div>

            <div className={`home-hero-tags order-2 lg:absolute lg:left-[4px] lg:top-[372px] lg:mt-0 lg:w-[528px] ${layout.spacing.tags}`}>
              <FittingTagRow tags={activeItem.tags} color={accentColor} limit={isMobile ? MOBILE_HERO_TAGS : HERO_TAGS} />
            </div>

            <div className="home-hero-actions order-4 mt-9 flex items-center justify-center gap-[7px] pl-[5px] lg:absolute lg:left-[5.98px] lg:top-[435.09px] lg:mt-0 lg:justify-start lg:gap-[20.17px] lg:pl-0">
              <button
                type="button"
                onClick={() => navigate(`/manga/${activeItem.id}`, { state: { mangaAccent: accent } })}
                className="flex h-12 w-44 items-center justify-center gap-3 rounded-md font-montserrat text-sm font-extrabold uppercase text-white transition-transform hover:brightness-110 active:scale-95 lg:h-[59.1px] lg:w-[198px] lg:gap-2 lg:rounded-[7px] lg:text-base lg:shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
                style={{ backgroundColor: accentColor }}
              >
                <HomeReadIcon className="size-5 lg:size-[22px]" /> Leer ahora
              </button>

              <SaveButton
                mangaId={activeItem.id}
                icon={<HomeSaveIcon className="size-5 lg:size-[25px]" />}
                iconClassName="size-5 lg:size-6"
                className="h-11 w-36 text-sm max-lg:rounded-md max-lg:pr-[13px] dark:bg-black dark:text-white lg:h-[54.47px] lg:w-[164.63px] lg:text-base lg:shadow-[0_4px_4px_rgba(49,49,49,0.25)]"
              />
            </div>
          </>
        )}
      </div>


      {count > 1 && (
        <div
          role="tablist"
          aria-label={`Cambiar ${label.toLowerCase()}`}
          className={`home-hero-tabs relative flex h-2 items-center justify-center gap-[5px] lg:absolute lg:left-[calc(50%-6px)] lg:top-[586px] lg:mt-0 lg:-translate-x-1/2 ${layout.spacing.bars}`}
        >
          {items.map((item, index) => {
            const active = index === currentIndex;
            return (
              <button
                key={String(item.id)}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Mostrar ${item.title}`}
                onClick={() => goTo(index)}
                className={`block transition-[width,height,background-color] duration-300 ${active ? 'h-1.5 w-12 lg:h-2 lg:w-14' : 'h-[5px] w-5 bg-[#787373] hover:bg-ink dark:bg-[#d4d4d8] dark:hover:bg-ink lg:h-1.5 lg:w-6'}`}
                style={active ? { backgroundColor: accentColor } : undefined}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

