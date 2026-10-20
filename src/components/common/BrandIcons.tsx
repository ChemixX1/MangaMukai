interface GlyphProps {
  size?: number;
  className?: string;
}

export const SearchGlyph = ({ size = 22, className }: GlyphProps) => (
  <svg width={size} height={size} viewBox="0 0 200 200" className={className} aria-hidden="true">
    <circle cx="90" cy="90" r="72" fill="none" stroke="currentColor" strokeWidth="18" />
    <line x1="141" y1="141" x2="180" y2="180" stroke="currentColor" strokeWidth="18" strokeLinecap="butt" />
  </svg>
);

export const BellGlyph = ({ size = 22, className }: GlyphProps) => (
  <svg width={size} height={size} viewBox="0 0 180 197" className={className} fill="none" stroke="currentColor" strokeWidth="14" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M87.5 6.5C53.8 6.5 26.5 32.4 26.5 64.2L26.5 98.7L13.3 132.9C11.2 138.2 14.5 142.1 20.2 142.1H154.8C160.5 142.1 163.8 138.2 161.7 132.9L148.5 98.7V64.2C148.5 32.4 121.2 6.5 87.5 6.5Z" />
    <path d="M60.5 155H114.5C112.6 167.2 101.7 176.2 87.5 176.2C73.3 176.2 62.4 167.2 60.5 155Z" />
  </svg>
);
