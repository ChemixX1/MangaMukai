interface OutlinedNameProps {
  id: string;
  text: string;
  color: string;
  opacity: number;

  fontSize?: number;

  className?: string;
}

export const OutlinedName = ({ id, text, color, opacity, fontSize = 24, className = '' }: OutlinedNameProps) => {
  const maskId = `outlined-name-${id}`;
  const label = text.toUpperCase();
  const height = Math.round(fontSize * 1.2);
  const baseline = Math.round(fontSize * 0.96);
  return (
    <svg aria-hidden="true" className={`w-full overflow-visible font-russo font-normal ${className}`} style={{ height, fontSize }}>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
          <text x="50%" y={baseline} textAnchor="middle" fill="#000">{label}</text>
        </mask>
      </defs>
      <text x="50%" y={baseline} textAnchor="middle" fill={color} fillOpacity={opacity}>{label}</text>
      <text x="50%" y={baseline} textAnchor="middle" fill="none" stroke="#fff" strokeWidth={Math.max(4, fontSize / 6)} mask={`url(#${maskId})`}>{label}</text>
    </svg>
  );
};
