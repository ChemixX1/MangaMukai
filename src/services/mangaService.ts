

import type { WPManga, MangaCapitulo } from '../types/manga';
import { MANGAMUKAI_API, WORDPRESS_POSTS_API } from '../config/api';
import { createPublicDataCache } from '../utils/publicDataCache';
import { rememberMangaTitle } from './mangaTitles';

const API_URL = WORDPRESS_POSTS_API;
const MM_API = MANGAMUKAI_API;
const CATALOG_CACHE_TTL = 5 * 60 * 1000;
const CATALOG_SESSION_CACHE_KEY = 'mangamukai:catalog-cache:v1';

let catalogCache: { data: MangaCapitulo[]; expiresAt: number } | null = null;
let catalogRequest: Promise<MangaCapitulo[]> | null = null;

const readCatalogSessionCache = () => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.sessionStorage.getItem(CATALOG_SESSION_CACHE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as { data?: MangaCapitulo[]; expiresAt?: number };
    if (!Array.isArray(parsed.data) || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(CATALOG_SESSION_CACHE_KEY);
      return null;
    }

    parsed.data.forEach(manga => rememberMangaTitle(manga.id, manga.titulo));
    return { data: parsed.data, expiresAt: parsed.expiresAt };
  } catch {
    try { window.sessionStorage.removeItem(CATALOG_SESSION_CACHE_KEY); } catch {}
    return null;
  }
};

const persistCatalogSessionCache = (entry: { data: MangaCapitulo[]; expiresAt: number }) => {
  if (typeof window === 'undefined') return;

  const persist = () => {
    try {
      window.sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, JSON.stringify(entry));
    } catch {

    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(persist, { timeout: 2000 });
  } else {
    globalThis.setTimeout(persist, 0);
  }
};



const IMAGEN_DEFAULT = 'https://placehold.co/300x450/1a1a1a/FFF?text=Sin+Portada';

const CAMPOS_SOLICITADOS = [
  'id', 'date', 'title', 'excerpt', 'categories', 'featured_media', '_embedded', '_links',
  'ero_seri', 'ero_chapter', 'ero_chaptertitle',
  'myCRED_sell_content', 'mm_chapter_info', 'wpb_post_views_count', 'manga_cover', 'manga_description', 'manga_tags'
].join(',');

const EMBED_PORTADA = '_embed=wp:featuredmedia';

const obtenerPortadaReal = (item: any): string => {

  if (item.manga_cover) {
    return item.manga_cover;
  }

  if (item._embedded?.['wp:featuredmedia']?.[0]) {
    const media = item._embedded['wp:featuredmedia'][0];

    return media.media_details?.sizes?.full?.source_url
      || media.media_details?.sizes?.large?.source_url
      || media.source_url
      || IMAGEN_DEFAULT;
  }
  return IMAGEN_DEFAULT;
};

const limpiarDescripcion = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&hellip;/g, '...')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const limpiarTitulo = (titulo: string): string => {
  if (!titulo) return '';
  return titulo
    .replace(/[-–]?\s*(Capitulo|Capítulo|Chapter|Volumen|Episodio)\s*\d+.*$/i, '')
    .trim();
};

const mapearManga = (item: any, limpiarTit = true): MangaCapitulo => {
  const titulo = item.title?.rendered || '';
  rememberMangaTitle(item.id, limpiarTit ? limpiarTitulo(titulo) : titulo);
  if (item.ero_seri) rememberMangaTitle(item.ero_seri, limpiarTitulo(titulo));
  const myCred = item.myCRED_sell_content;
  const esGratis = !myCred || myCred.status === 'disabled' || myCred.price === 0;

  let finalDescription = item.manga_description
        ? limpiarDescripcion(item.manga_description)
        : limpiarDescripcion(item.excerpt?.rendered);
  if (!finalDescription) finalDescription = 'Lee esta historia en MangaMukai.';

  const tagsReales = Array.isArray(item.manga_tags) && item.manga_tags.length > 0
        ? item.manga_tags
        : ["Manga", "Acción"];

  let tipoReal = 'Manga';
  if (tagsReales.some((t: any) => String(t).toLowerCase() === 'manhwa')) tipoReal = 'Manhwa';
  if (tagsReales.some((t: any) => String(t).toLowerCase() === 'manhua')) tipoReal = 'Manhua';

  const TAGS_MUJER  = ['shoujo','shojo','josei','romance','yaoi','bl','boys love','yuri','gl','girls love','otome'];
  const TAGS_HOMBRE = ['shounen','shonen','seinen','ecchi','harem','isekai','acción','accion','action','aventura','mecha'];
  const tagsLower   = tagsReales.map((t: any) => String(t).toLowerCase());
  let generoReal: 'Hombre' | 'Mujer' | null = null;
  if (tagsLower.includes('mujer') || TAGS_MUJER.some(g => tagsLower.includes(g)))  generoReal = 'Mujer';
  if (tagsLower.includes('hombre') || TAGS_HOMBRE.some(g => tagsLower.includes(g))) generoReal = 'Hombre';

  return {
    id: item.id,
    titulo: limpiarTit ? limpiarTitulo(titulo) : titulo,
    fecha: new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    portada: obtenerPortadaReal(item),
    imagenes: [],
    descripcion: finalDescription,
    categorias: item.categories || [],
    genres: tagsReales,
    esGratis,
    tipo: tipoReal,
    genero: generoReal,
    eroSeri: item.ero_seri ? Number(item.ero_seri) : null,
    rawFecha: item.date || '',
    capitulosRecientes: [],
  };
};

