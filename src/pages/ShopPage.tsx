import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, MessageSquare, Minus, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { Footer } from '../components/layout';
import { shopProducts as products, type ShopProduct } from '../data/shopProducts';
import { shopPromotions } from '../data/shopPromotions';
import { ShopPromotion } from '../components/shop/ShopPromotion';
import { readLocalImage, useExperienceUser, useLocalExperience } from '../hooks/useLocalExperience';
import { SHOP_CART_MAX_UNITS, shopCartKey } from '../hooks/useShopCart';
import { lockPageScroll } from '../utils/scrollLock';
import { FilterPills, ProductCard, ProductSheet, canAddToCart, formatPrice, matchesFilter, type ShopFilter } from '../components/shop/ShopKit';
import '../styles/shop.css';

type Review = { id: string; name: string; text: string; image: string; productId: string; demo?: boolean };
type ShopDialog = 'product' | 'cart' | 'review' | null;
const PAGE_SIZE = 8;
const sampleReviews: Review[] = [
  { id: 'review-1', name: 'Sofía', text: 'Un nuevo favorito para mi rincón de lectura. Me encanta tener una pequeña parte de esta historia en mi colección', image: products[0].image, productId: products[0].id, demo: true },
  { id: 'review-2', name: 'Mateo', text: 'Los colores y la ilustración se ven increíbles. Ese detalle especial que le faltaba a mi estantería', image: products[1].image, productId: products[1].id, demo: true },
  { id: 'review-3', name: 'Lucía', text: 'Para quienes siempre decimos «un capítulo más». Ya tengo un espacio reservado para mi próxima historia', image: products[2].image, productId: products[2].id, demo: true },
];
const heroProduct = products[13];
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

/** Una misma tienda responsive: escaparate, catálogo y bolsa compartidos con el navbar. */
export default function ShopPage() {
  const user = useExperienceUser();
  return <Shop key={user.id} />;
}

