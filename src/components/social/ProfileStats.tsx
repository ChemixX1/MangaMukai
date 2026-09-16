export interface ProfileStat {
  key: string;
  label: string;
  value: number;
}

interface ProfileStatsProps {
  isLight: boolean;
  stats: ProfileStat[];
  /** Si se pasa, cada cifra es un botón (p. ej. para abrir la lista de seguidores). */
  onSelect?: (key: string) => void;
  className?: string;
}

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
};

/**
 * Contadores del perfil (Seguidores · Siguiendo · Mangas leídos): la cifra grande
 * encima y la etiqueta debajo, algo más pequeña y en gris. Todo en Montserrat.
 */
export const ProfileStats = ({ isLight, stats, onSelect, className = '' }: ProfileStatsProps) => (
  <dl className={`flex items-start justify-center gap-7 font-[Montserrat] sm:justify-start ${className}`}>
    {stats.map((stat) => {
      const content = (
        <>
          <dt className={`order-2 text-[11px] font-semibold leading-tight ${isLight ? 'text-black/55' : 'text-white/60'}`}>{stat.label}</dt>
          <dd className={`order-1 text-[22px] font-extrabold leading-none tabular-nums ${isLight ? 'text-black' : 'text-white'}`}>{formatCount(stat.value)}</dd>
        </>
      );
      return onSelect ? (
        <button key={stat.key} type="button" onClick={() => onSelect(stat.key)} className="flex flex-col items-center gap-1 rounded-lg px-1 transition-colors hover:text-[#FF4D88]">
          {content}
        </button>
      ) : (
        <div key={stat.key} className="flex flex-col items-center gap-1">{content}</div>
      );
    })}
  </dl>
);
