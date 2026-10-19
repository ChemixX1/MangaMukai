import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpDown, Check, Minus, Plus, Search, ShoppingBag, Star, X } from 'lucide-react';
import { shopProducts as products, type ShopProduct } from '../data/shopProducts';
import { ShopShowcase } from '../components/shop/ShopShowcase';
import { Footer } from '../components/layout';
import { useExperienceUser, useLocalExperience } from '../hooks/useLocalExperience';
import { SHOP_CART_MAX_UNITS, shopCartKey } from '../hooks/useShopCart';
import { lockPageScroll } from '../utils/scrollLock';
import { FilterPills, PaymentCardIcon, ProductCard, ProductSheet, canAddToCart, formatPrice, matchesFilter, type ShopFilter } from '../components/shop/ShopKit';
import '../styles/shop.css';

type ShopDialog = 'product' | 'cart' | null;
type PriceSort = 'default' | 'asc' | 'desc';

const PRICE_SORT_OPTIONS: { id: PriceSort; label: string }[] = [
  { id: 'default', label: 'Destacados' },
  { id: 'asc', label: 'Precio: menor a mayor' },
  { id: 'desc', label: 'Precio: mayor a menor' },
];

const showcaseProducts = [products[13], products[15], products[9], products[14], products[0], products[5], products[10], products[4], products[11]];

const SHOP_REVIEWS = [
  {
    id: 'rev-1',
    author: 'Valeria M.',
    role: 'Lectora verificada',
    avatar: products[0].image,
    rating: 5,
    quote: 'La calidad de impresión y el relieve de la sobrecubierta superaron mis expectativas. Llegó protegido al milímetro.',
  },
  {
    id: 'rev-2',
    author: 'Renato K.',
    role: 'Miembro de la comunidad',
    avatar: products[4].image,
    rating: 5,
    quote: 'El acabado mate de la ilustración se ve increíble enmarcado. Los colores del arte original resaltan muchísimo.',
  },
  {
    id: 'rev-3',
    author: 'Camila S.',
    role: 'Coleccionista',
    avatar: products[10].image,
    rating: 5,
    quote: 'Pedí la edición de colección y cada tomo trae páginas a color con un papel excelente. Totalmente recomendado.',
  },
];

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export default function ShopPage() {
  const user = useExperienceUser();
  return <Shop key={user.id} />;
}

