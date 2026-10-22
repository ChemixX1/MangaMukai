// Reuse public series titles by manga or chapter ID, without fetching a detail page.
const titles = new Map<string, string>();
const MAX_TITLES = 5000;
const VISITED_TITLES_KEY = 'mangamukai:visited-titles:v1';
let visitedTitles: Map<string, string> | undefined;

function readVisitedTitles() {
  if (visitedTitles) return visitedTitles;
  visitedTitles = new Map();
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(VISITED_TITLES_KEY) || '[]');
    if (Array.isArray(stored)) for (const row of stored.slice(-100)) {
      if (Array.isArray(row) && typeof row[0] === 'string' && typeof row[1] === 'string') visitedTitles.set(row[0], row[1]);
    }
  } catch { /* Titles in memory still work when browser storage is unavailable. */ }
  return visitedTitles;
}

/** Only persist visited pages, not every catalog row, to keep navigation lightweight. */
export function rememberVisitedMangaTitle(id: string, title: string) {
  const value = title.trim();
  if (!value) return;
  rememberMangaTitle(id, value);
  const visited = readVisitedTitles();
  if (visited.get(id) === value) return;
  visited.delete(id);
  visited.set(id, value);
  while (visited.size > 100) visited.delete(visited.keys().next().value!);
  try { sessionStorage.setItem(VISITED_TITLES_KEY, JSON.stringify([...visited])); } catch { /* Optional cache. */ }
}

export function rememberMangaTitle(id: number | string, title: string) {
  if (id == null || typeof title !== 'string' || !title.trim()) return;
  const key = String(id);
  titles.delete(key);
  titles.set(key, title.trim());
  if (titles.size > MAX_TITLES) titles.delete(titles.keys().next().value!);
}

export const getKnownMangaTitle = (id: number | string) => titles.get(String(id)) ?? readVisitedTitles().get(String(id));
