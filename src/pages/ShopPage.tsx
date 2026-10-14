import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Heart, Minus, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { shopProducts as products, type ShopProduct } from '../data/shopProducts';
import { ShopShowcase } from '../components/shop/ShopShowcase';
import { useExperienceUser, useLocalExperience } from '../hooks/useLocalExperience';
import { SHOP_CART_MAX_UNITS, shopCartKey } from '../hooks/useShopCart';
import { lockPageScroll } from '../utils/scrollLock';
import { ProductCard, ProductSheet, canAddToCart, formatPrice } from '../components/shop/ShopKit';
import '../styles/shop.css';

type ShopDialog = 'product' | 'cart' | null;
const showcaseProducts = [products[13], products[15], products[9], products[14], products[0], products[5], products[10], products[4], products[11]];
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

/** Una misma tienda responsive: escaparate, catálogo y bolsa compartidos con el navbar. */
export default function ShopPage() {
  const user = useExperienceUser();
  return <Shop key={user.id} />;
}

function Shop() {
  const user = useExperienceUser();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [dialog, setDialog] = useState<ShopDialog>(null);
  const [cart, saveCart] = useLocalExperience<Record<string, number>>(shopCartKey(user.id), {});
  const [favorites, saveFavorites] = useLocalExperience<string[]>(`mm-shop-favorites-${user.id}`, []);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [notice, setNotice] = useState('');
  const productDialog = useRef<HTMLDialogElement>(null);
  const cartDialog = useRef<HTMLDialogElement>(null);
  const catalogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!dialog) return;
    const element = (dialog === 'product' ? productDialog : cartDialog).current;
    element?.showModal();
    const unlock = lockPageScroll();
    return () => { element?.close(); unlock(); };
  }, [dialog]);

  useEffect(() => {
    if (!notice || dialog) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice, dialog]);

  const cartProducts = products.filter((product) => (cart[product.id] || 0) > 0);
  const count = cartProducts.reduce((sum, product) => sum + cart[product.id], 0);
  const total = cartProducts.reduce((sum, product) => sum + product.price * cart[product.id], 0);
  const needle = normalize(query.trim());
  const filtered = products.filter((product) => normalize(product.title).includes(needle) && (!onlyFavorites || favorites.includes(product.id)));
  const toggleFavorite = (product: ShopProduct) => {
    try { saveFavorites(favorites.includes(product.id) ? favorites.filter((id) => id !== product.id) : [...favorites, product.id]); }
    catch (caught) { setNotice((caught as Error).message); }
  };
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
    <>
      <main className="shop-page" aria-labelledby="shop-title">
        <div className="shop-shell">
          <header className="shop-toolbar">
            <form className="shop-search" role="search" onSubmit={(event) => { event.preventDefault(); catalogRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }}>
              <Search size={23} aria-hidden="true" />
              <input type="search" aria-label="Buscar productos" placeholder="Busca lo mejor de tus personajes" value={query} onChange={(event) => setQuery(event.target.value)} />
              {query && <button type="button" className="shop-search-clear" aria-label="Limpiar búsqueda de productos" onClick={() => setQuery('')}><X size={17} /></button>}
            </form>
            <div className="shop-toolbar-actions">
              <button type="button" className="shop-toolbar-icon" aria-label="Ver mis productos favoritos" aria-pressed={onlyFavorites} onClick={() => { setOnlyFavorites((value) => !value); setQuery(''); }}><Heart size={26} fill={onlyFavorites ? 'currentColor' : 'none'} /></button>
              <button type="button" className="shop-toolbar-icon shop-bag" onClick={() => { setNotice(''); setDialog('cart'); }} aria-label={`Mi bolsa, ${count} productos`}><ShoppingBag size={25} /><span>{count}</span></button>
            </div>
          </header>

          <ShopShowcase products={showcaseProducts} onOpen={openProduct} />

          <section id="productos" ref={catalogRef} className="shop-catalog" aria-labelledby="shop-title">
            <h1 id="shop-title" className="shop-catalog-heading shop-catalog-brand">TIENDA<span>MUKAI</span></h1>
            <h2 className="shop-catalog-subtitle">Encuentra lo mejor de tus personajes favoritos</h2>
            <div className="shop-product-grid" aria-label="Productos del catálogo">
              {filtered.map((product) => <ProductCard key={product.id} product={product} quantity={cart[product.id] || 0} onOpen={() => openProduct(product)} onAdd={() => changeCart(product, 1)} favorite={favorites.includes(product.id)} onToggleFavorite={() => toggleFavorite(product)} />)}
            </div>
            {!filtered.length && <div className="shop-empty"><Search size={28} /><h3>{onlyFavorites ? 'Tu colección de favoritos empieza aquí' : 'No encontramos ese producto'}</h3><p>{onlyFavorites ? 'Toca el corazón de una portada para guardarla aquí.' : 'Prueba otro título.'}</p><button type="button" className="shop-button" onClick={() => { setOnlyFavorites(false); setQuery(''); }}>Ver todo el catálogo <ArrowRight size={16} /></button></div>}
          </section>
        </div>

        {notice && !dialog && <div className="shop-toast" role="status"><Check size={17} /><span>{notice}</span><button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={16} /></button></div>}
        <ProductSheet ref={productDialog} product={selected} quantity={selected ? cart[selected.id] || 0 : 0} onAdd={(product) => changeCart(product, 1)} onClose={closeDialog} notice={notice} />

        <dialog className="shop-dialog" aria-labelledby="shop-cart-title" ref={cartDialog} onClose={closeDialog}>
          <button type="button" className="shop-dialog-close" aria-label="Cerrar bolsa" onClick={closeDialog}><X size={21} /></button>
          <span className="shop-eyebrow">Tu selección</span><h2 id="shop-cart-title">Mi bolsa <span>({count})</span></h2>
          {!count ? <div className="shop-empty"><ShoppingBag size={32} /><h3>Tu bolsa está vacía</h3><p>Elige un manga o una ilustración para empezar.</p><button type="button" className="shop-button" onClick={closeDialog}>Seguir explorando <ArrowRight size={16} /></button></div> : <>
            <div className="shop-cart-items">{cartProducts.map((product) => <div className="shop-cart-row" key={product.id}><img src={product.image} alt="" /><div><strong>{product.title}</strong><small>{formatPrice(product.price)} USD</small></div><div className="shop-cart-quantity"><button type="button" aria-label={`Quitar una unidad de ${product.title}`} onClick={() => changeCart(product, -1)}><Minus size={15} /></button><span>{cart[product.id]}</span><button type="button" disabled={!canAddToCart(product, cart[product.id])} aria-label={`Añadir una unidad de ${product.title}`} onClick={() => changeCart(product, 1)}><Plus size={15} /></button></div></div>)}</div>
            <div className="shop-cart-total"><strong>Total de muestra</strong><strong>{formatPrice(total)} USD</strong></div>
            <p className="shop-dialog-note">Tu bolsa se guarda en este navegador. Esta tienda de demostración no realiza cobros ni pedidos.</p>
            <p className="shop-dialog-status" role="status">{notice}</p>
          </>}
        </dialog>
      </main>
    </>
  );
}
