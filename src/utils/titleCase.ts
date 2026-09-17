/** "la villana florece" -> "La Villana Florece": cada palabra empieza en mayúscula. */
export const toTitleCase = (value: string) => value
  .toLocaleLowerCase('es')
  .replace(/(^|[\s\-\u2013\u2014/([{\u00bf\u00a1'\u2019])\p{L}/gu, (match) => match.toLocaleUpperCase('es'));
