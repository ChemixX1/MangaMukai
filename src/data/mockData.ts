export interface Manga {
  id: string;
  title: string;
  coverImage: string;
  rating: number;
  genres: string[];
  latestChapter: number;
  // Agregamos esto opcional
  description?: string; 
}

export const MOCK_MANGAS: Manga[] = [
  {
    id: '1',
    title: 'Solo Leveling',
    coverImage: 'https://images7.alphacoders.com/134/1346383.jpeg', // Busca una imagen ancha/wallpaper si puedes
    rating: 4.9,
    genres: ['Action', 'Fantasy'],
    latestChapter: 179,
    description: "En un mundo donde cazadores con habilidades mágicas protegen a la humanidad, Sung Jin-Woo despierta un poder infinito."
  },
  {
    id: '2',
    title: 'Omniscient Reader',
    coverImage: 'https://images8.alphacoders.com/133/1333792.jpeg',
    rating: 5.0,
    genres: ['Adventure', 'System'],
    latestChapter: 180,
    description: "Dokja era un oficinista normal cuyo pasatiempo favorito era leer una novela web apocalíptica que nadie más leía."
  },
  {
    id: '3',
    title: 'The Beginning After The End',
    coverImage: 'https://images.alphacoders.com/115/1154037.jpg',
    rating: 4.8,
    genres: ['Magic', 'Isekai'],
    latestChapter: 175,
    description: "El Rey Grey tiene fuerza, riqueza y prestigio sin igual en un mundo gobernado por la habilidad marcial."
  },
   // ... tus otros mangas
];