import { useEffect } from 'react';

export const SITE_NAME = 'MangaMukai';
export const SITE_URL = 'https://mangamukai.com';
export const DEFAULT_TITLE = 'MangaMukai — Leer manga online gratis en español';
export const DEFAULT_DESCRIPTION =
  'Lee manga online gratis y en español en MangaMukai: manhwa, manhua, romance, acción, fantasía, seinen y contenido +19. Capítulos nuevos cada día con lector rápido.';

/** "Biblioteca" -> "Biblioteca | MangaMukai". Sin sección devuelve el título de portada. */
export const buildTitle = (section?: string | null): string => {
  const clean = (section ?? '').trim();
  return clean ? `${clean} | ${SITE_NAME}` : DEFAULT_TITLE;
};

interface RouteSeo {
  /** Sección para el título; null usa el título de portada. */
  section: string | null;
  description: string;
  /** Rutas privadas o transaccionales que no deben indexarse. */
  noindex?: boolean;
}

/**
 * Metadatos por ruta. Es el espejo cliente de la tabla de
 * server/backend-patches/manga-route-meta.php: si cambia uno, cambia el otro,
 * porque Google compara el HTML servido con el que queda tras renderizar.
 */
export const routeSeo = (pathname: string): RouteSeo => {
  const path = pathname.replace(/\/+$/, '') || '/';

  switch (path) {
    case '/':
      return { section: null, description: DEFAULT_DESCRIPTION };
    case '/biblioteca':
      return {
        section: 'Biblioteca de manga en español — Catálogo completo',
        description: 'Catálogo completo de manga, manhwa y manhua en español: filtra por género, tipo y público, y lee online gratis en MangaMukai.',
      };
    case '/manga-19':
      return {
        section: 'Mangas +19 en español — Colección para adultos',
        description: 'Colección +19 de MangaMukai: manga y manhwa para adultos en español, con romance, drama y fantasía madura. Solo para mayores de edad.',
      };
    case '/manga-bn':
      return {
        section: 'Manga en blanco y negro — Shounen, seinen y acción',
        description: 'Manga clásico en blanco y negro: shounen, seinen y acción en español, con capítulos nuevos y lector optimizado en MangaMukai.',
      };
    case '/nosotros':
      return {
        section: 'Sobre MangaMukai',
        description: 'Conoce al equipo de MangaMukai, cómo trabajamos las traducciones y qué encontrarás en nuestro catálogo de manga en español.',
      };
    case '/contacto':
      return {
        section: 'Contacto',
        description: 'Escríbenos para sugerencias, reportes de capítulos, colaboraciones o dudas sobre tu cuenta de MangaMukai.',
      };
    case '/legal':
      return {
        section: 'Términos y privacidad',
        description: 'Términos de uso, política de privacidad y tratamiento de datos de los lectores de MangaMukai.',
      };
    case '/privacidad':
      return {
        section: 'Política de privacidad',
        description: 'Qué datos recoge MangaMukai, para qué los usa, con quién los comparte y cómo puedes ejercer tus derechos.',
      };
    case '/terminos':
      return {
        section: 'Términos de servicio',
        description: 'Condiciones de uso de MangaMukai: cuentas, Mukai Coins, contenido +19, conducta permitida y responsabilidad.',
      };
    case '/normas-comunidad':
      return {
        section: 'Normas de la comunidad',
        description: 'Reglas de convivencia de la comunidad y la mensajería de MangaMukai, y cómo se modera.',
      };
    case '/cookies':
      return {
        section: 'Política de cookies',
        description: 'Qué cookies y almacenamiento local usa MangaMukai, para qué sirven y cómo puedes gestionarlos.',
      };
    case '/perfil':
      return { section: 'Mi perfil', description: 'Área privada de MangaMukai.', noindex: true };
    case '/saved':
      return { section: 'Mis guardados', description: 'Área privada de MangaMukai.', noindex: true };
    case '/comunidad':
      return { section: 'Comunidad', description: 'Comparte lecturas, recomendaciones y fan art con otros lectores de MangaMukai.' };
    case '/mensajes':
      return { section: 'Mensajes', description: 'Área privada de MangaMukai.', noindex: true };
    case '/notificaciones':
      return { section: 'Notificaciones', description: 'Área privada de MangaMukai.', noindex: true };
    case '/chat':
      return { section: 'Mukai Chat', description: 'Conversa con personajes de manga en MangaMukai.' };
    case '/tienda':
      return { section: 'Tienda', description: 'Productos y colecciones de MangaMukai.' };
    case '/mas':
      return { section: 'Más', description: 'Área privada de MangaMukai.', noindex: true };
    case '/recargar':
      return { section: 'Recargar monedas', description: 'Área privada de MangaMukai.', noindex: true };
    case '/pago-exitoso':
      return { section: 'Pago completado', description: 'Área privada de MangaMukai.', noindex: true };
    case '/auth/login':
    case '/login':
      return { section: 'Iniciar sesión', description: 'Área privada de MangaMukai.', noindex: true };
    case '/auth/register':
    case '/register':
    case '/registro':
      return { section: 'Crear cuenta', description: 'Área privada de MangaMukai.', noindex: true };
    default:
      break;
  }

  if (path.startsWith('/auth/') || path.startsWith('/usuarios/')) {
    return { section: 'Perfil de usuario', description: 'Área privada de MangaMukai.', noindex: true };
  }
  if (path.startsWith('/mensajes/')) {
    return { section: 'Mensajes', description: 'Área privada de MangaMukai.', noindex: true };
  }
  if (path.startsWith('/chat/')) {
    return { section: 'Mukai Chat', description: 'Conversa con personajes de manga en MangaMukai.' };
  }
  if (path.startsWith('/manga/')) {
    return { section: 'Ficha del manga', description: DEFAULT_DESCRIPTION };
  }
  if (path.startsWith('/read/')) {
    return { section: 'Lector', description: 'Lee capítulos de manga online y en español, gratis y en alta calidad en MangaMukai.' };
  }

  return { section: null, description: DEFAULT_DESCRIPTION };
};

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
};

const INDEXABLE = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';

/**
 * Alinea el head con la ruta actual durante la navegación cliente. El servidor
 * ya envía estos mismos valores en la primera carga; esto evita que un cambio de
 * página deje el título, la descripción o el canonical de la anterior.
 */
export const applyRouteSeo = (pathname: string, search = '') => {
  const seo = routeSeo(pathname);
  const title = buildTitle(seo.section);
  const canonical = `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;

  document.title = title;
  upsertMeta('name', 'description', seo.description);
  upsertMeta('name', 'robots', seo.noindex ? 'noindex,follow' : INDEXABLE);
  upsertMeta('name', 'googlebot', seo.noindex ? 'noindex,follow' : INDEXABLE);
  upsertCanonical(canonical);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', seo.description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', seo.description);

  // `search` no entra en el canonical a propósito: los filtros de la biblioteca
  // no son URLs distintas para Google.
  void search;
};

/**
 * Título (y descripción opcional) de una página con datos propios: manga,
 * capítulo o perfil. Con `undefined` no toca nada, así se conserva lo que puso
 * la ruta mientras el dato carga.
 */
export const useDocumentTitle = (section?: string | null, description?: string | null) => {
  useEffect(() => {
    if (section === undefined) return;
    const title = buildTitle(section);
    document.title = title;
    upsertMeta('property', 'og:title', title);
    upsertMeta('name', 'twitter:title', title);
  }, [section]);

  useEffect(() => {
    if (!description) return;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:description', description);
    upsertMeta('name', 'twitter:description', description);
  }, [description]);
};
