import config from './seo-routes.json';

export interface RouteSeo {
  kind: string;
  title: string;
  description: string;
  heading?: string;
  adult?: boolean;
  noindex?: boolean;
}

export const SITE_NAME = config.siteName;
export const SITE_URL = config.siteUrl;
export const SEO_ROUTES: Record<string, RouteSeo> = config.routes;
export const normalizeSeoPath = (pathname: string) => pathname.replace(/\/+$/, '') || '/';

export const routeSeo = (pathname: string): RouteSeo => {
  const path = normalizeSeoPath(pathname);
  if (path === '/comunidad/guardados') return { kind: 'private', title: 'Publicaciones guardadas | MangaMukai', description: 'Tus publicaciones guardadas de la comunidad.', noindex: true };
  if (SEO_ROUTES[path]) return SEO_ROUTES[path];
  if (/^\/(?:auth|usuarios|mensajes|chat)(?:\/|$)|^\/comunidad\/publicacion\//.test(path)
    || ['/profile', '/perfil/editar', '/transacciones', '/notificaciones', '/recargar', '/recargar/pago', '/pro/pago', '/tienda/pago', '/pago-exitoso', '/login'].includes(path)) {
    return { kind: 'private', title: `Área privada | ${SITE_NAME}`, description: 'Área privada de MangaMukai.', noindex: true };
  }
  if (/^\/manga\/\d+$/.test(path)) return { kind: 'manga', title: `Ficha del manga | ${SITE_NAME}`, description: 'Sinopsis y capítulos de manga en español en MangaMukai.' };
  if (/^\/read\/\d+$/.test(path)) return { kind: 'chapter', title: SITE_NAME, description: 'Lee capítulos de manga en español en MangaMukai.' };
  return { kind: 'missing', title: `Página no encontrada | ${SITE_NAME}`, description: 'El contenido solicitado no está disponible en MangaMukai.', noindex: true };
};
