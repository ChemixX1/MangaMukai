

export type Accent = 'pink' | 'cyan';

export const ACCENT_COLOR: Record<Accent, string> = {
  pink: 'var(--mm-accent-pink)',
  cyan: 'var(--mm-accent-cyan)',
};

export const typeBadgeColor = (type: string, accent: Accent) => {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('manhwa')) return 'var(--mm-type-manhwa)';
  if (normalized.includes('manhua')) return 'var(--mm-type-manhua)';
  if (normalized.includes('novel')) return 'var(--mm-type-novel)';
  return `var(--mm-type-manga, ${ACCENT_COLOR[accent]})`;
};
