import { useEffect, useState } from 'react';
import { DetailWeatherIcon } from '../manga/referenceIcons';

const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase('es') + value.slice(1);

export const MangaDetailClock = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const weekday = capitalize(now.toLocaleDateString('es-PE', { weekday: 'long' }));
  const month = capitalize(now.toLocaleDateString('es-PE', { month: 'short' }).replace(/\.$/, ''));
  const date = weekday + ' ' + now.getDate() + ' ' + month + '.';
  const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
  const time = hours + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0') + (now.getHours() >= 12 ? ' PM' : ' AM');
  return (
    <div className="manga-detail-clock" role="timer" aria-label={date + ', ' + time}>
      <DetailWeatherIcon size={63} />
      <div><p>{date}</p><p>{time}</p></div>
    </div>
  );
};
