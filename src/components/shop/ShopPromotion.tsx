import { ArrowUpRight } from 'lucide-react';

export interface ShopPromotionProps {
  title: string;
  eyebrow: string;
  description: string;
  action: string;
  foregroundImage: string;
  foregroundAlt: string;
  tone: 'sage' | 'ink';
  onExplore: () => void;
}

/** Panel de categoría: el texto y la ilustración tienen su propio espacio. */
export function ShopPromotion({ title, eyebrow, description, action, foregroundImage, foregroundAlt, tone, onExplore }: ShopPromotionProps) {
  return (
    <article className={`shop-promo shop-promo--${tone}`}>
      <div className="shop-promo-copy">
        <span className="shop-promo-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" onClick={onExplore}>{action}<ArrowUpRight size={15} aria-hidden="true" /></button>
      </div>
      <img className="shop-promo-image" src={foregroundImage} alt={foregroundAlt} />
    </article>
  );
}