const mapearMangaCatalog = (item: any): MangaCapitulo => {
  rememberMangaTitle(item.id, item.titulo);
  const genres: string[] = Array.isArray(item.genres) ? item.genres : [];
  let genero: 'Hombre' | 'Mujer' | null = item.genero === 'Hombre' ? 'Hombre'
    : item.genero === 'Mujer' ? 'Mujer'
    : null;
  if (!genero) {
    const gl = genres.map((g: string) => g.toLowerCase());
    if (gl.some(g => ['romance','drama','reencarnación','shoujo','otome','yuri'].includes(g))) genero = 'Mujer';
    if (gl.some(g => ['harem','shounen','seinen','acción','mecha'].includes(g))) genero = 'Hombre';
    if (!genero) genero = 'Mujer';
  }

  const caps: MangaCapitulo['capitulosRecientes'] = (Array.isArray(item.capitulosRecientes) && item.capitulosRecientes.length > 0)
    ? item.capitulosRecientes
    : item.firstChapterId
      ? [{ id: item.firstChapterId, numero: '1', esGratis: !!item.esGratis, fecha: item.fecha }]
      : [];

  return {
    id:          item.id,
    titulo:      item.titulo,
    portada:     item.portada,
    imagenes:    [],
    fecha:       new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    descripcion: item.descripcion,
    categorias:  [],
    genres,
    esGratis:    !!item.esGratis,
    tipo:        item.tipo || 'Manga',
    genero,
    eroSeri:     item.id,
    status:      item.status || '',
    totalViews:  item.totalViews || 0,
    chapterCount: typeof item.chapterCount === 'number' && Number.isInteger(item.chapterCount) && item.chapterCount >= 0 ? item.chapterCount : undefined,
    rawFecha:    item.fecha || '',
    tituloOriginal: item.titulo_original || '',
    fechaManga:  item.fecha_manga || '',
    studio:      item.studio || '',
    author:      typeof item.author === 'string' ? item.author : typeof item.autor === 'string' ? item.autor : '',
    platform:    item.platform || '',
    publishedAt: item.published_at || item.fecha || '',
    capitulosRecientes: caps,
  };
};

export const getUltimosCapitulos = async (): Promise<MangaCapitulo[]> => {
  if (!catalogCache) catalogCache = readCatalogSessionCache();
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache.data;
  if (catalogRequest) return catalogRequest;

  catalogRequest = fetch(`${MM_API}/catalog`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { success?: boolean; mangas?: unknown[] } = await res.json();
      if (!data.success || !Array.isArray(data.mangas)) return [];

      const mangas = data.mangas.map(mapearMangaCatalog);
      if (mangas.length > 0) {
        const nextCache = {
          data: mangas,
          expiresAt: Date.now() + CATALOG_CACHE_TTL,
        };
        catalogCache = nextCache;
        persistCatalogSessionCache(nextCache);
      }
      return mangas;
    })
    .catch((error) => {
      console.error('Error getUltimosCapitulos:', error);
      return [];
    })
    .finally(() => {
      catalogRequest = null;
    });

  return catalogRequest;
};

const recentListsCache = createPublicDataCache<MangaCapitulo[]>({
  ttlMs: 60 * 1000,
  maxEntries: 8,
  shouldCache: items => items.length > 0,
});
const mangaDetailsCache = createPublicDataCache<MangaCapitulo | null>({
  ttlMs: 60 * 1000,
  maxEntries: 24,
  shouldCache: item => item !== null,
});

