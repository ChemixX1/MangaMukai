/** El rango Mukai tiene cinco niveles; todos empiezan en el nivel 1. */
const LEVEL_THRESHOLDS = [0, 10, 50, 200, 500] as const;
const safeChapters = (chaptersRead: number) => Math.max(0, Math.floor(Number(chaptersRead) || 0));
export const readerLevel = (chaptersRead: number) => LEVEL_THRESHOLDS.reduce((level, threshold, index) => safeChapters(chaptersRead) >= threshold ? index + 1 : level, 1);
export const readerRankName = (chaptersRead: number) => `Nivel ${readerLevel(chaptersRead)}`;

export interface ReaderRankProgress {
  name: string;
  next: string | null;
  current: number;
  needed: number;
  percent: number;
}

export const readerRankProgress = (chaptersRead: number): ReaderRankProgress => {
  const chapters = safeChapters(chaptersRead);
  const level = readerLevel(chapters);
  const start = LEVEL_THRESHOLDS[level - 1];
  const next = LEVEL_THRESHOLDS[level];
  if (next === undefined) return { name: `Nivel ${level}`, next: null, current: chapters - start, needed: 0, percent: 100 };
  const needed = next - start;
  const current = chapters - start;
  return { name: `Nivel ${level}`, next: `Nivel ${level + 1}`, current, needed, percent: Math.min(100, Math.round(current / needed * 100)) };
};
