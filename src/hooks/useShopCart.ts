import { useExperienceUser, useLocalExperience } from './useLocalExperience';

export const SHOP_CART_MAX_UNITS = 10;

/** Clave de la bolsa local de la Tienda: una por usuario (o invitado) en este navegador. */
export const shopCartKey = (userId: string) => `mm-shop-cart-${userId}`;

/**
 * Bolsa local de la Tienda (cantidades por id de producto). La comparten la
 * página de la tienda y el carrito del navbar: guardar desde uno avisa al otro.
 */
export const useShopCart = () => {
  const user = useExperienceUser();
  const [cart, saveCart] = useLocalExperience<Record<string, number>>(shopCartKey(user.id), {});
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const setQuantity = (id: string, quantity: number) => {
    try { saveCart({ ...cart, [id]: Math.max(0, Math.min(SHOP_CART_MAX_UNITS, quantity)) }); }
    catch { /* Sin espacio en el navegador: el carrito se queda como estaba. */ }
  };
  return { cart, count, setQuantity };
};
