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

export const WORDPRESS_POSTS_API = `${WEBSITE_URL}/wp-json/wp/v2/posts`;
export const MANGAMUKAI_API = `${WEBSITE_URL}/wp-json/mangamukai/v1`;
export const SOCIAL_LOGIN_SESSION_URL = `${WEBSITE_URL}/?mm_social_session=1`;

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
