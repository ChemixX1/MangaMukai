import { useRef, type PointerEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';

export interface ShopPromotionProps {
  title: string;
  eyebrow: string;
  action: string;
  backgroundImage?: string;
  foregroundImage: string;
  foregroundAlt: string;
  foregroundType?: 'character' | 'product';
  tone: 'rose' | 'lilac' | 'peach';
  onExplore: () => void;
}

/** The inner surface clips the banner; its sibling image remains outside it. */
export function ShopPromotion({ title, eyebrow, action, backgroundImage, foregroundImage, foregroundAlt, foregroundType = 'product', tone, onExplore }: ShopPromotionProps) {
  const panel = useRef<HTMLElement>(null);
  const tilt = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty('--promo-x', `${x * 10}px`);
    event.currentTarget.style.setProperty('--promo-y', `${y * 8}px`);
    event.currentTarget.style.setProperty('--promo-rotate', `${x * 4}deg`);
  };
  const reset = () => {
    for (const property of ['--promo-x', '--promo-y', '--promo-rotate']) panel.current?.style.removeProperty(property);
  };
  return (
    <article ref={panel} className={`shop-promo promo-${tone} promo-${foregroundType}`} onPointerMove={tilt} onPointerLeave={reset}>
      <div className="promo-surface">
        <div className="promo-design" aria-hidden="true">
          {backgroundImage && <img src={backgroundImage} alt="" />}
          <span className="promo-orbit" />
        </div>
      </div>
      <img className="promo-foreground" src={foregroundImage} alt={foregroundAlt} draggable={false} />
      <div className="promo-copy">
        <span className="promo-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <button type="button" onClick={onExplore}>{action}<ArrowUpRight size={18} /></button>
      </div>
    </article>
  );
}
