
import { scheduleBackgroundTask } from './backgroundTasks';
import { routeModuleKey } from './routePrefetchPolicy';

const loaders: Record<string, () => Promise<unknown>> = {
  '/transacciones': () => import('../pages/TransactionsPage'),
  '/pro': () => import('../pages/ProPage'),
  '/recargar': () => import('../pages/CoinMarketPage'),
  '/': () => import('../pages/Home'),
  '/manga-bn': () => import('../pages/MangaBlackWhite'),
  '/manga-19': () => import('../pages/MangaAdult'),
  '/comunidad': () => import('../pages/CommunityPage'),
  '/chat': () => import('../pages/CharacterChatPage'),
  '/tienda': () => import('../pages/ShopPage'),
  '/profile': () => import('../pages/ProfilePage'),
  '/perfil/editar': () => import('../pages/EditProfilePage'),
  '/auth': () => import('../pages/AuthPage'),
  '/manga/:id': () => import('../pages/MangaDetail'),
  '/read/:id': () => import('../pages/ReaderPage'),
  '/mensajes': () => import('../pages/MessagesPage'),
  '/notificaciones': () => import('../pages/NotificationsPage'),
  '/usuarios/:id': () => import('../pages/PublicProfilePage'),
  '/usuarios/:id/publicacion/:postId': () => import('../pages/ProfilePostPage'),
  '/nosotros': () => import('../pages/AboutPage'),
  '/contacto': () => import('../pages/ContactPage'),
  '/legal': () => import('../pages/TermsAndPrivacy'),
  '/legal-document': () => import('../pages/LegalDocumentPage'),
};
const pending = new Map<string, Promise<unknown>>();
export function prefetchRoute(path: string, priority: 'intent' | 'idle' = 'intent'): () => void {
  const key = routeModuleKey(path);
  const loader = key && loaders[key];
  if (!key || !loader || pending.has(key)) return () => {};
  return scheduleBackgroundTask(`route:${key}`, () => {
    if (pending.has(key)) return pending.get(key);
    const request = loader().catch(() => { pending.delete(key); });
    pending.set(key, request);
    return request;
  }, { priority });
}
