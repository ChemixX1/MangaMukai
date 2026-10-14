export const SEARCH_COLLECTION_ORDER = ['todos', 'bn', 'hot'] as const;
export type SearchCollection = (typeof SEARCH_COLLECTION_ORDER)[number];
export type SearchSectionStage = 0 | 1 | 2 | 3;

/** Cada colección publica Buscados → géneros → lanzamientos, sin esperar al resto. */
export const loadSearchSections = async (
  load: (collection: SearchCollection, stage: Exclude<SearchSectionStage, 0>) => Promise<void>,
  publish: (collection: SearchCollection, stage: SearchSectionStage) => void,
  isActive: () => boolean = () => true,
) => {
  for (const collection of SEARCH_COLLECTION_ORDER) {
    for (const stage of [1, 2, 3] as const) {
      if (!isActive()) return;
      try { await load(collection, stage); }
      catch { /* Una portada fallida no bloquea las siguientes secciones. */ }
      if (!isActive()) return;
      publish(collection, stage);
    }
  }
};
