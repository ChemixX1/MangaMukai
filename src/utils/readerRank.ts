/**
 * Rango del lector según los capítulos leídos (dato de /social/profile).
 * Escalera única para toda la app; el servidor solo aporta la cifra.
 */
const READER_RANKS: Array<{ min: number; name: string }> = [
  { min: 500, name: 'Leyenda' },
  { min: 200, name: 'Sensei' },
  { min: 50, name: 'Senpai' },
  { min: 10, name: 'Kouhai' },
  { min: 0, name: 'Novato' },
];

export const readerRankName = (chaptersRead: number) =>
  (READER_RANKS.find((rank) => chaptersRead >= rank.min) ?? READER_RANKS[READER_RANKS.length - 1]).name;

export interface ReaderRankProgress {
  /** Rango actual. */
  name: string;
  /** Siguiente rango, o null si ya es el máximo. */
  next: string | null;
  /** Capítulos leídos dentro del tramo actual. */
  current: number;
  /** Capítulos que abarca el tramo (hasta el siguiente rango). */
  needed: number;
  /** 0–100 para la barra de progreso. */
  percent: number;
}

/** Progreso hacia el siguiente rango (barra de nivel). En el rango máximo la barra va llena. */
export const readerRankProgress = (chaptersRead: number): ReaderRankProgress => {
  const ladder = [...READER_RANKS].reverse(); // de menor a mayor
  let index = 0;
  ladder.forEach((rank, position) => { if (chaptersRead >= rank.min) index = position; });
  const rank = ladder[index];
  const nextRank = ladder[index + 1] ?? null;
  if (!nextRank) return { name: rank.name, next: null, current: chaptersRead, needed: chaptersRead, percent: 100 };
  const needed = nextRank.min - rank.min;
  const current = chaptersRead - rank.min;
  return { name: rank.name, next: nextRank.name, current, needed, percent: Math.min(100, Math.round((current / needed) * 100)) };
};