function Shop() {
  const user = useExperienceUser();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ShopFilter>('Todo');
  const [priceSort, setPriceSort] = useState<PriceSort>('default');
  const [sortOpen, setSortOpen] = useState(false);
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [dialog, setDialog] = useState<ShopDialog>(null);
  const [cart, saveCart] = useLocalExperience<Record<string, number>>(shopCartKey(user.id), {});
  const [notice, setNotice] = useState('');
  const productDialog = useRef<HTMLDialogElement>(null);
  const cartDialog = useRef<HTMLDialogElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dialog) return;
    const element = (dialog === 'product' ? productDialog : cartDialog).current;
    if (!element) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const position = { left: window.scrollX, top: window.scrollY };
    const unlock = lockPageScroll({ preservePosition: true });
    element.showModal();
    element.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    window.scrollTo({ ...position, behavior: 'instant' });
    return () => { element.close(); opener?.focus({ preventScroll: true }); unlock(); };
  }, [dialog]);

  useEffect(() => {
    if (!notice || dialog) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice, dialog]);

  useEffect(() => {
    if (!sortOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [sortOpen]);

  const cartProducts = products.filter((product) => (cart[product.id] || 0) > 0);
  const count = cartProducts.reduce((sum, product) => sum + cart[product.id], 0);
  const total = cartProducts.reduce((sum, product) => sum + product.price * cart[product.id], 0);
  const needle = normalize(query.trim());

  const visibleProducts = useMemo(() => {
    const base = products.filter(
      (product) => matchesFilter(product, filter) && normalize(product.title).includes(needle),
    );
    const sorted = [...base];
    if (priceSort === 'asc') sorted.sort((a, b) => a.price - b.price);
    else if (priceSort === 'desc') sorted.sort((a, b) => b.price - a.price);
    return sorted.slice(0, 8);
  }, [filter, needle, priceSort]);

  const openProduct = (product: ShopProduct) => { setNotice(''); setSelected(product); setDialog('product'); };
  const closeDialog = () => setDialog(null);
  const changeCart = (product: ShopProduct, delta: number) => {
    if (delta > 0 && !canAddToCart(product, cart[product.id] || 0)) return;
    const next = { ...cart };
    const quantity = Math.max(0, Math.min(SHOP_CART_MAX_UNITS, (cart[product.id] || 0) + delta));
    if (quantity) next[product.id] = quantity;
    else delete next[product.id];
    try { saveCart(next); setNotice(delta > 0 ? 'Producto añadido a tu bolsa' : 'Bolsa actualizada'); }
    catch (caught) { setNotice((caught as Error).message); }
  };

  return (
    <main className="shop-page" aria-labelledby="shop-title">
      <div className="shop-shell">
        <ShopShowcase products={showcaseProducts} onOpen={openProduct} />

        <header className="shop-header">
          <div className="shop-header__bar">
            <h1 id="shop-title" className="shop-header__headline">
              Encuentra Productos De Tus Personajes Favoritos
            </h1>

            <div className="shop-controls-row">
              <form
                className="shop-search"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  catalogRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
                }}
              >
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Buscar productos"
                  placeholder="Buscar en el catálogo..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button type="button" className="shop-search-clear" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}>
                    <X size={15} />
                  </button>
                )}
              </form>

              <div className="shop-sort-wrap" ref={sortMenuRef}>
                <button
                  type="button"
                  className="shop-icon-btn"
                  aria-label="Ordenar por precio"
                  aria-expanded={sortOpen}
                  aria-pressed={priceSort !== 'default'}
                  onClick={() => setSortOpen((prev) => !prev)}
                  title="Ordenar por precio"
                >
                  <ArrowUpDown size={19} />
                </button>
                {sortOpen && (
                  <div className="shop-sort-menu" role="menu" aria-label="Ordenar por precio">
                    {PRICE_SORT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={priceSort === option.id}
                        className={priceSort === option.id ? 'is-active' : ''}
                        onClick={() => {
                          setPriceSort(option.id);
                          setSortOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                        {priceSort === option.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="shop-icon-btn shop-bag-btn"
                onClick={() => { setNotice(''); setDialog('cart'); }}
                aria-label={`Mi bolsa, ${count} productos`}
              >
                <ShoppingBag size={19} />
                <span>{count}</span>
              </button>
            </div>
          </div>

          <div className="shop-header__filters">
            <FilterPills value={filter} onChange={setFilter} />
          </div>
        </header>

        <section id="productos" ref={catalogRef} className="shop-catalog" aria-label="Catálogo de productos">
          <div className="shop-product-grid">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={cart[product.id] || 0}
                onOpen={() => openProduct(product)}
                onAdd={() => changeCart(product, 1)}
                onRemove={() => changeCart(product, -1)}
              />
            ))}
          </div>

          {!visibleProducts.length && (
            <div className="shop-empty">
              <Search size={28} />
              <h3>No encontramos resultados</h3>
              <p>Intenta con otro término o explora todas las categorías.</p>
              <button type="button" className="shop-button" onClick={() => { setFilter('Todo'); setPriceSort('default'); setQuery(''); }}>
                Mostrar todo el catálogo <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>

        <section className="shop-reviews" aria-labelledby="shop-reviews-title">
          <div className="shop-reviews__head">
            <h2 id="shop-reviews-title">Reseña de Usuarios</h2>
          </div>

          <div className="shop-review-track">
            {SHOP_REVIEWS.map((review) => (
              <article key={review.id} className="shop-review-card">
                <div className="shop-review-card__top">
                  <div className="shop-review-author">
                    <img src={review.avatar} alt={review.author} loading="lazy" decoding="async" />
                    <div>
                      <h3>{review.author}</h3>
                      <span>{review.role}</span>
                    </div>
                  </div>
                  <div className="shop-review-stars" aria-label={`${review.rating} de 5 estrellas`}>
                    {Array.from({ length: review.rating }).map((_, idx) => (
                      <Star key={idx} size={13} fill="currentColor" />
                    ))}
                  </div>
                </div>

                <p className="shop-review-card__quote">{review.quote}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <Footer homeDesign className="shop-footer" />

      {notice && !dialog && (
        <div className="shop-toast" role="status">
          <Check size={17} />
          <span>{notice}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}

      <ProductSheet
        ref={productDialog}
        product={selected}
        quantity={selected ? cart[selected.id] || 0 : 0}
        onAdd={(product) => changeCart(product, 1)}
        onRemove={(product) => changeCart(product, -1)}
        onClose={closeDialog}
      />

      <dialog className="shop-dialog shop-cart-dialog" aria-labelledby="shop-cart-title" ref={cartDialog} onClose={closeDialog} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
        <button type="button" className="shop-dialog-close" aria-label="Cerrar bolsa" onClick={closeDialog}><X size={20} /></button>
        <h2 id="shop-cart-title">Mi bolsa <span>({count})</span></h2>
        {!count ? (
          <div className="shop-empty">
            <ShoppingBag size={32} />
            <h3>Tu bolsa está vacía</h3>
            <p>Elige un manga o una ilustración para empezar.</p>
            <button type="button" className="shop-button" onClick={closeDialog}>Seguir explorando <ArrowRight size={16} /></button>
          </div>
        ) : (
          <>
            <div className="shop-cart-items">
              {cartProducts.map((product) => (
                <div className="shop-cart-row" key={product.id}>
                  <img src={product.image} alt="" />
                  <div>
                    <strong>{product.title}</strong>
                    <small>{formatPrice(product.price)} USD</small>
                  </div>
                  <div className="shop-cart-quantity">
                    <button type="button" aria-label={`Quitar una unidad de ${product.title}`} onClick={() => changeCart(product, -1)}><Minus size={15} /></button>
                    <span>{cart[product.id]}</span>
                    <button type="button" disabled={!canAddToCart(product, cart[product.id])} aria-label={`Añadir una unidad de ${product.title}`} onClick={() => changeCart(product, 1)}><Plus size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="shop-cart-total">
              <strong>Total</strong>
              <strong>{formatPrice(total)} USD</strong>
            </div>
            <Link className="shop-pay-button shop-cart-pay" to={`/recargar/pago?monto=${total.toFixed(2)}`} onClick={closeDialog}>
              <PaymentCardIcon />
              <span>Ir a medios de pago {formatPrice(total)} USD</span>
            </Link>
          </>
        )}
      </dialog>
    </main>
  );
}
