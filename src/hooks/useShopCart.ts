import { useExperienceUser, useLocalExperience } from './useLocalExperience';

export const SHOP_CART_MAX_UNITS = 10;

export const shopCartKey = (userId: string) => `mm-shop-cart-${userId}`;

export const useShopCart = () => {
  const user = useExperienceUser();
  const [cart, saveCart] = useLocalExperience<Record<string, number>>(shopCartKey(user.id), {});
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const setQuantity = (id: string, quantity: number) => {
    try { saveCart({ ...cart, [id]: Math.max(0, Math.min(SHOP_CART_MAX_UNITS, quantity)) }); }
    catch {                                                                     }
  };
  return { cart, count, setQuantity };
};