export const getNewReleases = (): Promise<MangaCapitulo[]> => recentListsCache.load('new-releases', async () => {
  try {

    const url = `${API_URL}?${EMBED_PORTADA}&per_page=12&orderby=date&order=desc&_fields=${CAMPOS_SOLICITADOS}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error API: ${res.status}`);
    const rawData: WPManga[] = await res.json();

    const seriesVistas = new Set<number>();
    const unicos: WPManga[] = [];

    for (const item of rawData) {
      const idSerie = item.ero_seri
        ? Number(item.ero_seri)
        : (item.categories?.[0] ?? item.id);
      if (!seriesVistas.has(idSerie)) {
        seriesVistas.add(idSerie);
        unicos.push(item);
      }
      if (unicos.length === 5) break;
    }

    return unicos.map((item) => mapearManga(item));
  } catch (error) {
    console.error('Error getNewReleases:', error);
    return [];
  }
});

export const getMangaById = (id: number | string): Promise<MangaCapitulo | null> => mangaDetailsCache.load(String(id), async () => {
  try {
    const res = await fetch(`${MM_API}/manga/${id}`);
    if (!res.ok) return null;

    const item: any = await res.json();
    if (!item.success) return null;
    return {
      ...mapearMangaCatalog(item),

      tipo: typeof item.tipo === 'string' ? item.tipo.trim() : '',
      totalViews: typeof item.totalViews === 'number' ? item.totalViews : undefined,
    };
  } catch (error) {
    console.error('Error getMangaById:', error);
    return null;
  }
});

export interface SeriesChapter {
  id: number;
  chapter_number: number;
  title: string;
  created_at: string;
  is_paid: boolean;
  price_coins: number;
  free_at: string | null;

  cover_url?: string | null;
}

const chapterPreviewCache = new Map<string, string | null>();
const chapterPreviewRequests = new Map<string, Promise<string | null>>();

const normalizeChapterPreviewUrl = (imageUrl: string): string => imageUrl.replace(/&amp;/g, '&');

const pickChapterScene = (images: string[], chapterNumber: number): string | null => {
  const validImages = images.filter((image): image is string => typeof image === 'string' && image.length > 0);
  if (validImages.length === 0) return null;

  const firstStoryPage = validImages.length > 4 ? 3 : 0;
  const candidateCount = Math.min(8, validImages.length - firstStoryPage);
  const selectedIndex = firstStoryPage + Math.abs(Math.round(chapterNumber * 7)) % candidateCount;
  return normalizeChapterPreviewUrl(validImages[selectedIndex]);
};

export const getChapterPreviewImage = async (
  chapterId: number | string,
  chapterNumber: number,
  token?: string | null,
): Promise<string | null> => {
  const cacheKey = `${chapterId}:${token ? 'authenticated' : 'public'}`;
  if (chapterPreviewCache.has(cacheKey)) return chapterPreviewCache.get(cacheKey) ?? null;

  const pending = chapterPreviewRequests.get(cacheKey);
  if (pending) return pending;

  const fetchPreview = async (accessToken?: string | null): Promise<string | null> => {
    const response = await fetch(`${MM_API}/chapters/content?id=${chapterId}`, accessToken ? {
      headers: { Authorization: `Bearer ${accessToken}` },
    } : undefined);
    if (!response.ok) return null;

    const data = await response.json() as { success?: boolean; images?: unknown };
    if (!data.success || !Array.isArray(data.images)) return null;
    return pickChapterScene(data.images, chapterNumber);
  };

  const fetchPublicWordPressPreview = async (): Promise<string | null> => {
    const response = await fetch(`${API_URL}/${chapterId}?_fields=content,aioseo_head_json,yoast_head_json`);
    if (!response.ok) return null;

    const data = await response.json() as {
      content?: { rendered?: string };
      aioseo_head_json?: {
        schema?: { '@graph'?: Array<{ image?: { url?: string } }> };
      };
      yoast_head_json?: { og_image?: Array<{ url?: string }> };
    };

    const renderedContent = data.content?.rendered || '';
    const galleryCandidates = Array.from(renderedContent.matchAll(/<img\b[^>]*>/gi))
      .map(([tag]) => {
        const source = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] || '';
        const width = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] || 0);
        const height = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] || 1);
        return { source: normalizeChapterPreviewUrl(source), aspect: width / height };
      })
      .filter(({ source }) => source.includes('/wp-content/uploads/'));

    if (galleryCandidates.length > 0) {
      const storyCandidates = galleryCandidates.length > 6
        ? galleryCandidates.slice(3, Math.min(galleryCandidates.length, 32))
        : galleryCandidates;
      const faceFriendlyPool = [...storyCandidates]
        .sort((first, second) => second.aspect - first.aspect)
        .slice(0, Math.min(6, storyCandidates.length));
      const selectedIndex = Math.abs(Math.round(chapterNumber * 5)) % faceFriendlyPool.length;
      return faceFriendlyPool[selectedIndex].source;
    }

    const schemaGraph = data.aioseo_head_json?.schema?.['@graph'] || [];
    const schemaImage = schemaGraph
      .map((entry) => entry.image?.url)
      .find((image): image is string => typeof image === 'string' && image.includes('/wp-content/uploads/'));
    if (schemaImage) return normalizeChapterPreviewUrl(schemaImage);

    const yoastImage = data.yoast_head_json?.og_image?.find((image) => image.url)?.url;
    return yoastImage ? normalizeChapterPreviewUrl(yoastImage) : null;
  };

  const request = fetchPublicWordPressPreview()
    .then(async (preview) => preview ?? fetchPreview(token))
    .then(async (preview) => preview ?? (token ? fetchPreview(null) : null))
    .catch(() => null)
    .then((preview) => {
      if (preview) chapterPreviewCache.set(cacheKey, preview);
      return preview;
    })
    .finally(() => {
      chapterPreviewRequests.delete(cacheKey);
    });

  chapterPreviewRequests.set(cacheKey, request);
  return request;
};

