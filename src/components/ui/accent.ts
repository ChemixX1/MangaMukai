/**
 * Acento de cada bloque del sitio: rosa para la parte femenina y celeste para
 * la juvenil. Los mismos valores que `mukai.pink` / `mukai.cyan` en
 * tailwind.config.js, para los estilos que se calculan en línea.
 */
export type Accent = 'pink' | 'cyan';

export const ACCENT_HEX: Record<Accent, string> = {
  pink: '#db2777',
  cyan: '#22d3ee',
};

/**
 * Color de la etiqueta de tipo: el manga toma el acento de su sección, el
 * manhua va en fucsia, el manhwa en violeta y la novela en azul.
 */
export const typeBadgeColor = (type: string, accent: Accent) => {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('manhwa')) return '#7c3aed';
  if (normalized.includes('manhua')) return '#a21caf';
  if (normalized.includes('novel')) return '#2563eb';
  return ACCENT_HEX[accent];
};
