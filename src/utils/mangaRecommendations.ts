import type { MangaCapitulo } from '../types/manga';
import type { RelatedManga } from '../services/mangaService';

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const stopWords = new Set('para como pero porque cuando donde desde hasta entre sobre esta este estos estas tiene tiene todos todas historia manga manhwa capitulo una unos unas los las del con por que sus sin ella ellos ellas ser sera sido quien mientras despues antes muy mas'.split(' '));
const words = (text = '') => new Set(normalize(text.replace(/<[^>]*>/g, ' ').slice(0, 4000)).match(/[a-z]{4,}/g)?.filter(word => !stopWords.has(word)) ?? []);

/** Reuses the loaded catalog; bounded synopsis comparisons require no extra requests. */
export function buildMangaRecommendations(current: MangaCapitulo, catalog: MangaCapitulo[], related: RelatedManga[], limit = 18): RelatedManga[] {
  const excluded = new Set([String(current.id), String(current.eroSeri || current.id)]);
  const terms = words(current.descripcion);
  const genres = new Set((current.genres ?? []).map(normalize));
  const candidates = new Map<string, { item: RelatedManga; score: number }>();
  for (const item of related) {
    if (!excluded.has(String(item.id))) candidates.set(String(item.id), { item, score: item.sharedGenres * 3 });
  }
  const seen = new Set<string>();
  for (const manga of catalog) {
    const id = String(manga.eroSeri || manga.id);
    if (excluded.has(id) || seen.has(id) || !Number.isFinite(Number(id))) continue;
    seen.add(id);
    const otherTerms = words(manga.descripcion);
    let overlap = 0;
    for (const word of terms) if (otherTerms.has(word)) overlap++;
    const similarity = overlap / Math.sqrt(Math.max(1, terms.size * otherTerms.size));
    const sharedGenres = (manga.genres ?? []).filter(genre => genres.has(normalize(genre))).length;
    const existing = candidates.get(id);
    candidates.set(id, {
      item: { id: Number(id), titulo: manga.titulo, portada: manga.portada, tipo: manga.tipo, genres: manga.genres ?? [], totalViews: manga.totalViews ?? 0, ...existing?.item, sharedGenres: Math.max(sharedGenres, existing?.item.sharedGenres ?? 0), chapterCount: manga.chapterCount ?? existing?.item.chapterCount },
      score: Math.max(sharedGenres * 3, existing?.score ?? 0) + similarity * 6,
    });
  }
  return [...candidates.values()].sort((a, b) => b.score - a.score || b.item.totalViews - a.item.totalViews).slice(0, limit).map(({ item }) => item);
}
