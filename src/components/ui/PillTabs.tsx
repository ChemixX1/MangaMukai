interface PillTabsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** Ancho y márgenes del grupo (por defecto ocupa lo que le dé su contenedor). */
  className?: string;
}

/**
 * Pestañas en píldora del diseño (Semanal · Mensual · Histórico): borde fino
 * redondeado y la opción elegida rellena con la tinta del tema.
 */
export const PillTabs = <T extends string>({ options, value, onChange, label, className = '' }: PillTabsProps<T>) => (
  <div role="tablist" aria-label={label} className={`flex h-11 items-center rounded-3xl border border-[color:var(--mm-tab-line)] p-px ${className}`}>
    {options.map((option) => {
      const active = option === value;
      return (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(option)}
          className={`h-10 flex-1 rounded-3xl px-2 font-montserrat text-xs uppercase leading-3 transition-colors ${active ? 'bg-ink font-black text-surface' : 'font-bold text-ink'}`}
        >
          {option}
        </button>
      );
    })}
  </div>
);