const seriesChaptersCache = createPublicDataCache<SeriesChapter[] | null>({
  ttlMs: 60 * 1000,
  maxEntries: 12,
  shouldCache: chapters => chapters !== null,
});
const chapterCountCache = new Map<string, { count: number; expiresAt: number }>();
const CHAPTER_COUNT_CACHE_KEY = 'mangamukai:chapter-counts:v1';
let chapterCountsRestored = false;

export const getCachedSeriesChapterCount = (id: number | string): number | null => {
  if (!chapterCountsRestored) {
    chapterCountsRestored = true;
    try {
      const entries = JSON.parse(sessionStorage.getItem(CHAPTER_COUNT_CACHE_KEY) || '[]');
      for (const [key, value] of entries) {
        if (Number.isInteger(value?.count) && value.count >= 0 && value.expiresAt > Date.now()) chapterCountCache.set(key, value);
      }
    } catch {                             }
  }
  const chapters = seriesChaptersCache.peek(String(id));
  if (chapters) return new Set(chapters.map(chapter => chapter.id)).size;
  const cached = chapterCountCache.get(String(id));
  return cached && cached.expiresAt > Date.now() ? cached.count : null;
};

const loadSeriesChapters = (eroSeri: number | string): Promise<SeriesChapter[] | null> => {
  const key = String(eroSeri);
  return seriesChaptersCache.load(key, () => fetch(`${MM_API}/series/${key}/chapters`)
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.chapters)) return null;
      return data.chapters as SeriesChapter[];
    })
    .catch((error) => {
      console.error('Error getChaptersBySeries:', error);
      return null;
    }));
};

export const getChaptersBySeries = async (eroSeri: number | string): Promise<SeriesChapter[]> =>
  (await loadSeriesChapters(eroSeri)) ?? [];

export const getSeriesChapterCount = async (eroSeri: number | string): Promise<number | null> => {
  const cached = getCachedSeriesChapterCount(eroSeri);
  if (cached !== null) return cached;
  const chapters = await loadSeriesChapters(eroSeri);
  if (chapters === null) return null;
  const count = new Set(chapters.map((chapter) => chapter.id)).size;
  chapterCountCache.set(String(eroSeri), { count, expiresAt: Date.now() + 5 * 60 * 1000 });
  try { sessionStorage.setItem(CHAPTER_COUNT_CACHE_KEY, JSON.stringify([...chapterCountCache])); } catch {                       }
  return count;
};

type PopularPeriod = 'weekly' | 'monthly' | 'historical';
type PopularAudience = 'women' | 'men';

interface PopularCacheEntry {
  data: MangaCapitulo[];
  expiresAt: number;
}

const POPULAR_CACHE_TTL = 5 * 60 * 1000;
const popularCache: Record<PopularAudience, Map<PopularPeriod, PopularCacheEntry>> = {
  women: new Map(),
  men: new Map(),
};
const popularRequests: Record<PopularAudience, Map<PopularPeriod, Promise<MangaCapitulo[]>>> = {
  women: new Map(),
  men: new Map(),
};

