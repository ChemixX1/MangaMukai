// src/services/mangaService.ts

import type { WPManga, MangaCapitulo } from '../types/manga';

// ---------------------------------------------------------------------------
// CONFIGURACIÓN
// ---------------------------------------------------------------------------

const API_URL = 'https://mangamukai.com/wp-json/wp/v2/posts';
const MM_API  = 'https://mangamukai.com/wp-json/mangamukai/v1';

// NOTA: Los IDs de categoría originales (517, 519) resultaron ser nombres de
// series específicas, no géneros. Se dejan vacíos para devolver todos los posts
// hasta que se configuren categorías de género reales en WordPress.
const IDS_GENEROS_MUJER: number[] = [];
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    capitulosRecientes: [],
  };
};

// ---------------------------------------------------------------------------
// Mapper para respuesta del endpoint /catalog (post type 'manga')
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapearMangaCatalog = (item: any): MangaCapitulo => {
  const genres: string[] = Array.isArray(item.genres) ? item.genres : [];

  const TAGS_MUJER  = ['shoujo','shojo','josei','romance','yaoi','bl','yuri','otome'];
  const TAGS_HOMBRE = ['shounen','shonen','seinen','ecchi','harem','isekai','acción','accion','action','mecha'];
  const gl = genres.map((g: string) => g.toLowerCase());
  let genero: 'Hombre' | 'Mujer' | null = null;
  if (gl.some(g => TAGS_MUJER.includes(g)))  genero = 'Mujer';
  if (gl.some(g => TAGS_HOMBRE.includes(g))) genero = 'Hombre';

  return {
    id:       item.id,
    titulo:   item.titulo,
    portada:  item.portada,
    imagenes: [],
    fecha:    new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    descripcion: item.descripcion,
    categorias:  [],
    genres:      genres,
    esGratis:    !!item.esGratis,
    tipo:        item.tipo || 'Manga',
    genero,
    eroSeri:     item.id,   // en el endpoint /catalog, el ID del post ES el ero_seri
    capitulosRecientes: [],
  };
};

// ---------------------------------------------------------------------------
// 1. CATÁLOGO GENERAL — consulta directamente el post type 'manga' (448 series)
// ---------------------------------------------------------------------------
export const getUltimosCapitulos = async (): Promise<MangaCapitulo[]> => {
  try {
    const res = await fetch(`${MM_API}/catalog`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.mangas)) return [];
    return data.mangas.map(mapearMangaCatalog);
  } catch (error) {
    console.error('Error getUltimosCapitulos:', error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// 2. ÚLTIMAS ACTUALIZACIONES — MUJERES
// ---------------------------------------------------------------------------
export const getLatestWomenMangas = async (): Promise<MangaCapitulo[]> => {
  try {
    const res = await fetch(`${API_URL}?_embed&per_page=60&_fields=${CAMPOS_SOLICITADOS}`);
    if (!res.ok) throw new Error('Error API');
    const data: WPManga[] = await res.json();

    const filtrado = IDS_GENEROS_MUJER.length === 0
      ? data
      : data.filter((item: any) =>
          (item.categories || []).some((id: number) => IDS_GENEROS_MUJER.includes(id)));

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
    console.error('Error getLatestWomenMangas:', error);
    return [];
  }
};

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
export const getPopularWomenMangas = async (filtroTiempo = 'Histórico'): Promise<MangaCapitulo[]> => {
  try {
    let dateParam = '';
    if (filtroTiempo === 'Semanal') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      dateParam = `&after=${d.toISOString()}`;
    } else if (filtroTiempo === 'Mensual') {
      const d = new Date(); d.setDate(d.getDate() - 30);
      dateParam = `&after=${d.toISOString()}`;
    }

    const res = await fetch(
      `${API_URL}?_embed&per_page=100&orderby=date&order=desc${dateParam}&_fields=${CAMPOS_SOLICITADOS}`
    );
    const data: WPManga[] = res.ok ? await res.json() : [];

    const filtrado = IDS_GENEROS_MUJER.length === 0
      ? data
      : data.filter((item: any) =>
          (item.categories || []).some((id: number) => IDS_GENEROS_MUJER.includes(id)));

    const seriesVistas = new Set<number>();
    const unicos: WPManga[] = [];

    for (const item of filtrado) {
      const idSerie = item.ero_seri
        ? Number(item.ero_seri)
        : (item.categories?.[0] ?? item.id);
      if (!seriesVistas.has(idSerie)) {
        seriesVistas.add(idSerie);
        unicos.push(item as WPManga);
      }
      if (unicos.length >= 12) break;
    }

    return unicos.map((item) => mapearManga(item));
  } catch (error) {
    console.error('Error getPopularWomenMangas:', error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// 5. NUEVOS LANZAMIENTOS
// ---------------------------------------------------------------------------
export const getNewReleases = async (): Promise<MangaCapitulo[]> => {
  try {
    const url = `${API_URL}?_embed&per_page=15&orderby=date&order=desc&_fields=${CAMPOS_SOLICITADOS}&t=${Date.now()}`;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export const getChaptersByCategory = async (categoryId: number): Promise<Array<{ id: number; numero: string; esGratis: boolean; precio: number; fecha: string; titulo: string; }>> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let todos: any[] = [];
    let pagina = 1;
    let hayMas = true;

    while (hayMas) {
      const res = await fetch(
        `${API_URL}?categories=${categoryId}&per_page=100&page=${pagina}&_fields=${CAMPOS_SOLICITADOS}`
      );
      if (!res.ok) break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await res.json();
      if (data.length === 0) { hayMas = false; }
      else { todos = [...todos, ...data]; pagina++; }
    }

    return todos.map(c => {
      const mmInfo = c.mm_chapter_info;
      const esGratis = mmInfo
        ? !mmInfo.is_paid
        : (!c.myCRED_sell_content || c.myCRED_sell_content.status === 'disabled' || parseFloat(String(c.myCRED_sell_content.price)) === 0);
      const precio = mmInfo ? (mmInfo.price || 0) : 0;
      return {
        id: c.id,
        numero: String(c.ero_chapter || c.title?.rendered.replace(/[^0-9]/g, '') || '0'),
        esGratis,
        precio,
        fecha: new Date(c.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        titulo: c.title?.rendered || ''
      };
    });
  } catch (error) {
    console.error('Error getChaptersByCategory:', error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// 7. BÚSQUEDA POR TÍTULO
// ---------------------------------------------------------------------------
export const searchMangas = async (query: string): Promise<MangaCapitulo[]> => {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `${API_URL}?_embed&search=${encodeURIComponent(query)}&per_page=10&_fields=${CAMPOS_SOLICITADOS}`
    );
    if (!res.ok) return [];
    const data: WPManga[] = await res.json();
    return data.map((item) => mapearManga(item, false));
  } catch (error) {
    console.error('Error searchMangas:', error);
    return [];
  }
};
