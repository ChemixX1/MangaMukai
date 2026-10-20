import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';

interface MarqueeOptions {

  itemCount: number;

  speed: number;

  direction: 'right' | 'left';

  leadingInset?: number;

  pauseOnHover?: boolean;
}

interface DragState {
  offset: number;
  velocity: number;
  dragging: boolean;
  pointerId: number;
  lastX: number;
  lastT: number;
  startX: number;
  moved: boolean;
}

const MAX_FLICK_VELOCITY = 3;
const FLICK_DECAY_MS = 380;
const STILL_BEFORE_RELEASE_MS = 100;
const DRAG_THRESHOLD_PX = 6;

export const useInfiniteMarquee = ({ itemCount, speed, direction, leadingInset = 0, pauseOnHover = false }: MarqueeOptions) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const [sequenceWidth, setSequenceWidth] = useState(0);
  const [copies, setCopies] = useState(2);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const state = useRef<DragState>({ offset: 0, velocity: 0, dragging: false, pointerId: -1, lastX: 0, lastT: 0, startX: 0, moved: false });
  const initialized = useRef(false);
  const hovered = useRef(false);

  const wrap = useCallback((offset: number) => {
    if (sequenceWidth <= 0) return offset;
    return ((offset % sequenceWidth) + sequenceWidth) % sequenceWidth;
  }, [sequenceWidth]);

  const paint = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = `translate3d(${-state.current.offset}px, 0, 0)`;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const sequence = sequenceRef.current;
    if (!viewport || !sequence || itemCount === 0) return;
    const measure = () => {
      const width = sequence.offsetWidth;
      const visible = viewport.clientWidth;
      if (width <= 0) return;
      setSequenceWidth(width);
      setCopies(Math.max(2, Math.ceil(visible / width) + 1));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(sequence);
    measure();
    return () => observer.disconnect();
  }, [itemCount]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [itemCount]);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (sequenceWidth <= 0 || initialized.current) return;
    initialized.current = true;
    state.current.offset = wrap(sequenceWidth - leadingInset);
    paint();
  }, [sequenceWidth, leadingInset, wrap, paint]);

  useEffect(() => {
    initialized.current = false;
  }, [itemCount]);

  useEffect(() => {
    if (sequenceWidth <= 0 || itemCount === 0 || !inView || !pageVisible) return;
    const cruise = (direction === 'right' ? -1 : 1) * (speed / 1000);
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const s = state.current;
      if (!s.dragging && !(pauseOnHover && hovered.current)) {
        if (Math.abs(s.velocity) > Math.abs(cruise)) {
          s.velocity *= Math.exp(-dt / FLICK_DECAY_MS);
          if (Math.abs(s.velocity) <= Math.abs(cruise)) s.velocity = cruise;
        } else {
          s.velocity = cruise;
        }
        s.offset = wrap(s.offset + s.velocity * dt);
        paint();
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [sequenceWidth, itemCount, inView, pageVisible, speed, direction, wrap, paint, pauseOnHover]);

  const onPointerEnter = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    hovered.current = true;
    if (pauseOnHover) state.current.velocity = 0;
  }, [pauseOnHover]);

  const onPointerLeave = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      hovered.current = false;
      if (state.current.dragging && !state.current.moved) {
        state.current.dragging = false;
        state.current.pointerId = -1;
      }
    }
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const s = state.current;
    s.dragging = true;
    s.pointerId = event.pointerId;
    s.velocity = 0;
    s.lastX = event.clientX;
    s.startX = event.clientX;
    s.lastT = performance.now();
    s.moved = false;
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (!s.dragging || event.pointerId !== s.pointerId) return;
    const now = performance.now();
    const dx = event.clientX - s.lastX;
    const dt = Math.max(1, now - s.lastT);

    if (!s.moved && Math.abs(event.clientX - s.startX) > DRAG_THRESHOLD_PX) {
      s.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    s.offset = wrap(s.offset - dx);

    const instant = Math.max(-MAX_FLICK_VELOCITY, Math.min(MAX_FLICK_VELOCITY, -dx / dt));
    s.velocity = 0.6 * instant + 0.4 * s.velocity;
    s.lastX = event.clientX;
    s.lastT = now;
    paint();
  }, [wrap, paint]);

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (!s.dragging || event.pointerId !== s.pointerId) return;
    s.dragging = false;
    s.pointerId = -1;
    if (performance.now() - s.lastT > STILL_BEFORE_RELEASE_MS) s.velocity = 0;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!state.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    state.current.moved = false;
  }, []);

  return {
    viewportRef,
    trackRef,
    sequenceRef,
    copies,
    viewportProps: {
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  };
};
