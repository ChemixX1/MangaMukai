import type { CSSProperties, ReactElement } from 'react';
export interface CircularCarouselItem { src: string; alt: string; title?: string; subtitle?: string }
export interface CircularCarouselProps {
  items: CircularCarouselItem[];
  preset?: 'cylinder' | 'orbit' | 'wheel' | 'panorama'; intro?: 'assemble' | 'rise' | 'spin' | 'none';
  cardWidth?: number; aspectRatio?: number; speed?: number; captions?: boolean; gap?: number;
  tilt?: number; curve?: number; perspective?: number; autoplay?: 'drift' | 'step' | 'none';
  interval?: number; direction?: 'left' | 'right'; momentum?: number; snap?: boolean;
  pauseOnHover?: boolean; focusOnClick?: boolean; draggable?: boolean; parallax?: number;
  stretch?: number; fadeColor?: string; depthFade?: number; innerShade?: number;
  cornerRadius?: number; onChange?: (index: number) => void;
  onItemClick?: (item: CircularCarouselItem, index: number) => void;
  className?: string; style?: CSSProperties;
}
declare const CircularCarousel: (props: CircularCarouselProps) => ReactElement;
export default CircularCarousel;
