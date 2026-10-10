/**
 * Acento de cada bloque del sitio: rosa para la parte femenina y celeste para
 * la juvenil. Son variables CSS (definidas en index.css) para que una colección
 * pueda sustituirlas: la de blanco y negro las pasa a gris.
 */
export type Accent = 'pink' | 'cyan';

export const ACCENT_COLOR: Record<Accent, string> = {
  pink: 'var(--mm-accent-pink)',
  cyan: 'var(--mm-accent-cyan)',
};

/**
 * Color de la etiqueta de tipo: el manga toma el acento de su sección, el
 * manhua va en fucsia, el manhwa en violeta y la novela en azul.
 */
export const typeBadgeColor = (type: string, accent: Accent) => {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('manhwa')) return 'var(--mm-type-manhwa)';
  if (normalized.includes('manhua')) return 'var(--mm-type-manhua)';
  if (normalized.includes('novel')) return 'var(--mm-type-novel)';
  return ACCENT_COLOR[accent];
};
