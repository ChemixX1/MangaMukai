import type { ShopProduct } from '../../data/shopProducts';
import CircularCarousel from './CircularCarousel';

interface ShopShowcaseProps {
  products: ShopProduct[];
  onOpen: (product: ShopProduct) => void;
}

export function ShopShowcase({ products, onOpen }: ShopShowcaseProps) {
  if (!products.length) return null;

  return <section className="shop-showcase" aria-label="Selección de la tienda">
    <div className="shop-circular-carousel">
      <CircularCarousel
        items={products.map((product) => ({ src: product.image, alt: product.title }))}
        preset="cylinder" intro="rise" cardWidth={400} aspectRatio={1} speed={14}
        captions={false} gap={18} tilt={-5} curve={1} perspective={2500}
        autoplay="drift" interval={3} direction="left" momentum={0.6}
        snap pauseOnHover focusOnClick draggable parallax={0.3} stretch={0.5}
        fadeColor="transparent" depthFade={0} innerShade={1} cornerRadius={12}
        onItemClick={(_item, index) => onOpen(products[index])}
      />
    </div>
  </section>;
}
