import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, Flame, Plus, ShoppingBag, Sparkles, X } from 'lucide-react';

import products from '../../../data/shop-products.json';
import { SHOP_CART_MAX_UNITS, useShopCart } from '../../../hooks/useShopCart';
import { MobileFooter } from '../../home/mobile/MobileFooter';
import '../../home/mobile/mobile-home.css';
import './mobile-shop.css';

type Product = (typeof products)[number];
type Category = 'Todo' | 'Manga' | 'Art prints' | 'Colecciones' | 'Sale';

const categories: { id: Category; label: string }[] = [
  { id: 'Todo', label: 'Todo' },
  { id: 'Manga', label: 'Manga' },
  { id: 'Art prints', label: 'Arte' },
  { id: 'Colecciones', label: 'Colecciones' },
  { id: 'Sale', label: 'Sale' },
];

const money = (value: number) => `$${value.toFixed(2)}`;

/**
 * Tienda móvil: una pequeña revista de colección que comparte el lenguaje
 * visual del home (tinta, rosa, celeste y titulares muy gráficos).
 */
export const MobileShop = () => {
  const [category, setCategory] = useState<Category>('Todo');
  const [selected, setSelected] = useState<Product | null>(null);
  const [addedProduct, setAddedProduct] = useState<string | null>(null);
  const productDialog = useRef<HTMLDialogElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const { cart, count, setQuantity } = useShopCart();

  const visibleProducts = useMemo(
    () => products.filter((product) => category === 'Todo' || (category === 'Sale' ? product.sale : product.category === category)),
    [category],
  );

  useEffect(() => {
    if (!addedProduct) return;
    const timer = window.setTimeout(() => setAddedProduct(null), 1800);
    return () => window.clearTimeout(timer);
  }, [addedProduct]);

  const showProduct = (product: Product) => {
    setSelected(product);
    productDialog.current?.showModal();
  };

  const addProduct = (product: Product) => {
    if (product.soldOut || (cart[product.id] || 0) >= SHOP_CART_MAX_UNITS) return;
    setQuantity(product.id, (cart[product.id] || 0) + 1);
    setAddedProduct(product.title);
  };

  const selectCategory = (nextCategory: Category) => {
    setCategory(nextCategory);
    window.requestAnimationFrame(() => catalogRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    }));
  };

  const featured = products[4];
  const newest = products[0];

  return (
    <div className="mh-root ms-root">
      <main className="ms-main" aria-labelledby="ms-title">
        <section className="ms-intro">
          <div className="ms-issue-line" aria-hidden="true">
            <span>EDICIÓN 01</span>
            <span>MUKAI ORIGINALS</span>
            <span>2026</span>
          </div>

          <div className="ms-title-lockup">
            <p>Historias que salen de la pantalla</p>
            <h1 id="ms-title">TU PRÓXIMA<br /><span>OBSESIÓN</span></h1>
          </div>

          <button className="ms-scroll-cue" type="button" onClick={() => catalogRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <span>Explora el drop</span>
            <ArrowDown size={17} aria-hidden="true" />
          </button>

          <article className="ms-hero-card">
            <div className="ms-hero-halftone" aria-hidden="true" />
            <div className="ms-hero-copy">
              <span className="ms-kicker"><Sparkles size={13} /> Mukai select</span>
              <h2>EL ARTE<br />SE QUEDA<br />CONTIGO</h2>
              <p>{featured.title}</p>
              <button type="button" onClick={() => showProduct(featured)}>
                Ver edición <ArrowRight size={17} />
              </button>
            </div>
            <button className="ms-hero-cover" type="button" onClick={() => showProduct(featured)} aria-label={`Ver ${featured.title}`}>
              <span>DROP<br />01</span>
              <img src={featured.image} alt={featured.title} />
            </button>
          </article>
        </section>

        <section ref={catalogRef} className="ms-catalog" aria-labelledby="ms-catalog-title">
          <header className="ms-section-heading">
            <div>
              <span>PARA TU ESTANTERÍA</span>
              <h2 id="ms-catalog-title">Elige tu<br />favorito</h2>
            </div>
            <p>{visibleProducts.length.toString().padStart(2, '0')}<small>PIEZAS</small></p>
          </header>

          <div className="ms-filters-wrap">
            <div className="ms-filters mh-no-scrollbar" role="tablist" aria-label="Filtrar productos">
              {categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={category === item.id}
                  onClick={() => selectCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ms-product-grid">
            {visibleProducts.map((product, index) => (
              <article className="ms-product-card" key={product.id}>
                <button className="ms-product-visual" type="button" onClick={() => showProduct(product)} aria-label={`Ver ${product.title}`}>
                  <span className="ms-card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <img src={product.image} alt={product.title} loading="lazy" decoding="async" />
                  <span className="ms-product-flags">
                    {product.hot && <span className="ms-hot-flag"><Flame size={12} fill="currentColor" /> HOT</span>}
                    {product.sale && <span className="ms-sale-flag">SALE</span>}
                  </span>
                  {product.soldOut && <span className="ms-sold-flag">AGOTADO</span>}
                </button>

                <div className="ms-product-copy">
                  <button className="ms-product-name" type="button" onClick={() => showProduct(product)}>{product.title}</button>
                  <div className="ms-product-buy">
                    <strong>{money(product.price)}<small> USD</small></strong>
                    <button
                      type="button"
                      disabled={product.soldOut || (cart[product.id] || 0) >= SHOP_CART_MAX_UNITS}
                      onClick={() => addProduct(product)}
                      aria-label={`Añadir ${product.title} al carrito`}
                    >
                      {(cart[product.id] || 0) > 0 ? <span>{cart[product.id]}</span> : <Plus size={18} />}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visibleProducts.length === 0 && <p className="ms-empty">Todavía no hay piezas en esta selección.</p>}
        </section>

        <section className="ms-drop-banner" aria-label="Novedad de la tienda">
          <div className="ms-drop-copy">
            <span>RECIÉN LLEGADO</span>
            <h2>UNA HISTORIA.<br />OTRA FORMA<br />DE VIVIRLA.</h2>
            <p>{newest.title}</p>
            <button type="button" onClick={() => showProduct(newest)}>Descubrir <ArrowRight size={17} /></button>
          </div>
          <button type="button" className="ms-drop-cover" onClick={() => showProduct(newest)} aria-label={`Ver ${newest.title}`}>
            <img src={newest.image} alt={newest.title} loading="lazy" decoding="async" />
          </button>
        </section>

        <aside className="ms-store-note">
          <ShoppingBag size={21} aria-hidden="true" />
          <div><strong>{count ? `${count} ${count === 1 ? 'pieza' : 'piezas'} en tu carrito` : 'Tu colección empieza aquí'}</strong><span>Catálogo de demostración · sin pagos habilitados</span></div>
        </aside>
      </main>

      <MobileFooter />

      <dialog ref={productDialog} className="ms-product-dialog" onClick={(event) => { if (event.target === productDialog.current) productDialog.current?.close(); }}>
        {selected && (
          <div className="ms-dialog-sheet">
            <div className="ms-dialog-grab" aria-hidden="true" />
            <button className="ms-dialog-close" type="button" aria-label="Cerrar detalle" onClick={() => productDialog.current?.close()}><X size={22} /></button>
            <div className="ms-dialog-visual">
              <img src={selected.image} alt={selected.title} />
              <span>{selected.sale ? 'SALE / ' : ''}{selected.category}</span>
            </div>
            <div className="ms-dialog-copy">
              <span>MUKAI COLLECTION · {selected.id}</span>
              <h2>{selected.title}</h2>
              <p>Una pieza para llevar contigo esa historia que no querías dejar atrás.</p>
              <div className="ms-dialog-action">
                <strong>{money(selected.price)} <small>USD</small></strong>
                <button type="button" disabled={selected.soldOut || (cart[selected.id] || 0) >= SHOP_CART_MAX_UNITS} onClick={() => addProduct(selected)}>
                  {selected.soldOut ? 'Agotado' : (cart[selected.id] || 0) >= SHOP_CART_MAX_UNITS ? 'Máximo 10' : <><ShoppingBag size={18} /> Añadir</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>

      <div className={`ms-added-toast ${addedProduct ? 'is-visible' : ''}`} role="status" aria-live="polite">
        <Check size={16} strokeWidth={3} />
        <span><strong>Añadido</strong>{addedProduct}</span>
      </div>
    </div>
  );
};
