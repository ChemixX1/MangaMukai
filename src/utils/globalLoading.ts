export const GLOBAL_LOADING_EVENT = 'mangamukai:global-loading';

export type GlobalLoadingDetail = {
  progress?: number;
  scope?: string;
  status: 'start' | 'progress' | 'complete';
};

const emitGlobalLoading = (detail: GlobalLoadingDetail) => {
  window.dispatchEvent(new CustomEvent<GlobalLoadingDetail>(GLOBAL_LOADING_EVENT, { detail }));
};

export const startGlobalLoading = (progress = 8, scope = 'page') => {
  emitGlobalLoading({ status: 'start', progress, scope });
};

export const updateGlobalLoading = (progress: number) => {
  emitGlobalLoading({ status: 'progress', progress });
};

export const finishGlobalLoading = (scope = 'page') => {
  emitGlobalLoading({ status: 'complete', progress: 100, scope });
};
