import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import type { ShopCategory, ShopProduct } from '../../data/shopProducts';
import { SHOP_CART_MAX_UNITS } from '../../hooks/useShopCart';

export const PaymentCardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20 4H4C2.9 4 2 4.9 2 6V8H22V6C22 4.9 21.1 4 20 4ZM2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V12H2V18ZM6 15H12V17H6V15Z" fill="currentColor" />
  </svg>
);

export type ShopFilter = 'Todo' | ShopCategory | 'Sale';

 const SHOP_FILTERS: { id: ShopFilter; label: string }[] = [
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

const getProductDescription = (product: ShopProduct) => {
  if (product.category === 'Art prints') {
    return 'Lámina de arte oficial impresa en alta definición con acabado mate de colección, ideal para enmarcar y decorar tu espacio favorito.';
  }
  if (product.category === 'Colecciones') {
    return 'Edición especial de colección que reúne los volúmenes principales de la obra con sobrecubierta ilustrada a todo color.';
  }
  return 'Edición impresa en español con sobrecubierta a color, papel de alta calidad y páginas interiores fieles a la publicación original.';
};

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
  onRemove: () => void;
}

export const ProductCard = ({ product, quantity, onOpen, onAdd, onRemove }: ProductCardProps) => {
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <article className={`shop-card ${product.soldOut ? 'is-sold-out' : ''}`}>
      <button type="button" onClick={onOpen} aria-label={`Ver ${product.title}`} className="shop-card__cover">
        <img src={product.image} alt={product.title} loading="lazy" decoding="async" />
        {product.soldOut ? (
          <span className="shop-badge shop-badge--soldout">Agotado</span>
        ) : discount > 0 ? (
          <span className="shop-badge shop-badge--sale">-{discount}%</span>
        ) : null}
      </button>

      <div className="shop-card__body">
        <h3 className="shop-card__title">
          <button type="button" onClick={onOpen}>{product.title}</button>
        </h3>
        <div className="shop-card__footer">
          <div className="shop-card__prices">
            <strong>{formatPrice(product.price)}</strong>
            {product.originalPrice && product.originalPrice > product.price && (
              <del>{formatPrice(product.originalPrice)}</del>
            )}
          </div>
          <div className="shop-card__qty">
            {quantity > 0 && (
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Quitar una unidad de ${product.title}`}
                className="shop-card__minus"
                title="Quitar una unidad"
              >
                <Minus size={15} strokeWidth={2.5} />
              </button>
            )}
            <button
              type="button"
              disabled={!canAddToCart(product, quantity)}
              onClick={onAdd}
              aria-label={`Añadir ${product.title} a la bolsa`}
              className={`shop-card__add ${quantity > 0 ? 'has-qty' : ''}`}
              title={product.soldOut ? 'Producto agotado' : quantity >= SHOP_CART_MAX_UNITS ? `Máximo ${SHOP_CART_MAX_UNITS} unidades` : 'Añadir a mi bolsa'}
            >
              <Plus size={16} strokeWidth={2.5} />
              {quantity > 0 && <span>{quantity}</span>}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

interface ProductSheetProps {
  product: ShopProduct | null;
  quantity: number;
  onAdd: (product: ShopProduct) => void;
  onRemove?: (product: ShopProduct) => void;
  onClose: () => void;
}

export const ProductSheet = forwardRef<HTMLDialogElement, ProductSheetProps>(({ product, quantity, onAdd, onRemove, onClose }, ref) => {
  const payAmount = product ? (product.price * Math.max(1, quantity)).toFixed(2) : '0.00';

  return (
    <dialog ref={ref} aria-label="Detalle del producto" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="shop-dialog shop-product-dialog">
      {product && (
        <div className={`shop-product-detail ${product.soldOut ? 'is-sold-out' : ''}`}>
          <button type="button" aria-label="Cerrar detalle" onClick={onClose} className="shop-dialog-close"><X size={20} /></button>
          <div className="shop-detail-art">
            <img src={product.image} alt={product.title} />
          </div>
          <div className="shop-detail-copy">
            <h2>{product.title}</h2>
            <p>{getProductDescription(product)}</p>
            <div className="shop-detail-price">
              <strong>{formatPrice(product.price * Math.max(1, quantity))} <small>USD</small></strong>
              {product.originalPrice && product.originalPrice > product.price && (
                <del>{formatPrice(product.originalPrice * Math.max(1, quantity))}</del>
              )}
            </div>
            <div className="shop-detail-actions">
              {product.soldOut ? (
                <button type="button" disabled className="shop-pay-button is-disabled">Agotado</button>
              ) : (
                <Link to={`/recargar/pago?monto=${payAmount}`} onClick={onClose} className="shop-pay-button">
                  <PaymentCardIcon />
                  <span>Pagar ahora ${payAmount} USD</span>
                </Link>
              )}
              <div className="shop-detail-bag-row">
                {quantity > 0 && onRemove && (
                  <button type="button" onClick={() => onRemove(product)} aria-label="Quitar una unidad" className="shop-card__minus shop-detail-minus">
                    <Minus size={16} strokeWidth={2.5} />
                  </button>
                )}
                <button type="button" disabled={!canAddToCart(product, quantity)} onClick={() => onAdd(product)} className="shop-button shop-detail-bag-btn">
                  <ShoppingBag size={17} />
                  <span>{quantity >= SHOP_CART_MAX_UNITS ? `Máximo (${SHOP_CART_MAX_UNITS})` : quantity > 0 ? `En mi bolsa (${quantity})` : 'Añadir a mi bolsa'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
});
ProductSheet.displayName = 'ProductSheet';
