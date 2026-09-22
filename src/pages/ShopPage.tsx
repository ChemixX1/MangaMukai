import { useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Flame, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { Footer } from '../components/layout';
import products from '../data/shop-products.json';
import { shopPromotions } from '../data/shopPromotions';
import { ShopPromotion } from '../components/common/ShopPromotion';
import shopBackdrop from '../assets/modals/auth-login.webp';
import { readLocalImage, useExperienceUser, useLocalExperience } from '../hooks/useLocalExperience';
import { useIsMobileViewport } from '../hooks/useIsMobileViewport';
import { shopCartKey } from '../hooks/useShopCart';
import { MobileShop } from '../components/shop/mobile/MobileShop';
import '../styles/experiences.css';
import '../styles/shop-redesign.css';

type Product = typeof products[number];
type Review = { id: string; name: string; text: string; image: string; productId: string; demo?: boolean };
const money = (value: number) => `$${value.toFixed(2)} USD`;
const sampleReviews: Review[] = [
  { id: 'review-1', name: 'Sofía', text: 'Un nuevo favorito para mi rincón de lectura. Me encanta tener una pequeña parte de esta historia en mi colección', image: products[0].image, productId: products[0].id, demo: true },
  { id: 'review-2', name: 'Mateo', text: 'Los colores y la ilustración se ven increíbles. Ese detalle especial que le faltaba a mi estantería', image: products[1].image, productId: products[1].id, demo: true },
  { id: 'review-3', name: 'Lucía', text: 'Para quienes siempre decimos «un capítulo más». Ya tengo un espacio reservado para mi próxima historia', image: products[2].image, productId: products[2].id, demo: true },
];

/** Por debajo de lg la tienda va vacía (versión móvil pendiente); en escritorio, la tienda completa. */
export default function ShopPage() {
  const user = useExperienceUser();
  const isMobile = useIsMobileViewport();
  return isMobile ? <MobileShop /> : <Shop key={user.id} />;
}
function Shop() {
  const user = useExperienceUser();
  const [category, setCategory] = useState('Todo');
  const [sort, setSort] = useState('featured');
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, saveCart] = useLocalExperience<Record<string, number>>(shopCartKey(user.id), {});
  const [reviews, saveReviews] = useLocalExperience<Review[]>(`mm-shop-reviews-${user.id}`, sampleReviews);
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
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartProducts = products.filter(product => cart[product.id] > 0);
  const visible = products.filter(product => category === 'Todo' || (category === 'Sale' ? product.sale : product.category === category)).sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0);
  const openProduct = (product: Product) => { setNotice(''); setSelected(product); productDialog.current?.showModal(); };
  const changeCart = (product: Product, delta: number) => {
    if (product.soldOut) return;
    try { saveCart({ ...cart, [product.id]: Math.max(0, Math.min(10, (cart[product.id] || 0) + delta)) }); setNotice(delta > 0 ? 'Añadido a tu bolsa local' : 'Bolsa actualizada'); }
    catch (caught) { setNotice((caught as Error).message); }
  };
  return <><main className="experience shop-page shop-redesign">
    <section className="shop-stage" aria-labelledby="shop-title">
      <div className="shop-stage-backdrop" aria-hidden="true"><img src={shopBackdrop} alt="" /><span /></div>
      <div className="shop-stage-inner">
        <div className="shop-stage-top"><span className="shop-stage-label">MANGAMUKAI COLLECTION</span><button className="shop-bag" onClick={() => { setNotice(''); cartDialog.current?.showModal(); }}><ShoppingBag size={18} /><span>Mi bolsa</span><b>{count}</b></button></div>
        <header className="shop-stage-heading"><span>DE TUS HISTORIAS A TU COLECCIÓN</span><h1 id="shop-title">TIENDA <span>MUKAI</span></h1><p>Encuentra eso que hace tu colección un poco más tuya</p></header>
        <div className="shop-promotions">{shopPromotions.map(promotion => <ShopPromotion key={promotion.id} {...promotion} onExplore={() => { setCategory(promotion.category); document.getElementById('productos')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }} />)}</div>
        <p className="shop-stage-caption">Catálogo local de muestra</p>
      </div>
    </section>
    <div className="shop-content">
    <section id="productos" className="shop-catalog"><div className="section-line"><h2>Encuentra tu favorito <span>({visible.length})</span></h2><label className="shop-sort"><span>Ordenar</span><select aria-label="Ordenar productos" value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Destacados</option><option value="low">Menor precio</option><option value="high">Mayor precio</option></select></label></div><div className="shop-filters">{['Todo', 'Manga', 'Art prints', 'Colecciones', 'Sale'].map(label => <button key={label} aria-pressed={category === label} onClick={() => setCategory(label)}>{label}</button>)}</div>
      <div className="product-grid">{visible.map(product => <button className="product-card" key={product.id} onClick={() => openProduct(product)} aria-label={`Ver ${product.title}, ${money(product.price)}${product.soldOut ? ', se agotó' : ''}`}><div className={`product-image ${product.soldOut ? 'sold-out' : ''}`}><img src={product.image} alt={product.title} loading="lazy" /><span className="product-badges">{product.hot && <span className="hot-badge" title="Popular"><Flame size={17} fill="currentColor" aria-label="Popular" /></span>}{product.sale && <span className="sale-badge">SALE</span>}</span>{product.soldOut && <span className="sold-badge">Se agotó</span>}<span className="product-view"><ArrowUpRight size={20} /></span></div><h3>{product.title}</h3><p>{money(product.price)}</p></button>)}</div>
    </section>
    <section className="shop-feature"><div><img src={products[4].image} alt={products[4].title} loading="lazy" /></div><article><span className="eyebrow">MUKAI SELECT</span><h2>Una historia<br />Todo un universo</h2><p>{products[4].title}</p><strong>{money(products[4].price)}</strong><button className="exp-button" onClick={() => openProduct(products[4])}>Descubrir producto <ArrowUpRight size={19} /></button></article></section>
    <section className="shop-reviews"><header className="section-line"><div><span className="eyebrow">DE NUESTRA COMUNIDAD</span><h2>Historias en tus manos</h2></div><button className="exp-button outline" onClick={() => { setNotice(''); reviewDialog.current?.showModal(); }}>Comparte tu review <Plus size={17} /></button></header><p className="exp-muted">Tu producto, tu foto, tu historia</p><div className="review-grid">{reviews.map(review => <article className="review-card" key={review.id}><div className="review-photo"><img src={review.image} alt={review.demo ? 'Imagen de muestra del producto' : `Producto recibido por ${review.name}`} loading="lazy" /><span>{review.demo ? 'EJEMPLO' : 'LOCAL'}</span></div><div className="review-copy"><h3>Meet {review.name.split(' ')[0]} Review!</h3><p>{review.text}</p><button onClick={() => { const product = products.find(item => item.id === review.productId); if (product) openProduct(product); }}>Comprar ahora <ArrowUpRight size={20} /></button></div></article>)}</div></section>
    <p className="shop-local-note">Tienda local de demostración, sin pagos habilitados</p>
    </div>
    <dialog className="experience exp-dialog product-dialog" aria-label="Detalle del producto" ref={productDialog}><button className="dialog-close" aria-label="Cerrar producto" onClick={() => productDialog.current?.close()}><X size={21} /></button>{selected && <div className="product-detail"><img src={selected.image} alt={selected.title} /><div><span className="eyebrow">{selected.category} · CATÁLOGO DE MUESTRA</span><h2>{selected.title}</h2><strong className="detail-price">{money(selected.price)}</strong><p>Una pieza para quienes disfrutan cada historia. Imagen referencial para la colección local de MangaMukai</p><button className="exp-button" disabled={selected.soldOut || (cart[selected.id] || 0) >= 10} onClick={() => changeCart(selected, 1)}><ShoppingBag size={18} />{selected.soldOut ? 'Se agotó' : (cart[selected.id] || 0) >= 10 ? 'Máximo 10 unidades' : 'Añadir a mi bolsa'}</button><p className="exp-notice" role="status">{notice}</p><small>Precio de demostración, sin cobros ni pedidos reales</small></div></div>}</dialog>
    <dialog className="experience exp-dialog" aria-label="Mi bolsa" ref={cartDialog}><button className="dialog-close" aria-label="Cerrar bolsa" onClick={() => cartDialog.current?.close()}><X size={21} /></button><h2>Mi bolsa <span className="accent">({count})</span></h2>{!count ? <div className="exp-empty"><ShoppingBag size={32} /><p>Tu próxima historia todavía no está aquí</p><button className="exp-button" onClick={() => cartDialog.current?.close()}>Seguir explorando <ArrowDown size={16} /></button></div> : <>{cartProducts.map(product => <div className="cart-row" key={product.id}><img src={product.image} alt={product.title} /><div><strong>{product.title}</strong><small>{money(product.price)}</small></div><div className="cart-quantity"><button aria-label={`Quitar una unidad de ${product.title}`} onClick={() => changeCart(product, -1)}><Minus size={15} /></button><span>{cart[product.id]}</span><button disabled={cart[product.id] >= 10} aria-label={`Añadir una unidad de ${product.title}`} onClick={() => changeCart(product, 1)}><Plus size={15} /></button></div></div>)}<div className="section-line cart-total"><strong>Total de muestra</strong><strong>{money(cartProducts.reduce((sum, product) => sum + product.price * cart[product.id], 0))}</strong></div><p className="exp-notice"><Check size={17} /> Tu selección está guardada localmente, sin pagos habilitados</p><p role="status">{notice}</p></>}</dialog>
    <dialog className="experience exp-dialog" aria-label="Comparte tu review" ref={reviewDialog}><button className="dialog-close" aria-label="Cerrar reseña" onClick={() => reviewDialog.current?.close()}><X size={21} /></button><h2>Comparte tu review</h2><p className="exp-muted">Muéstranos cómo llegó tu producto</p><form className="review-form" onSubmit={event => { event.preventDefault(); if (!reviewImage || !reviewText.trim() || !reviewName.trim() || readingImage) return; try { saveReviews([{ id: crypto.randomUUID(), name: reviewName.trim().split(/\s+/)[0], text: reviewText.trim(), image: reviewImage, productId: reviewProduct }, ...reviews]); setReviewText(''); setReviewImage(''); reviewDialog.current?.close(); } catch (caught) { setNotice((caught as Error).message); } }}><label>Tu primer nombre<input required maxLength={30} value={reviewName} onChange={event => setReviewName(event.target.value)} /></label><label>Producto<select value={reviewProduct} onChange={event => setReviewProduct(event.target.value)}>{products.map(product => <option key={product.id} value={product.id}>{product.title}</option>)}</select></label><label>Tu experiencia<textarea required maxLength={600} value={reviewText} onChange={event => setReviewText(event.target.value)} /></label><label>Foto del producto recibido<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; setReadingImage(true); setReviewImage(''); try { setReviewImage(await readLocalImage(file)); setNotice(''); } catch (caught) { setNotice((caught as Error).message); } finally { setReadingImage(false); } }} /></label>{reviewImage && <img className="review-upload-preview" src={reviewImage} alt="Vista previa de tu reseña" />}<small>JPG, PNG o WebP hasta 1,2 MB, guardado en este navegador</small><p className="exp-notice" role="status">{notice}</p><button className="exp-button" disabled={!reviewImage || !reviewText.trim() || !reviewName.trim() || readingImage}>{readingImage ? 'Cargando foto…' : 'Publicar review local'} <ArrowUpRight size={18} /></button></form></dialog>
  </main><Footer /></>;
}
