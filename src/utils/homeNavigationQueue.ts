import { NAVIGATION_CACHE_MAX_SERIES } from './navigationCachePolicy.ts';

export interface HomePrefetchTarget {
  mangaId: string;
  seriesId?: string;
  prioritizeChapters?: boolean;
  warmFirstChapter?: boolean;
  chapterIds: string[];
}

export type HomePrefetchStage = 'selector' | 'detail' | 'reader' | 'extras';

export interface HomePrefetchGroup {
  current: HomePrefetchTarget[];
  next: HomePrefetchTarget[];
  visible: boolean;
}

/** Current pages always finish before adjacent pages; viewport sections go first. */
function homePrefetchBatches(groups: Iterable<HomePrefetchGroup>): HomePrefetchTarget[][] {
  const sections = [...groups];
  const current = new Map<string, HomePrefetchTarget>();
  const next = new Map<string, HomePrefetchTarget>();
  const merge = (ordered: Map<string, HomePrefetchTarget>, targets: HomePrefetchTarget[]) => {
    for (const target of targets) {
      const previous = ordered.get(target.mangaId);
      ordered.set(target.mangaId, {
        ...previous,
        ...target,
        mangaId: target.mangaId,
        chapterIds: [...new Set([...(previous?.chapterIds ?? []), ...target.chapterIds])],
      });
    }
  };
  for (const targets of [
    ...sections.filter(group => group.visible).map(group => group.current),
    ...sections.filter(group => !group.visible).map(group => group.current),
  ]) {
    merge(current, targets);
  }
  for (const group of sections) merge(next, group.next);
  const visible = new Set(sections.filter(group => group.visible).flatMap(group => group.current.map(target => target.mangaId)));
  const selected = new Set<string>();
  return [
    [...current.values()].filter(target => visible.has(target.mangaId)),
    [...current.values()].filter(target => !visible.has(target.mangaId)),
    [...next.values()],
  ].map(batch => batch.filter(target => {
    if (selected.has(target.mangaId)) return true;
    if (selected.size >= NAVIGATION_CACHE_MAX_SERIES) return false;
    selected.add(target.mangaId);
    return true;
  }));
}

export const homePrefetchOrder = (groups: Iterable<HomePrefetchGroup>): HomePrefetchTarget[] => homePrefetchBatches(groups).flat();

export function createHomeNavigationQueue(
  schedule: (task: () => Promise<void>) => () => void,
  prepare: (target: HomePrefetchTarget, signal: AbortSignal, stage: HomePrefetchStage) => Promise<void>,
) {
  const groups = new Map<string, HomePrefetchGroup>();
  const completed = new Map<string, Set<string>>();
  let enabled = false;
  let active: { target: HomePrefetchTarget; stage: HomePrefetchStage; controller: AbortController; cancel: () => void } | undefined;

  const stop = () => {
    const job = active;
    active = undefined;
    job?.controller.abort();
    job?.cancel();
  };
  const nextWork = () => {
    if (!enabled) return;
    const batches = homePrefetchBatches(groups.values());
    // Do not prepare more series than the caches can retain between stages.
    // A card leaving this budget may be evicted; prepare it again if it returns.
    const selected = new Set(batches.flatMap(batch => batch.map(target => target.mangaId)));
    for (const id of completed.keys()) if (!selected.has(id)) completed.delete(id);
    const nextSelector = (batch: HomePrefetchTarget[], priorityOnly = false) => {
      const item = batch.find(target => (!priorityOnly || target.prioritizeChapters) && target.seriesId && !completed.get(target.mangaId)?.has('selector'));
      return item ? { target: { ...item, chapterIds: [] }, stage: 'selector' as const } : undefined;
    };
    // Recent pages with real chapters get their selectors before any manga detail,
    // even when the hero is visible and those recent sections are below the fold.
    for (const batch of batches.slice(0, 2)) {
      const selector = nextSelector(batch, true);
      if (selector) return selector;
    }
    for (const batch of batches) {
      const selector = nextSelector(batch);
      if (selector) return selector;
      // Make every visible synopsis and chapter list usable before downloading images.
      for (const stage of ['detail', 'reader', 'extras'] as const) {
        for (const item of batch) {
          const done = completed.get(item.mangaId);
          const chapterIds = stage === 'reader' ? item.chapterIds.filter(id => !done?.has(`reader:${id}`)) : [];
          if (stage === 'reader' ? chapterIds.length > 0 || (item.warmFirstChapter && !done?.has('reader:first')) : !done?.has(stage)) {
            return { target: { ...item, chapterIds }, stage };
          }
        }
      }
    }
  };
  const pump = () => {
    const work = nextWork();
    const target = work?.target;
    if (active && target && active.stage === work.stage && active.target.mangaId === target.mangaId && active.target.seriesId === target.seriesId &&
      active.target.chapterIds.length === target.chapterIds.length &&
      target.chapterIds.every(id => active!.target.chapterIds.includes(id))) return;
    stop();
    if (!work) return;
    const job = { ...work, controller: new AbortController(), cancel: () => {} };
    active = job;
    job.cancel = schedule(async () => {
      if (job.controller.signal.aborted) return;
      try { await prepare(job.target, job.controller.signal, job.stage); }
      catch { /* A failed speculative request must not affect the home or loop. */ }
      finally {
        if (active === job) {
          const keys = job.stage === 'reader' ? [...job.target.chapterIds.map(id => `reader:${id}`), ...(job.target.warmFirstChapter ? ['reader:first'] : [])] : [job.stage];
          completed.set(job.target.mangaId, new Set([...(completed.get(job.target.mangaId) ?? []), ...keys]));
          active = undefined;
          pump();
        }
      }
    });
  };
  return {
    setEnabled(value: boolean) { enabled = value; pump(); },
    setGroup(key: string, group: HomePrefetchGroup) { groups.set(key, group); pump(); },
    removeGroup(key: string) { groups.delete(key); pump(); },
    reset() { stop(); completed.clear(); pump(); },
    stop() { enabled = false; stop(); },
  };
}
