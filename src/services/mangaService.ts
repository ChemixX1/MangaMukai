// src/services/mangaService.ts

import type { WPManga, MangaCapitulo } from '../types/manga';
import { MANGAMUKAI_API, WORDPRESS_POSTS_API } from '../config/api';

// ---------------------------------------------------------------------------
// CONFIGURACIÓN
// ---------------------------------------------------------------------------

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

    return { data: parsed.data, expiresAt: parsed.expiresAt };
  } catch {
    window.sessionStorage.removeItem(CATALOG_SESSION_CACHE_KEY);
    return null;
  }
};

const persistCatalogSessionCache = (entry: { data: MangaCapitulo[]; expiresAt: number }) => {
  if (typeof window === 'undefined') return;

  const persist = () => {
    try {
      window.sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // La caché es una mejora opcional; una cuota llena no debe romper el catálogo.
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(persist, { timeout: 2000 });
  } else {
    globalThis.setTimeout(persist, 0);
  }
};

// Los IDs antiguos resultaron pertenecer a series, no a géneros. La lista queda
// vacía hasta que WordPress exponga categorías masculinas configuradas como tal.
const IDS_GENEROS_HOMBRE: number[] = [];

const IMAGEN_DEFAULT = 'https://placehold.co/300x450/1a1a1a/FFF?text=Sin+Portada';

const CAMPOS_SOLICITADOS = [
  'id', 'date', 'title', 'excerpt', 'categories', 'featured_media', '_embedded', '_links',
  'ero_seri', 'ero_chapter', 'ero_chaptertitle',
  'myCRED_sell_content', 'mm_chapter_info', 'wpb_post_views_count', 'manga_cover', 'manga_description', 'manga_tags'
].join(',');

// ---------------------------------------------------------------------------
// UTILS
// ---------------------------------------------------------------------------

 
const obtenerPortadaReal = (item: any): string => {
  // First, check if the true manga cover was exposed by the backend patch
  if (item.manga_cover) {
    return item.manga_cover;
  }

  if (item._embedded?.['wp:featuredmedia']?.[0]) {
    const media = item._embedded['wp:featuredmedia'][0];
    // sizes puede estar vacío {}, usar source_url directamente
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
  const myCred = item.myCRED_sell_content;
  const esGratis = !myCred || myCred.status === 'disabled' || myCred.price === 0;

  // Usa manga_description si existe, sino el excerpt. Si ambas fallan, usa default.
  let finalDescription = item.manga_description 
        ? limpiarDescripcion(item.manga_description) 
        : limpiarDescripcion(item.excerpt?.rendered);
  if (!finalDescription) finalDescription = 'Lee esta historia en MangaMukai.';

  // Parsea tags usando el arreglo de strings devuelto por WP REST.
  const tagsReales = Array.isArray(item.manga_tags) && item.manga_tags.length > 0
        ? item.manga_tags 
        : ["Manga", "Acción"]; // Default
        
  // Inferir tipo (Manga / Manhwa / Manhua)
  let tipoReal = 'Manga';
  if (tagsReales.some((t: any) => String(t).toLowerCase() === 'manhwa')) tipoReal = 'Manhwa';
  if (tagsReales.some((t: any) => String(t).toLowerCase() === 'manhua')) tipoReal = 'Manhua';

  // Inferir género por tags
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

// ---------------------------------------------------------------------------
// Mapper para respuesta del endpoint /catalog y /manga/{id}
// ---------------------------------------------------------------------------
 
const mapearMangaCatalog = (item: any): MangaCapitulo => {
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

  // Poblar capitulosRecientes desde firstChapterId cuando exista
   
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
    rawFecha:    item.fecha || '',
    tituloOriginal: item.titulo_original || '',
    fechaManga:  item.fecha_manga || '',
    studio:      item.studio || '',
    platform:    item.platform || '',
    publishedAt: item.published_at || item.fecha || '',
    capitulosRecientes: caps,
  };
};

// ---------------------------------------------------------------------------
// 1. CATÁLOGO GENERAL — consulta directamente el post type 'manga'.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 2. ÚLTIMAS ACTUALIZACIONES — MUJERES
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 3. ÚLTIMAS ACTUALIZACIONES — HOMBRES
// ---------------------------------------------------------------------------
export const getLatestMenMangas = async (): Promise<MangaCapitulo[]> => {
  try {
    const res = await fetch(`${API_URL}?_embed&per_page=60&_fields=${CAMPOS_SOLICITADOS}`);
    if (!res.ok) throw new Error('Error API');
    const data: WPManga[] = await res.json();

    const filtrado = IDS_GENEROS_HOMBRE.length === 0
      ? data
      : data.filter((item: any) =>
          (item.categories || []).some((id: number) => IDS_GENEROS_HOMBRE.includes(id)));

    const seriesVistas = new Set<number>();
    const unicos: WPManga[] = [];

    for (const item of filtrado) {
      const idSerie = item.ero_seri
        ? Number(item.ero_seri)
        : (item.categories?.[0] ?? item.id);
      if (!seriesVistas.has(idSerie)) {
        seriesVistas.add(idSerie);
        unicos.push(item);
      }
      if (unicos.length >= 18) break;
    }

    return unicos.map((item) => mapearManga(item));
  } catch (error) {
    console.error('Error getLatestMenMangas:', error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// 4. POPULARES — MUJERES (Hero + PopularCarousel)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 5. NUEVOS LANZAMIENTOS
// ---------------------------------------------------------------------------
export const getNewReleases = async (): Promise<MangaCapitulo[]> => {
  try {
    const url = `${API_URL}?_embed&per_page=20&orderby=date&order=desc&_fields=${CAMPOS_SOLICITADOS}&t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
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
};

// ---------------------------------------------------------------------------
// 6. MANGA POR ID (post type 'manga' — usa endpoint propio)
// ---------------------------------------------------------------------------
export const getMangaById = async (id: number | string): Promise<MangaCapitulo | null> => {
  try {
    const res = await fetch(`${MM_API}/manga/${id}`);
    if (!res.ok) return null;
     
    const item: any = await res.json();
    if (!item.success) return null;
    return mapearMangaCatalog(item);
  } catch (error) {
    console.error('Error getMangaById:', error);
    return null;
  }
};

// ---------------------------------------------------------------------------
// CHAPTER INTERFACES (compartido con ChapterList)
// ---------------------------------------------------------------------------
export interface SeriesChapter {
  id: number;
  chapter_number: number;
  title: string;
  created_at: string;
  is_paid: boolean;
  price_coins: number;
  free_at: string | null;
}

// ---------------------------------------------------------------------------
// 8. CAPÍTULOS POR SERIE (usa endpoint propio — consulta por ero_seri meta)
// ---------------------------------------------------------------------------
export const getChaptersBySeries = async (eroSeri: number | string): Promise<SeriesChapter[]> => {
  try {
    const res = await fetch(`${MM_API}/series/${eroSeri}/chapters`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? (data.chapters as SeriesChapter[]) : [];
  } catch (error) {
    console.error('Error getChaptersBySeries:', error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// 9. CAPÍTULOS POR CATEGORÍA (fallback — pagina hasta 100 por página)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 10. POPULARES MUJERES POR VISITAS (semanal / mensual / histórico)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 11. ÚLTIMAS ACTUALIZACIONES MUJERES con datos de capítulo
// ---------------------------------------------------------------------------
export const getLatestWomenUpdates = async (limit = 18): Promise<MangaCapitulo[]> => {
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
};

export const getLatestMenUpdates = async (limit = 18): Promise<MangaCapitulo[]> => {
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
};

// ---------------------------------------------------------------------------
// 13. MANGAS RELACIONADOS (por géneros + visitas)
// ---------------------------------------------------------------------------
export interface RelatedManga {
  id: number;
  titulo: string;
  portada: string;
  tipo: string;
  genres: string[];
  totalViews: number;
  sharedGenres: number;
}

export const getRelatedMangas = async (mangaId: number | string, limit = 10): Promise<RelatedManga[]> => {
  try {
    const res = await fetch(`${MM_API}/related/${mangaId}?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
     
    const data: any = await res.json();
    if (!data.success || !Array.isArray(data.mangas)) return [];
    return data.mangas as RelatedManga[];
  } catch (error) {
    console.error('Error getRelatedMangas:', error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// 12. REGISTRAR VISITA A CAPÍTULO
// ---------------------------------------------------------------------------
export const trackChapterView = async (chapterId: number | string, mangaId: number | string): Promise<void> => {
  try {
    await fetch(`${MM_API}/track-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: Number(chapterId), manga_id: Number(mangaId) }),
    });
  } catch { /* silent — no crítico */ }
};

// ---------------------------------------------------------------------------
// 7. BÚSQUEDA SOBRE EL CATÁLOGO DE SERIES
// ---------------------------------------------------------------------------
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
