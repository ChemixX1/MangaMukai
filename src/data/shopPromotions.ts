import { shopProducts as products } from './shopProducts';
import type { ShopPromotionProps } from '../components/common/ShopPromotion';

// Replace backgroundImage with the design INSIDE the panel and foregroundImage
// with a transparent PNG/WebP to let a character or product extend beyond it.
export const shopPromotions: (Omit<ShopPromotionProps, 'onExplore'> & { id: string; category: string })[] = [
  {
    id: 'new', category: 'Todo', tone: 'rose', foregroundType: 'character',
    eyebrow: 'RECIÉN LLEGADOS', title: 'Fuera de la viñeta', action: 'Ver novedades',
    backgroundImage: products[2].image,
    foregroundImage: '/images/promotions/gojo-cutout.png', foregroundAlt: 'Satoru Gojo sobresaliendo del panel',
  },
  {
    id: 'art', category: 'Art prints', tone: 'lilac',
    eyebrow: 'MUKAI SELECT', title: 'Arte para tu mundo', action: 'Explorar colección',
    backgroundImage: products[1].image,
    foregroundImage: products[1].image, foregroundAlt: products[1].title,
  },
  {
    id: 'sale', category: 'Sale', tone: 'peach',
    eyebrow: 'FAVORITOS EN SALE', title: 'Una historia más', action: 'Descubrir ofertas',
    backgroundImage: products[4].image,
    foregroundImage: products[4].image, foregroundAlt: products[4].title,
  },
];
