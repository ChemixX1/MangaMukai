import { useSyncExternalStore } from 'react';

/**
 * Término del buscador compartido entre el navbar (donde vive el campo en
 * móvil) y la Biblioteca (que filtra el catálogo con él). Es un mini store
 * externo para no depender de la URL en cada pulsación.
 */
let searchTerm = '';
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const getSearchTerm = () => searchTerm;

export const setSearchTerm = (value: string) => {
  if (value === searchTerm) return;
  searchTerm = value;
  listeners.forEach((listener) => listener());
};

export const useSearchTerm = () => useSyncExternalStore(subscribe, getSearchTerm, () => '');

/** Pestañas bajo el buscador: todo el catálogo, solo la colección B&N o solo la HOT. */
export type SearchFilter = 'todos' | 'bn' | 'hot';
export const SEARCH_FILTERS: Array<{ id: SearchFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'bn', label: 'Mangas BN' },
  { id: 'hot', label: 'Mangas HOT' },
];

let searchFilter: SearchFilter = 'todos';

export const getSearchFilter = () => searchFilter;

export const setSearchFilter = (value: SearchFilter) => {
  if (value === searchFilter) return;
  searchFilter = value;
  listeners.forEach((listener) => listener());
};

export const useSearchFilter = () => useSyncExternalStore(subscribe, getSearchFilter, () => 'todos' as SearchFilter);
