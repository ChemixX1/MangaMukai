/**
 * Catálogo local de la Tienda (demostración, sin pagos). Las imágenes son
 * portadas del catálogo de MangaMukai guardadas en `public/images/collection/`
 * con el id de su serie. El orden importa: la tienda destaca los productos 0
 * (novedad), 2 (fondo de "Recién llegados") y 4 (Mukai Select / Sale), y la
 * promoción de arte usa el 1.
 */
export type ShopCategory = 'Manga' | 'Art prints' | 'Colecciones';

export interface ShopProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  category: ShopCategory;
  hot?: boolean;
  sale?: boolean;
  soldOut?: boolean;
}

const cover = (seriesId: number) => `/images/collection/${seriesId}.webp`;

export const shopProducts: ShopProduct[] = [
  { id: 'MK-01', title: 'El amor obsesivo del ojo carmesí · Vol. 1', price: 14.9, image: cover(54961), category: 'Manga', hot: true },
  { id: 'MK-02', title: 'Porque te amo, te digo un adiós eterno · Art print', price: 19.9, image: cover(54977), category: 'Art prints' },
  { id: 'MK-03', title: 'Soneto del amanecer · Vol. 1', price: 13.9, image: cover(55005), category: 'Manga' },
  { id: 'MK-04', title: 'Al final, elijo casarme contigo · Colección', price: 59.9, image: cover(55239), category: 'Colecciones' },
  { id: 'MK-05', title: 'Me presentaron a mi primer amor · Art print', price: 16.9, image: cover(55281), category: 'Art prints', sale: true, hot: true },
  { id: 'MK-06', title: 'Aunque sea, dime que es amor · Vol. 1', price: 12.9, image: cover(55284), category: 'Manga', sale: true },
  { id: 'MK-07', title: 'Una sola palabra de Violet · Vol. 1', price: 14.9, image: cover(55443), category: 'Manga' },
  { id: 'MK-08', title: 'Reencarné como la hermana de la villana · Colección', price: 64.9, image: cover(55446), category: 'Colecciones', soldOut: true },
  { id: 'MK-09', title: 'La Ejecutora de la Diosa del Castigo · Art print', price: 18.9, image: cover(55778), category: 'Art prints' },
  { id: 'MK-10', title: 'Su Majestad, usted es el jefe ideal · Vol. 1', price: 13.9, image: cover(56903), category: 'Manga', hot: true },
  { id: 'MK-11', title: 'Más que la corona, elijo tu adoración · Colección', price: 72.9, image: cover(56981), category: 'Colecciones', sale: true },
  { id: 'MK-12', title: 'El Fragmento del Dragón · Vol. 1', price: 15.9, image: cover(57266), category: 'Manga' },
  { id: 'MK-13', title: '¿Tú me querías? · Art print', price: 17.9, image: cover(57410), category: 'Art prints', soldOut: true },
  { id: 'MK-14', title: 'La rebelión de la tirana Nero · Vol. 1', price: 14.9, image: cover(57821), category: 'Manga', sale: true },
  { id: 'MK-15', title: 'Rita, la del Oráculo · Colección', price: 68.9, image: cover(57841), category: 'Colecciones' },
  { id: 'MK-16', title: 'La esposa rehén quiere el divorcio · Vol. 1', price: 13.9, image: cover(58016), category: 'Manga', hot: true },
];
