import { MANGAMUKAI_API } from '../config/api';

/**
 * Banners del carrusel de la portada. Se administran en WordPress
 * (Banners Home) y llegan por /mangamukai/v1/banners.
 */
export interface HomeBanner {
  id: number;
  title: string;
  image: string;
  imageMobile: string;
  link: string;
  buttonLabel: string;
  showButton: boolean;
  newTab: boolean;
}

export type BannerSlot = 'home' | 'youth';

interface BannersResponse {
  success?: boolean;
  banners?: Array<Partial<HomeBanner>>;
}

const normalize = (banner: Partial<HomeBanner>): HomeBanner | null => {
  const image = typeof banner.image === 'string' ? banner.image.trim() : '';
  if (!image) return null;

  const link = typeof banner.link === 'string' ? banner.link.trim() : '';
  return {
    id: Number(banner.id) || 0,
    title: typeof banner.title === 'string' ? banner.title : '',
    image,
    imageMobile: typeof banner.imageMobile === 'string' ? banner.imageMobile.trim() : '',
    link,
    buttonLabel: (typeof banner.buttonLabel === 'string' && banner.buttonLabel.trim()) || 'Ver más',
    showButton: Boolean(banner.showButton) && link !== '',
    newTab: Boolean(banner.newTab),
  };
};

const BANNERS_CACHE_TTL = 5 * 60 * 1000;

interface BannerCacheEntry {
  data: HomeBanner[];
  expiresAt: number;
}

const bannerCache = new Map<BannerSlot, BannerCacheEntry>();
const bannerRequests = new Map<BannerSlot, Promise<HomeBanner[]>>();

/**
 * Último listado conocido de un bloque, aunque haya caducado. El carrusel lo usa
 * para pintarse en el primer fotograma al volver a la portada, en lugar de
 * quedarse en negro mientras se rehace la petición.
 */
export const getCachedHomeBanners = (slot: BannerSlot): HomeBanner[] | null =>
  bannerCache.get(slot)?.data ?? null;

/**
 * Devuelve los banners publicados para un bloque. Si el endpoint todavía no
 * existe o falla, el carrusel simplemente se queda vacío.
 *
 * La respuesta se guarda unos minutos y las peticiones simultáneas comparten la
 * misma promesa: la portada monta dos carruseles y se vuelve a ella a menudo.
 */
export const fetchHomeBanners = (slot: BannerSlot): Promise<HomeBanner[]> => {
  const cached = bannerCache.get(slot);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);

  const pending = bannerRequests.get(slot);
  if (pending) return pending;

  const request = fetch(`${MANGAMUKAI_API}/banners?slot=${slot}`, {
    headers: { Accept: 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as BannersResponse;
      if (!Array.isArray(data?.banners)) return [];

      const banners = data.banners
        .map(normalize)
        .filter((banner): banner is HomeBanner => banner !== null);

      bannerCache.set(slot, { data: banners, expiresAt: Date.now() + BANNERS_CACHE_TTL });
      return banners;
    })
    .catch(() => cached?.data ?? [])
    .finally(() => {
      bannerRequests.delete(slot);
    });

  bannerRequests.set(slot, request);
  return request;
};