function Shop() {
  const user = useExperienceUser();
  const [category, setCategory] = useState<ShopFilter>('Todo');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [dialog, setDialog] = useState<ShopDialog>(null);
  const [cart, saveCart] = useLocalExperience<Record<string, number>>(shopCartKey(user.id), {});
  const [reviews, saveReviews] = useLocalExperience<Review[]>(`mm-shop-reviews-${user.id}`, sampleReviews);
  const [allReviews, setAllReviews] = useState(false);
  const [notice, setNotice] = useState('');
  const [reviewName, setReviewName] = useState(user.signedIn ? user.name.split(' ')[0] : '');
  const [reviewText, setReviewText] = useState('');
  const [reviewImage, setReviewImage] = useState('');
  const [reviewProduct, setReviewProduct] = useState(products[0].id);
  const [readingImage, setReadingImage] = useState(false);
  const productDialog = useRef<HTMLDialogElement>(null);
  const cartDialog = useRef<HTMLDialogElement>(null);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!dialog) return;
    const element = (dialog === 'product' ? productDialog : dialog === 'cart' ? cartDialog : reviewDialog).current;
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
  const filtered = products.filter((product) => matchesFilter(product, category) && normalize(product.title).includes(needle))
    .sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : Number(!!b.hot) - Number(!!a.hot));
  const visible = filtered.slice(0, limit);

  const selectCategory = (next: ShopFilter) => { setCategory(next); setLimit(PAGE_SIZE); };
  const explore = (next: ShopFilter) => {
    selectCategory(next);
    setQuery('');
    catalogRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
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
  const submitReview = (event: FormEvent) => {
    event.preventDefault();
    if (!reviewImage || !reviewText.trim() || !reviewName.trim() || readingImage) return;
    try {
      saveReviews([{ id: crypto.randomUUID(), name: reviewName.trim().split(/\s+/)[0], text: reviewText.trim(), image: reviewImage, productId: reviewProduct }, ...reviews]);
      setReviewText('');
      setReviewImage('');
      if (fileInput.current) fileInput.current.value = '';
      setDialog(null);
      setNotice('Tu reseña se ha guardado en este navegador');
    } catch (caught) { setNotice((caught as Error).message); }
  };

  return (
    <>
      <main className="shop-page" aria-labelledby="shop-title">
        <div className="shop-shell">
          <header className="shop-masthead">
            <div><span className="shop-eyebrow">Para lectores y coleccionistas</span><h1 id="shop-title">Tienda <span>Mukai</span><i aria-hidden="true">✦</i></h1></div>
            <button type="button" className="shop-button shop-bag" onClick={() => { setNotice(''); setDialog('cart'); }} aria-label={`Mi bolsa, ${count} productos`}><ShoppingBag size={18} /> Mi bolsa <span>{count}</span></button>
          </header>

          <section className="shop-showcase" aria-label="Selección de la tienda">
            <article className="shop-hero">
              <div className="shop-hero-copy">
                <span className="shop-stamp"><BookOpen size={13} aria-hidden="true" /> Selección Mukai</span>
                <h2>Historias<br />para tu<br /><em>colección.</em></h2>
                <p>Un manga para tu estantería. Una ilustración para tu rincón favorito.</p>
                <button type="button" className="shop-button shop-button--ink" onClick={() => explore('Todo')}>Explorar catálogo <ArrowDown size={17} /></button>
              </div>
              <button type="button" className="shop-hero-art" onClick={() => openProduct(heroProduct)} aria-label={`Ver selección: ${heroProduct.title}`}>
                <span className="shop-art-dots" aria-hidden="true" />
                <span className="shop-hero-word" aria-hidden="true">MUKAI</span>
                <img className="shop-hero-book shop-hero-book--back" src={products[14].image} alt="" />
                <img className="shop-hero-book shop-hero-book--front" src={heroProduct.image} alt={heroProduct.title} fetchPriority="high" />
                <span className="shop-hero-price">{formatPrice(heroProduct.price)} <small>USD</small></span>
                <span className="shop-hero-caption">Descubre esta edición <ArrowUpRight size={15} /></span>
              </button>
              <span className="shop-hero-edition" aria-hidden="true">EL UNIVERSO MUKAI, EN TUS MANOS</span>
            </article>
            <div className="shop-promotions">
              {shopPromotions.map((promotion) => <ShopPromotion key={promotion.id} {...promotion} onExplore={() => explore(promotion.category)} />)}
            </div>
          </section>

          <section id="productos" ref={catalogRef} className="shop-catalog" aria-labelledby="shop-catalog-title">
            <header className="shop-section-heading">
              <div><span className="shop-eyebrow">Encuentra tu próxima historia</span><h2 id="shop-catalog-title">El catálogo<span aria-hidden="true">.</span></h2></div>
              <div className="shop-search" role="search">
                <Search size={17} aria-hidden="true" />
                <input type="search" aria-label="Buscar productos" placeholder="Buscar en la tienda…" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(PAGE_SIZE); }} />
                {query && <button type="button" aria-label="Limpiar búsqueda de productos" onClick={() => { setQuery(''); setLimit(PAGE_SIZE); }}><X size={16} /></button>}
              </div>
            </header>
            <div className="shop-catalog-tools">
              <FilterPills value={category} onChange={selectCategory} />
              <label className="shop-sort"><span>Ordenar</span><select aria-label="Ordenar productos" value={sort} onChange={(event) => { setSort(event.target.value); setLimit(PAGE_SIZE); }}><option value="featured">Destacados</option><option value="low">Menor precio</option><option value="high">Mayor precio</option></select></label>
            </div>
            <p className="shop-results" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'producto' : 'productos'}{category !== 'Todo' ? ` · ${category === 'Sale' ? 'Ofertas' : category === 'Art prints' ? 'Ilustraciones' : category}` : ''}{query.trim() ? ` para «${query.trim()}»` : ''}</p>
            <div className="shop-product-grid">
              {visible.map((product) => <ProductCard key={product.id} product={product} quantity={cart[product.id] || 0} onOpen={() => openProduct(product)} onAdd={() => changeCart(product, 1)} />)}
            </div>
            {!filtered.length && <div className="shop-empty"><Search size={28} /><h3>No encontramos ese producto</h3><p>Prueba otro título o explora todas las categorías.</p><button type="button" className="shop-button" onClick={() => { selectCategory('Todo'); setQuery(''); }}>Ver todo el catálogo <ArrowRight size={16} /></button></div>}
            {visible.length < filtered.length && <div className="shop-load-more"><span>{visible.length} de {filtered.length} productos</span><button type="button" className="shop-button" onClick={() => setLimit((current) => current + PAGE_SIZE)}>Ver más productos <Plus size={17} /></button></div>}
          </section>

          <section className="shop-reviews" aria-labelledby="shop-reviews-title">
            <header className="shop-section-heading"><div><span className="shop-eyebrow">De lector a lector</span><h2 id="shop-reviews-title">En tu colección</h2></div><button type="button" className="shop-text-button" onClick={() => { setNotice(''); setDialog('review'); }}>Escribir una reseña <MessageSquare size={16} /></button></header>
            <div className="shop-review-grid">
              {(allReviews ? reviews : reviews.slice(0, 3)).map((review) => <article className="shop-review-card" key={review.id}><div className="shop-review-author"><img src={review.image} alt={review.demo ? 'Producto de muestra' : `Producto de ${review.name}`} loading="lazy" /><div><h3>{review.name}</h3><span>{review.demo ? 'Reseña de ejemplo' : 'Reseña guardada en este navegador'}</span></div><span aria-hidden="true" className="shop-quote">“</span></div><p>{review.text}</p><button type="button" className="shop-text-button" onClick={() => { const product = products.find((item) => item.id === review.productId); if (product) openProduct(product); }}>Ver producto <ArrowUpRight size={15} /></button></article>)}
            </div>
            {reviews.length > 3 && <button type="button" className="shop-text-button shop-review-more" onClick={() => setAllReviews((value) => !value)}>{allReviews ? 'Ver menos reseñas' : `Ver las ${reviews.length} reseñas`}</button>}
          </section>
          <p className="shop-local-note">Catálogo de demostración · Precios en USD · Sin pagos ni pedidos reales</p>
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

        <dialog className="shop-dialog" aria-labelledby="shop-review-title" ref={reviewDialog} onClose={closeDialog}>
          <button type="button" className="shop-dialog-close" aria-label="Cerrar reseña" onClick={closeDialog}><X size={21} /></button>
          <span className="shop-eyebrow">De lector a lector</span><h2 id="shop-review-title">Escribe tu reseña</h2>
          <p className="shop-dialog-note">Comparte tu experiencia y una foto del producto.</p>
          <form className="shop-review-form" onSubmit={submitReview}>
            <label>Tu nombre<input required maxLength={30} value={reviewName} onChange={(event) => setReviewName(event.target.value)} /></label>
            <label>Producto<select value={reviewProduct} onChange={(event) => setReviewProduct(event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select></label>
            <label>Tu experiencia<textarea required maxLength={600} rows={4} value={reviewText} onChange={(event) => setReviewText(event.target.value)} /></label>
            <label>Foto del producto<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setReadingImage(true); setReviewImage('');
              try { setReviewImage(await readLocalImage(file)); setNotice(''); }
              catch (caught) { setNotice((caught as Error).message); }
              finally { setReadingImage(false); }
            }} /></label>
            {reviewImage && <img className="shop-review-preview" src={reviewImage} alt="Vista previa de tu foto" />}
            <small>JPG, PNG o WebP de hasta 1,2 MB. La reseña se guarda solo en este navegador.</small>
            <p className="shop-dialog-status" role="status">{notice}</p>
            <button className="shop-button shop-button--ink" disabled={!reviewImage || !reviewText.trim() || !reviewName.trim() || readingImage}>{readingImage ? 'Cargando foto…' : 'Guardar reseña'} <ArrowUpRight size={17} /></button>
          </form>
        </dialog>
      </main>
      <Footer />
    </>
  );
}
