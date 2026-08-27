const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const WEBSITE_URL = trimTrailingSlash(
  import.meta.env.VITE_WORDPRESS_URL || "https://mangamukai.com",
);

export const WORDPRESS_POSTS_API = `${WEBSITE_URL}/wp-json/wp/v2/posts`;
export const MANGAMUKAI_API = `${WEBSITE_URL}/wp-json/mangamukai/v1`;
export const SOCIAL_LOGIN_SESSION_URL = `${WEBSITE_URL}/?mm_social_session=1`;

export const wordpressUrl = (path: string) =>
  `${WEBSITE_URL}/${path.replace(/^\/+/, "")}`;

export const socialLoginUrl = (provider: 'google' | 'discord') => {
  const callbackUrl = `${WEBSITE_URL}/auth/login?social=${provider}`;
  const query = new URLSearchParams({
    provider,
    redirect_to: callbackUrl,
  });
  return `${WEBSITE_URL}/login/?${query.toString()}`;
};
