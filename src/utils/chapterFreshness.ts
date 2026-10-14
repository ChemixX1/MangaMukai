/** «Nuevo» durante los primeros siete días; las fechas futuras no cuentan. */
export const isRecentChapter = (createdAt: string, now = Date.now()): boolean => {
  const published = Date.parse(createdAt.replace(' ', 'T'));
  const age = now - published;
  return Number.isFinite(published) && age >= 0 && age <= 7 * 86_400_000;
};
