export const GLOBAL_LOADING_EVENT = 'mangamukai:global-loading';

export type GlobalLoadingDetail = {
  progress?: number;
  status: 'start' | 'progress' | 'complete';
};

const emitGlobalLoading = (detail: GlobalLoadingDetail) => {
  window.dispatchEvent(new CustomEvent<GlobalLoadingDetail>(GLOBAL_LOADING_EVENT, { detail }));
};

export const startGlobalLoading = (progress = 8) => {
  emitGlobalLoading({ status: 'start', progress });
};

export const updateGlobalLoading = (progress: number) => {
  emitGlobalLoading({ status: 'progress', progress });
};

export const finishGlobalLoading = () => {
  emitGlobalLoading({ status: 'complete', progress: 100 });
};
