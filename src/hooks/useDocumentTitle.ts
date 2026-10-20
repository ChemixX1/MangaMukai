import { useEffect } from 'react';
import { normalizeSeoPath, routeSeo, SEO_ROUTES, SITE_NAME, SITE_URL, type RouteSeo } from '../config/seo';

const buildTitle = (section?: string | null) => section?.trim() ? `${section.trim()} | ${SITE_NAME}` : SEO_ROUTES['/'].title;

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

let activePath = '';
let activeSeo: RouteSeo = SEO_ROUTES['/'];
let activeImage = `${SITE_URL}/favicon.svg`;

const clearMeta = (selector: string) => {
  document.head.querySelectorAll(selector).forEach(tag => tag.remove());
};

const applyIndexing = () => {
  upsertMeta('name', 'robots', activeSeo.noindex ? 'noindex,follow' : INDEXABLE);
  upsertMeta('name', 'googlebot', activeSeo.noindex ? 'noindex,follow' : INDEXABLE);
  upsertMeta('name', 'googlebot-image', activeSeo.noindex ? 'noindex' : 'index,follow');
  clearMeta('meta[name="rating" i]');
  if (activeSeo.adult) upsertMeta('name', 'rating', 'adult');
};

const updateSchema = () => {
  clearMeta('script[type="application/ld+json"]');
  if (activeSeo.noindex) return;
  const canonical = `${SITE_URL}${activePath}`;
  const script = document.createElement('script');
  script.id = 'mm-page-schema';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: `${SITE_URL}/`, logo: `${SITE_URL}/favicon.svg` },
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: 'es', publisher: { '@id': `${SITE_URL}/#organization` } },
      {
        '@type': ['home', 'collection'].includes(activeSeo.kind) ? 'CollectionPage' : 'WebPage',
        '@id': `${canonical}#webpage`, url: canonical, name: activeSeo.title, description: activeSeo.description,
        inLanguage: 'es', isPartOf: { '@id': `${SITE_URL}/#website` }, image: activeImage,
        ...(activeSeo.adult ? { isFamilyFriendly: false } : {}),
        ...(activeSeo.kind === 'manga' ? { mainEntity: { '@type': 'Book', '@id': `${canonical}#book`, name: activeSeo.title.replace(` | ${SITE_NAME}`, ''), url: canonical, image: activeImage, inLanguage: 'es' } } : {}),
      },
    ],
  });
  document.head.appendChild(script);
};

const updateTitleAndDescription = () => {
  document.title = activeSeo.title;
  upsertMeta('name', 'description', activeSeo.description);
  for (const prefix of ['og', 'twitter']) {
    const attribute = prefix === 'og' ? 'property' : 'name';
    upsertMeta(attribute, `${prefix}:title`, activeSeo.title);
    upsertMeta(attribute, `${prefix}:description`, activeSeo.description);
    upsertMeta(attribute, `${prefix}:image`, activeImage);
    upsertMeta(attribute, `${prefix}:image:alt`, activeSeo.title);
  }
};

export const applyRouteSeo = (pathname: string) => {
  const path = normalizeSeoPath(pathname);
  if (path === activePath) return;
  const seo = routeSeo(path);
  // Keep the richer server response (Book, chapter dates, lists) on initial load.
  const serverCanonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const serverSchema = document.getElementById('mm-page-schema');
  const serverNoindex = document.head.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex');
  const preserveServer = !activePath && (serverSchema || serverNoindex) && serverCanonical === `${SITE_URL}${path}`;
  activePath = path;
  activeSeo = { ...seo };
  activeImage = `${SITE_URL}/favicon.svg`;
  if (preserveServer) {
    activeSeo.title = document.title;
    activeSeo.description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') || seo.description;
    activeSeo.adult = document.head.querySelector('meta[name="rating" i]')?.getAttribute('content') === 'adult';
    activeSeo.noindex = seo.noindex || serverNoindex;
    activeImage = document.head.querySelector('meta[property="og:image"]')?.getAttribute('content') || activeImage;
  }
  // Route-specific image properties must never leak into another page.
  clearMeta('meta[property^="og:image:"],link[rel="image_src"]');
  upsertCanonical(`${SITE_URL}${path}`);
  upsertMeta('property', 'og:url', `${SITE_URL}${path}`);
  upsertMeta('property', 'og:type', seo.kind === 'manga' ? 'book' : seo.kind === 'chapter' ? 'article' : 'website');
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  applyIndexing();
  updateTitleAndDescription();
  if (!preserveServer) updateSchema();
};

interface DocumentSeoOptions {
  path?: string;
  image?: string;
  adult?: boolean;
  noindex?: boolean;
}

export const useDocumentTitle = (section?: string | null, description?: string | null, options: DocumentSeoOptions = {}) => {
  const { path, image, adult, noindex } = options;
  useEffect(() => {
    if (path && normalizeSeoPath(path) !== activePath) return;
    if (section === undefined && !description && !image && noindex === undefined) return;
    const title = section === undefined ? activeSeo.title : buildTitle(section);
    const nextDescription = description || activeSeo.description;
    const changed = title !== activeSeo.title || nextDescription !== activeSeo.description
      || (image && image !== activeImage) || (adult !== undefined && adult !== activeSeo.adult)
      || (noindex !== undefined && noindex !== activeSeo.noindex);
    activeSeo = { ...activeSeo, title, description: nextDescription, ...(adult === undefined ? {} : { adult }), ...(noindex === undefined ? {} : { noindex }) };
    if (image) activeImage = image;
    applyIndexing();
    updateTitleAndDescription();
    if (changed) updateSchema();
  }, [section, description, path, image, adult, noindex]);
};

