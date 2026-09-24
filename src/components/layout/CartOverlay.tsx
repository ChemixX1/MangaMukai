import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { shopProducts as products } from '../../data/shopProducts';
import { SHOP_CART_MAX_UNITS, useShopCart } from '../../hooks/useShopCart';
import { SlidePanel } from './SlidePanel';

const money = (value: number) => `$${value.toFixed(2)} USD`;

/**
 * Carrito del navbar (móvil): una ventana que entra por la derecha hasta el
 * centro de la página con los productos seleccionados en la Tienda. La bolsa
 * es local (guardada en este navegador), como en la propia tienda.
 */
export const CartOverlay = ({ open, isLight, onClose }: { open: boolean; isLight: boolean; onClose: () => void }) => {
  const { cart, count, setQuantity } = useShopCart();
  const items = products.filter((product) => cart[product.id] > 0);
  const total = items.reduce((sum, product) => sum + product.price * cart[product.id], 0);

  const text = isLight ? 'text-black' : 'text-white';
  const muted = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const divider = isLight ? 'border-black/10' : 'border-white/10';
  const control = isLight ? 'border-black/10 text-black hover:bg-black/5' : 'border-white/15 text-white hover:bg-white/10';

  return (
    <SlidePanel open={open} from="right" size="half" isLight={isLight} label="Carrito" onClose={onClose}>
      <div className={`sticky top-0 z-10 border-b px-3 pt-[calc(env(safe-area-inset-top)+10px)] ${divider} ${isLight ? 'bg-white' : 'bg-black'}`}>
        <div className="flex h-12 items-center justify-between gap-2">
          <h2 className={`min-w-0 truncate font-[Montserrat] text-[15px] font-bold uppercase tracking-[0.035em] ${text}`}>
            Carrito {count > 0 && <span className="text-[#ff4a7d]">({count})</span>}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar carrito" title="Cerrar carrito" className={`-mr-1.5 shrink-0 rounded-full p-1.5 transition-colors ${text} ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'} hover:text-[#FF4D88]`}>
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={`flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-16 text-center ${muted}`}>
          <ShoppingCart size={34} strokeWidth={1.75} />
          <p className="font-[Montserrat] text-[12.5px] font-semibold leading-snug">Todavía no has seleccionado ningún producto</p>
          <button type="button" onClick={onClose} className="mt-1 rounded-full bg-[#ff4a7d] px-4 py-2 font-[Montserrat] text-[11px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#ff347b]">
            Seguir explorando
          </button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col px-3">
            {items.map((product) => {
              const quantity = cart[product.id];
              return (
                <li key={product.id} className={`flex gap-2.5 border-b py-3 ${divider}`}>
                  <img src={product.image} alt={product.title} loading="lazy" className={`h-[68px] w-12 shrink-0 rounded-[6px] object-cover ${isLight ? 'bg-[#f2f2f4]' : 'bg-white/10'}`} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 className={`line-clamp-2 font-[Montserrat] text-[11.5px] font-bold leading-tight ${text}`}>{product.title}</h3>
                    <p className={`font-[Montserrat] text-[11px] font-semibold ${muted}`}>{money(product.price)}</p>
                    {/* Cantidad: − n + (máximo 10 unidades, igual que en la tienda). Al llegar a 0 sale del carrito. */}
                    <div className="mt-auto flex items-center gap-1.5">
                      <button type="button" onClick={() => setQuantity(product.id, quantity - 1)} aria-label={`Quitar una unidad de ${product.title}`} className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${control}`}>
                        <Minus size={13} strokeWidth={2.5} />
                      </button>
                      <span className={`min-w-4 text-center font-[Montserrat] text-[12px] font-bold ${text}`}>{quantity}</span>
                      <button type="button" disabled={quantity >= SHOP_CART_MAX_UNITS} onClick={() => setQuantity(product.id, quantity + 1)} aria-label={`Añadir una unidad de ${product.title}`} className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${control}`}>
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={`sticky bottom-0 mt-auto border-t px-3 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 ${divider} ${isLight ? 'bg-white' : 'bg-black'}`}>
            <div className={`flex items-baseline justify-between gap-2 font-[Montserrat] ${text}`}>
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em]">Total</span>
              <strong className="text-[14px] font-bold">{money(total)}</strong>
            </div>
            <p className={`mt-1.5 font-[Montserrat] text-[10px] font-medium leading-snug ${muted}`}>Selección guardada en este navegador, sin pagos habilitados</p>
          </div>
        </>
      )}
    </SlidePanel>
  );
};
