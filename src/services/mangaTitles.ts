// Reuse public series titles by manga or chapter ID, without fetching a detail page.
const titles = new Map<string, string>();
const MAX_TITLES = 5000;

export function rememberMangaTitle(id: number | string, title: string) {
  if (id == null || typeof title !== 'string' || !title.trim()) return;
  const key = String(id);
  titles.delete(key);
  titles.set(key, title.trim());
  if (titles.size > MAX_TITLES) titles.delete(titles.keys().next().value!);
}

export const getKnownMangaTitle = (id: number | string) => titles.get(String(id));
