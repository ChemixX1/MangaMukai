import { useEffect, useState } from 'react';

type MangaDetailClockProps = {
  isLight: boolean;
};

const getClockParts = (date: Date) => [
  { label: 'HRS', value: date.getHours().toString().padStart(2, '0') },
  { label: 'MIN', value: date.getMinutes().toString().padStart(2, '0') },
  { label: 'SEG', value: date.getSeconds().toString().padStart(2, '0') },
];

export const MangaDetailClock = ({ isLight }: MangaDetailClockProps) => {
  const [clockTime, setClockTime] = useState(() => new Date());

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setClockTime(new Date());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };

    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);

  const dateLabel = clockTime.toLocaleDateString('es-PE', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const clockParts = getClockParts(clockTime);

  return (
    <section className={`manga-detail-future-clock w-full ${isLight ? 'is-light' : 'is-dark'}`} aria-label={`Hora local: ${clockParts.map((part) => part.value).join(':')}`}>
      <div className="manga-detail-future-clock-header">
        <p className="manga-detail-future-clock-date">{dateLabel}</p>
      </div>

      <div className="manga-detail-future-clock-shell">
        <span className="manga-detail-future-clock-corner corner-top" aria-hidden="true" />
        <span className="manga-detail-future-clock-corner corner-bottom" aria-hidden="true" />
        <span className="manga-detail-future-clock-scan" aria-hidden="true" />

        <div className="manga-detail-future-clock-display">
          {clockParts.map((part, index) => (
            <div key={part.label} className="contents">
              <div className={`manga-detail-future-clock-unit ${part.label === 'SEG' ? 'is-seconds' : ''}`}>
                <span className="manga-detail-future-clock-value">{part.value}</span>
                <span className="manga-detail-future-clock-label">{part.label}</span>
              </div>
              {index < clockParts.length - 1 && <span className="manga-detail-future-clock-separator" aria-hidden="true">:</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
