// src/types/manga.ts

export interface WPManga {
  id: number;
  date: string;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  
  // Campos personalizados reales de WordPress
  ero_seri?: string | number;
  ero_chapter?: string | number;
  ero_chaptertitle?: string;
  myCRED_sell_content?: { status: string; price: number };
  wpb_post_views_count?: number;

  categories: number[];
  
  // ✅ DEFINICIÓN COMPLETA DE IMÁGENES (Para evitar el @ts-ignore)
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      media_details?: {
        sizes?: {
          full?: {
            source_url: string;
          };
          large?: {
            source_url: string;
          };
        };
      };
    }>;
  };
  
  // Soporte SEO
  aioseo_head_json?: {
      og_image?: Array<{ url: string }>;
  };
  yoast_head_json?: {
      og_image?: Array<{ url: string }>;
  };
}

export interface MangaCapitulo {
  id: number | string;
  titulo: string;
  portada: string;
  imagenes: string[];
  fecha: string;
  descripcion?: string;
  categorias?: number[];
  genres?: string[];
  esGratis: boolean;
  tipo: string;
  genero?: 'Hombre' | 'Mujer' | null;
  eroSeri?: number | null;
  status?: string;
  totalViews?: number;
  rawFecha?: string;
  capitulosRecientes: Array<{
    id: number;
    numero: string;
    esGratis: boolean;
    fecha: string;
    free_at?: string | null;
  }>;
}