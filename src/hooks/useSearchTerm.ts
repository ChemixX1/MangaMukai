import { useSyncExternalStore } from 'react';

let searchTerm = '';
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

 const getSearchTerm = () => searchTerm;

export const setSearchTerm = (value: string) => {
  if (value === searchTerm) return;
  searchTerm = value;
  listeners.forEach((listener) => listener());
};

export const useSearchTerm = () => useSyncExternalStore(subscribe, getSearchTerm, () => '');

export type SearchFilter = 'todos' | 'bn' | 'hot';
export const SEARCH_FILTERS: Array<{ id: SearchFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'bn', label: 'Mangas BN' },
  { id: 'hot', label: 'Mangas HOT' },
];

let searchFilter: SearchFilter = 'todos';

 const getSearchFilter = () => searchFilter;

export const setSearchFilter = (value: SearchFilter) => {
  if (value === searchFilter) return;
  searchFilter = value;
  listeners.forEach((listener) => listener());
};

export const useSearchFilter = () => useSyncExternalStore(subscribe, getSearchFilter, () => 'todos' as SearchFilter);

export const OPEN_SEARCH_EVENT = 'mm_open_search';

export const openSearchPanel = (filter: SearchFilter = 'todos') => {
  setSearchFilter(filter);
  setSearchTerm('');
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
};
