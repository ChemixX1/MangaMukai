import { forwardRef } from 'react';
import { ArrowUpRight, Plus, ShoppingBag, X } from 'lucide-react';
import type { ShopCategory, ShopProduct } from '../../data/shopProducts';
import { SHOP_CART_MAX_UNITS } from '../../hooks/useShopCart';

export type ShopFilter = 'Todo' | ShopCategory | 'Sale';

export const SHOP_FILTERS: { id: ShopFilter; label: string }[] = [
  { id: 'Todo', label: 'Todo' },
  { id: 'Manga', label: 'Manga' },
  { id: 'Art prints', label: 'Ilustraciones' },
  { id: 'Colecciones', label: 'Colecciones' },
  { id: 'Sale', label: 'Ofertas' },
];
export const matchesFilter = (product: ShopProduct, filter: ShopFilter) =>
  filter === 'Todo' || (filter === 'Sale' ? Boolean(product.sale) : product.category === filter);
export const formatPrice = (value: number) => `$${value.toFixed(2)}`;
export const canAddToCart = (product: ShopProduct, quantity: number) => !product.soldOut && quantity < SHOP_CART_MAX_UNITS;
const categoryLabel = (category: ShopCategory) => category === 'Art prints' ? 'Ilustración' : category === 'Colecciones' ? 'Colección' : 'Manga';

export const FilterPills = ({ value, onChange }: { value: ShopFilter; onChange: (filter: ShopFilter) => void }) => (
  <div className="shop-filters" role="group" aria-label="Filtrar productos">
    {SHOP_FILTERS.map((item) => <button key={item.id} type="button" aria-pressed={value === item.id} onClick={() => onChange(item.id)}>{item.label}</button>)}
  </div>
);

interface ProductCardProps {
  product: ShopProduct;
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
}

/** Portada completa, una sola etiqueta de estado y acceso directo a la bolsa. */
export const ProductCard = ({ product, quantity, onOpen, onAdd }: ProductCardProps) => (
  <article className="shop-product">
    <button type="button" onClick={onOpen} aria-label={`Ver ${product.title}`} className="shop-product-cover">
      <img src={product.image} alt={product.title} loading="lazy" decoding="async" />
      {(product.soldOut || product.sale || product.hot) && <span className={`shop-product-badge ${product.soldOut ? 'is-sold-out' : product.sale ? 'is-sale' : ''}`}>{product.soldOut ? 'Agotado' : product.sale ? 'Oferta' : 'Selección Mukai'}</span>}
      <span className="shop-product-peek" aria-hidden="true"><ArrowUpRight size={17} /></span>
    </button>
    <div className="shop-product-info">
      <span className="shop-product-category">{categoryLabel(product.category)}</span>
      <h3><button type="button" onClick={onOpen}>{product.title}</button></h3>
      <div className="shop-product-bottom">
        <div><strong>{formatPrice(product.price)} <small>USD</small></strong><span className="shop-product-quantity">{quantity > 0 ? `${quantity} en tu bolsa` : '\u00a0'}</span></div>
        <button type="button" disabled={!canAddToCart(product, quantity)} onClick={onAdd} aria-label={`Añadir ${product.title} al carrito`} className="shop-product-add" title={product.soldOut ? 'Producto agotado' : quantity >= SHOP_CART_MAX_UNITS ? `Máximo ${SHOP_CART_MAX_UNITS} unidades` : 'Añadir a mi bolsa'}><Plus size={18} /></button>
      </div>
    </div>
  </article>
);

interface ProductSheetProps {
  product: ShopProduct | null;
  quantity: number;
  onAdd: (product: ShopProduct) => void;
  onClose: () => void;
  notice?: string;
}

export const ProductSheet = forwardRef<HTMLDialogElement, ProductSheetProps>(({ product, quantity, onAdd, onClose, notice }, ref) => (
  <dialog ref={ref} aria-label="Detalle del producto" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="shop-dialog shop-product-dialog">
    {product && (
      <div className="shop-product-detail">
        <button type="button" aria-label="Cerrar detalle" onClick={onClose} className="shop-dialog-close"><X size={21} /></button>
        <div className="shop-detail-art"><img src={product.image} alt={product.title} /><span>{categoryLabel(product.category)}</span></div>
        <div className="shop-detail-copy">
          <span className="shop-eyebrow">Tienda Mukai</span>
          <h2>{product.title}</h2>
          <p>{product.category === 'Art prints' ? 'Una ilustración para llevar el arte de esta historia a tu espacio favorito.' : product.category === 'Colecciones' ? 'Una colección para volver a tus historias favoritas, volumen a volumen.' : 'Haz un espacio en tu estantería para tu próxima lectura.'}</p>
          <dl><div><dt>Formato</dt><dd>{categoryLabel(product.category)}</dd></div><div><dt>Disponibilidad</dt><dd>{product.soldOut ? 'Agotado' : 'Disponible en el catálogo'}</dd></div></dl>
          <div className="shop-detail-purchase">
            <strong>{formatPrice(product.price)} <small>USD</small></strong>
            <button type="button" disabled={!canAddToCart(product, quantity)} onClick={() => onAdd(product)} className="shop-button shop-button--ink">{product.soldOut ? 'Agotado' : quantity >= SHOP_CART_MAX_UNITS ? `Máximo ${SHOP_CART_MAX_UNITS}` : <><ShoppingBag size={17} /> Añadir a mi bolsa</>}</button>
          </div>
          <p role="status" className="shop-dialog-status">{notice || (quantity > 0 ? `${quantity} en tu bolsa` : '')}</p>
          <small className="shop-dialog-note">Precio de demostración. Sin cobros ni pedidos reales.</small>
        </div>
      </div>
    )}
  </dialog>
));
ProductSheet.displayName = 'ProductSheet';
