import { shopProducts as products } from './shopProducts';
import type { ShopFilter } from '../components/shop/ShopKit';
import type { ShopPromotionProps } from '../components/shop/ShopPromotion';

/** Dos accesos al catálogo, junto a la viñeta principal. */
export const shopPromotions: (Omit<ShopPromotionProps, 'onExplore'> & { id: string; category: ShopFilter })[] = [
  {
    id: 'art', category: 'Art prints', tone: 'sage',
    eyebrow: '01 / ILUSTRACIONES', title: 'Arte para tu espacio.',
    description: 'Tus viñetas favoritas, en otro formato.', action: 'Ver ilustraciones',
    foregroundImage: products[1].image, foregroundAlt: products[1].title,
  },
  {
    id: 'collections', category: 'Colecciones', tone: 'ink',
    eyebrow: '02 / COLECCIONES', title: 'Más de tu historia.',
    description: 'Encuentra un lugar para cada volumen.', action: 'Ver colecciones',
    foregroundImage: products[3].image, foregroundAlt: products[3].title,
  },
];
