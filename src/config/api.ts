const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getDefaultWebsiteUrl = () => {
  if (typeof window === "undefined") {
    return "https://mangamukai.com";
  }

  const isLocalDevelopment = ["localhost", "127.0.0.1"].includes(
    window.location.hostname,
  );

  return isLocalDevelopment
    ? "https://mangamukai.com"
    : window.location.origin;
};

const WEBSITE_URL = trimTrailingSlash(
  import.meta.env.VITE_WORDPRESS_URL || getDefaultWebsiteUrl(),
);

// En desarrollo local (sin backend explicito via VITE_WORDPRESS_URL) las llamadas
// de DATOS usan rutas relativas para pasar por el proxy de Vite (ver vite.config.ts),
// que las reenvia al backend por IP y evita el fallo de DNS/CORS al llamar directo a
// https://mangamukai.com desde localhost. Las URLs de OAuth/sesion siguen absolutas
// (son navegaciones al dominio real, no peticiones proxyables).
const isLocalDevelopment =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
const useDevProxy = isLocalDevelopment && !import.meta.env.VITE_WORDPRESS_URL;
const API_ORIGIN = useDevProxy ? "" : WEBSITE_URL;

export const WORDPRESS_POSTS_API = `${API_ORIGIN}/wp-json/wp/v2/posts`;
export const MANGAMUKAI_API = `${API_ORIGIN}/wp-json/mangamukai/v1`;
// En local, el canje de sesion social pasa por el proxy de Vite (mismo origen)
// para evitar el fallo cross-origin; en produccion apunta directo al dominio.
export const SOCIAL_LOGIN_SESSION_URL = useDevProxy
  ? "/mm-social-session"
  : `${WEBSITE_URL}/?mm_social_session=1`;

export const wordpressUrl = (path: string) =>
  `${WEBSITE_URL}/${path.replace(/^\/+/, "")}`;

export const socialLoginUrl = (provider: 'google' | 'discord') => {
  const localOrigin = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? trimTrailingSlash(window.location.origin)
    : '';
  const callbackUrl = `${localOrigin || WEBSITE_URL}/auth/login?social=${provider}`;
  const redirectUrl = localOrigin
    ? `${WEBSITE_URL}/?${new URLSearchParams({
        mm_social_return: '1',
        provider,
        target: callbackUrl,
      }).toString()}`
    : callbackUrl;
  const query = new URLSearchParams({
    provider,
    redirect_to: redirectUrl,
  });
  return `${WEBSITE_URL}/login/?${query.toString()}`;
};
