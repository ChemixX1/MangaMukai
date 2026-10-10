import { useEffect, useState } from 'react';

const capitalize = (value: string) =>
  `${value.charAt(0).toLocaleUpperCase('es')}${value.slice(1)}`;

/**
 * "Sábado 02 de Septiembre del 2026". `toLocaleDateString` con opciones devuelve
 * "sábado, 02 de septiembre de 2026", así que las piezas se componen a mano para
 * poder poner día y mes en mayúscula inicial y el "del" antes del año.
 *
 * Se recalcula en cada tic a partir de la hora actual, así que el día y el mes
 * cambian solos al pasar la medianoche sin necesidad de recargar la página.
 */
const formatLongDate = (date: Date) => {
  const weekday = capitalize(date.toLocaleDateString('es-ES', { weekday: 'long' }));
  const day = String(date.getDate()).padStart(2, '0');
  const month = capitalize(date.toLocaleDateString('es-ES', { month: 'long' }));
  return `${weekday} ${day} de ${month} del ${date.getFullYear()}`;
};

const timeUnitsOf = (date: Date) => [
  { label: 'HRS', value: String(date.getHours()).padStart(2, '0') },
  { label: 'MIN', value: String(date.getMinutes()).padStart(2, '0') },
  { label: 'SEG', value: String(date.getSeconds()).padStart(2, '0') },
];

/** Reloj sobre la portada de la ficha de escritorio: fecha en Audiowide, cifras en Michroma y los dos puntos parpadeando. */
export const MangaDetailClock = () => {
  const [now, setNow] = useState(() => new Date());

  /* El siguiente aviso se programa al filo del segundo siguiente, no cada 1000 ms
     exactos: así el contador no se va desfasando con el reloj del sistema. */
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setNow(new Date());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };

    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);

  const units = timeUnitsOf(now);

  return (
    <div className="w-full" role="timer" aria-label={`${formatLongDate(now)}, ${units.map((unit) => unit.value).join(':')}`}>
      <p className="mb-[7px] text-center font-audiowide text-[clamp(0.66rem,1.4vw,0.79rem)] font-normal leading-[1.2] tracking-[0.02em] text-ink/90">{formatLongDate(now)}</p>

      <div className="relative overflow-hidden rounded-[14px] border border-line bg-surface/70 px-3 py-[9px]" aria-hidden="true">
        <div className="flex items-start justify-center gap-0.5">
          {units.map((unit, index) => (
            <div key={unit.label} className="flex items-start gap-0.5">
              <span className="flex min-w-10 flex-col items-center gap-0.5">
                <span className="font-[Michroma] text-[clamp(1.2rem,3.4vw,1.5rem)] font-normal leading-none tracking-[-0.02em] text-ink tabular-nums">{unit.value}</span>
                <span className="font-montserrat text-[8px] font-bold leading-none tracking-[0.22em] text-muted">{unit.label}</span>
              </span>
              {index < units.length - 1 && (
                <span className="animate-dot-blink font-orbitron text-[clamp(1rem,2.9vw,1.25rem)] font-semibold leading-[1.12] text-mukai-magenta motion-reduce:animate-none">:</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
