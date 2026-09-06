import { useEffect, useState } from 'react';

interface MangaDetailClockProps {
  isLight: boolean;
}

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

export const MangaDetailClock = ({ isLight }: MangaDetailClockProps) => {
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
    <div
      className={`manga-detail-clock ${isLight ? 'is-light' : 'is-dark'}`}
      role="timer"
      aria-label={`${formatLongDate(now)}, ${units.map((unit) => unit.value).join(':')}`}
    >
      <p className="manga-detail-clock-date">{formatLongDate(now)}</p>

      <div className="manga-detail-clock-shell" aria-hidden="true">
        <div className="manga-detail-clock-display">
          {units.map((unit, index) => (
            <div key={unit.label} className="manga-detail-clock-group">
              <span className="manga-detail-clock-unit">
                <span className="manga-detail-clock-value tabular-nums">{unit.value}</span>
                <span className="manga-detail-clock-label">{unit.label}</span>
              </span>
              {index < units.length - 1 && <span className="manga-detail-clock-separator">:</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