const getPopularByViews = async (
  audience: PopularAudience,
  period: PopularPeriod,
  forceRefresh: boolean,
): Promise<MangaCapitulo[]> => {
  const cached = popularCache[audience].get(period);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.data;

  const pending = popularRequests[audience].get(period);
  if (!forceRefresh && pending) return pending;

  const endpoint = audience === 'women' ? 'popular-women' : 'popular-men';
  const refreshQuery = forceRefresh ? `&refresh=1&t=${Date.now()}` : '';
  const request = fetch(`${MM_API}/${endpoint}?period=${period}${refreshQuery}`, {
    cache: forceRefresh ? 'no-store' : 'default',
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { success?: boolean; mangas?: unknown[] } = await res.json();
      if (!data.success || !Array.isArray(data.mangas)) return [];
      const mapped = data.mangas.map(mapearMangaCatalog);
      if (mapped.length > 0) {
        popularCache[audience].set(period, {
          data: mapped,
          expiresAt: Date.now() + POPULAR_CACHE_TTL,
        });
      }
      return mapped;
    })
    .catch((error) => {
      console.error(`Error getPopular${audience === 'women' ? 'Women' : 'Men'}ByViews:`, error);
      return [];
    })
    .finally(() => {
      if (popularRequests[audience].get(period) === request) {
        popularRequests[audience].delete(period);
      }
    });

  popularRequests[audience].set(period, request);
  return request;
};

export const getPopularWomenByViews = async (
  period: PopularPeriod = 'historical',
  forceRefresh = true
): Promise<MangaCapitulo[]> => getPopularByViews('women', period, forceRefresh);

export const getPopularMenByViews = async (
  period: PopularPeriod = 'historical',
  forceRefresh = true
): Promise<MangaCapitulo[]> => getPopularByViews('men', period, forceRefresh);

export const getLatestWomenUpdates = (limit = 18): Promise<MangaCapitulo[]> => recentListsCache.load(`latest-women:${limit}`, async () => {
  try {
    const res = await fetch(`${MM_API}/latest-women?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: any = await res.json();
    if (!data.success || !Array.isArray(data.mangas)) return [];
    return data.mangas.map(mapearMangaCatalog);
  } catch (error) {
    console.error('Error getLatestWomenUpdates:', error);
    return [];
  }
});

export const getLatestMenUpdates = (limit = 18): Promise<MangaCapitulo[]> => recentListsCache.load(`latest-men:${limit}`, async () => {
  try {
    const res = await fetch(`${MM_API}/latest-men?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: any = await res.json();
    if (!data.success || !Array.isArray(data.mangas)) return [];
    return data.mangas.map(mapearMangaCatalog);
  } catch (error) {
    console.error('Error getLatestMenUpdates:', error);
    return [];
  }
});

export interface RelatedManga {
  id: number;
  titulo: string;
  portada: string;
  tipo: string;
  genres: string[];
  totalViews: number;
  sharedGenres: number;
  chapterCount?: number;
}

const relatedMangasCache = createPublicDataCache<RelatedManga[]>({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 24,
  shouldCache: items => items.length > 0,
});

export const getRelatedMangas = (mangaId: number | string, limit = 10): Promise<RelatedManga[]> => relatedMangasCache.load(`${mangaId}:${limit}`, async () => {
  try {
    const res = await fetch(`${MM_API}/related/${mangaId}?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: any = await res.json();
    if (!data.success || !Array.isArray(data.mangas)) return [];
    const mangas = data.mangas as RelatedManga[];
    mangas.forEach(manga => rememberMangaTitle(manga.id, manga.titulo));
    return mangas;
  } catch (error) {
    console.error('Error getRelatedMangas:', error);
    return [];
  }
});

export const trackChapterView = async (chapterId: number | string, mangaId: number | string): Promise<void> => {
  try {
    await fetch(`${MM_API}/track-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: Number(chapterId), manga_id: Number(mangaId) }),
    });
  } catch {                           }
};

export const searchMangas = async (query: string): Promise<MangaCapitulo[]> => {
  const normalize = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();

  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const catalog = await getUltimosCapitulos();

  return catalog
    .map((manga) => {
      const title = normalize(manga.titulo);
      const searchableText = normalize([
        manga.titulo,
        manga.tipo,
        manga.genero,
        ...(manga.genres || []),
      ].filter(Boolean).join(' '));

      const matches = terms.every((term) => searchableText.includes(term));
      const rank = title.startsWith(normalizedQuery)
        ? 0
        : title.includes(normalizedQuery)
          ? 1
          : 2;

      return { manga, matches, rank };
    })
    .filter(({ matches }) => matches)
    .sort((a, b) => a.rank - b.rank || a.manga.titulo.localeCompare(b.manga.titulo, 'es'))
    .slice(0, 10)
    .map(({ manga }) => manga);
};
