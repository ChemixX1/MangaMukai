/** Warm route chunks on navigation intent; failed downloads remain retryable. */
const loaders: Record<string, () => Promise<unknown>> = {
  '/transacciones': () => import('../pages/TransactionsPage'),
  '/pro': () => import('../pages/ProPage').then(page => page.preloadProAssets()),
  '/recargar': () => import('../pages/CoinMarketPage'),
  '/': () => import('../pages/Home'),
  '/manga-bn': () => import('../pages/MangaBlackWhite'),
  '/manga-19': () => import('../pages/MangaAdult'),
  '/comunidad': () => import('../pages/CommunityPage'),
  '/chat': () => import('../pages/CharacterChatPage'),
  '/tienda': () => import('../pages/ShopPage'),
  '/profile': () => import('../pages/ProfilePage'),
};
const pending = new Map<string, Promise<unknown>>();
export function prefetchRoute(path: string) {
  const loader = loaders[path];
  if (!loader || pending.has(path)) return;
  pending.set(path, loader().catch(() => { pending.delete(path); }));
}
