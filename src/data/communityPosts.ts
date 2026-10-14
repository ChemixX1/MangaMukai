/**
 * Publicaciones de la Comunidad. Viven en el navegador (localStorage, una lista
 * por usuario) hasta que exista un feed global en el servidor: hoy la API solo
 * devuelve las publicaciones de un perfil concreto.
 */
import rainArtwork from '../assets/community/reading-rain.webp';
import arianelArtwork from '../assets/character/arianel-backdrop.webp';
import estrellaArtwork from '../assets/character/estrella-backdrop.webp';
import arianelAvatar from '../assets/character/arianel.webp';
import estrellaAvatar from '../assets/character/estrella.webp';
import ravenAvatar from '../assets/character/raven.webp';

export type CommunityComment = { id?: string; userId?: string; name: string; avatar?: string; text: string; image?: string; createdAt?: string; likes?: number; liked?: boolean };

/** Manga (o capítulo) recomendado en una publicación. La portada se puede ocultar y dejar solo el texto. */
export type CommunityMangaTag = {
  id: string;
  title: string;
  cover: string;
  showCover: boolean;
  chapterId?: number;
  chapterLabel?: string;
};

export type CommunityPost = {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  content: string;
  image?: string;
  manga?: CommunityMangaTag;
  likes: number;
  views?: number;
  liked?: boolean;
  saved?: boolean;
  comments: CommunityComment[];
  /** Publicación de ejemplo (no la escribió el lector). */
  demo?: boolean;
  createdAt?: string;
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const communitySeeds: CommunityPost[] = [
  { id: 'sample-1', userId: 'sample-hana', name: 'Hana', avatar: arianelAvatar, content: 'Hay historias que terminas de leer y se quedan contigo todo el día. ¿Cuál fue la última que les hizo sentir así? 🌸', likes: 128, views: 10000, comments: [], demo: true, createdAt: hoursAgo(2) },
  { id: 'sample-2', userId: 'sample-ren', name: 'Ren', avatar: ravenAvatar, content: 'Mi ritual favorito: lluvia, café y un capítulo más. Solo uno… eso dije hace tres horas. ☕ #LeyendoAhora', image: rainArtwork, likes: 86, views: 1200, comments: [], demo: true, createdAt: hoursAgo(7) },
  { id: 'sample-3', userId: 'sample-yuki', name: 'Yuki', avatar: estrellaAvatar, content: 'Hay viñetas que merecen su propio marco. ¿Qué manga les enamoró primero por su dibujo? ✨ #Recomendaciones', likes: 43, views: 870, comments: [], demo: true, createdAt: hoursAgo(26) },
  { id: 'sample-4', userId: 'sample-sora', name: 'Sora', avatar: arianelAvatar, content: 'Un pequeño descanso entre capítulos para apreciar estos paisajes. 🌸 #FanArt', image: arianelArtwork, likes: 65, views: 1500, comments: [], demo: true, createdAt: hoursAgo(29) },
  { id: 'sample-5', userId: 'sample-aki', name: 'Aki', avatar: ravenAvatar, content: 'Busco una historia que me haga reír tanto como emocionarme. Los leo. 📚 #MangaDelDía', likes: 24, views: 560, comments: [], demo: true, createdAt: hoursAgo(32) },
  { id: 'sample-6', userId: 'sample-mei', name: 'Mei', avatar: estrellaAvatar, content: 'La mejor parte de encontrar una nueva historia es tener con quién compartirla. ✨ #Romance', image: estrellaArtwork, likes: 52, views: 1100, comments: [], demo: true, createdAt: hoursAgo(36) },
];

/** Resuelve las portadas de muestra antiguas conservadas en localStorage. */
export const communityImage = (src?: string) => src?.startsWith('/images/collection/') ? rainArtwork : src;

/** Lectores sugeridos de ejemplo (autores de las publicaciones de muestra). */
export const suggestedReaders = communitySeeds.map(({ userId, name, avatar }) => ({ userId, name, avatar }));

export type CommunityTrend = { category: string; label: string; hint: string };

/** Temas sugeridos mientras la comunidad no etiqueta mangas ni usa hashtags. */
export const fallbackTrends: CommunityTrend[] = [
  { category: 'Tendencia · Manga', label: '#MangaDelDía', hint: 'Entre lectores' },
  { category: 'Lecturas', label: '#LeyendoAhora', hint: 'Tu próxima historia' },
  { category: 'Arte', label: '#FanArt', hint: 'Talento de la comunidad' },
  { category: 'Romance', label: '#Romance', hint: 'Historias que enamoran' },
];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Tendencias reales de la comunidad: primero los mangas más recomendados (etiquetados
 * en publicaciones) y después los hashtags más usados. Se completa con el relleno.
 */
export const computeTrends = (posts: CommunityPost[], limit = 5): CommunityTrend[] => {
  const mangas = new Map<string, number>();
  const tags = new Map<string, number>();
  posts.forEach((post) => {
    if (post.manga) mangas.set(post.manga.title, (mangas.get(post.manga.title) || 0) + 1);
    (post.content.match(/#[\p{L}\p{N}_]+/gu) || []).forEach((tag) => tags.set(tag, (tags.get(tag) || 0) + 1));
  });
  const byCount = (a: [string, number], b: [string, number]) => b[1] - a[1] || a[0].localeCompare(b[0], 'es');
  const trends: CommunityTrend[] = [
    ...[...mangas.entries()].sort(byCount).map(([title, count]) => ({ category: 'Recomendado · Manga', label: title, hint: plural(count, 'recomendación', 'recomendaciones') })),
    ...[...tags.entries()].sort(byCount).map(([tag, count]) => ({ category: 'Tendencia', label: tag, hint: plural(count, 'publicación', 'publicaciones') })),
  ];
  fallbackTrends.forEach((trend) => { if (!trends.some((entry) => entry.label === trend.label)) trends.push(trend); });
  return trends.slice(0, limit);
};

/** Anuncios de Comunidad, compartidos por PC y móvil. */
export const communityAds = [
  { id: 'store', to: '/tienda', eyebrow: 'TIENDA MUKAI', title: 'Mangas para tu colección', text: 'Volúmenes, ilustraciones y colecciones.', cta: 'Ver tienda', image: '/images/collection/57821.webp' },
  { id: 'chat', to: '/chat', eyebrow: 'CHARACTER', title: 'Chatea con personajes', text: 'Conversa con tus personajes favoritos.', cta: 'Explorar personajes', image: '/images/collection/57266.webp' },
];

export const handleOf = (name: string) => `@${name.toLowerCase().replace(/\s+/g, '')}`;

export const timeAgo = (value?: string) => {
  if (!value) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  return `${Math.floor(seconds / 86400)} d`;
};

export const formatCount = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')} mil` : String(value);
