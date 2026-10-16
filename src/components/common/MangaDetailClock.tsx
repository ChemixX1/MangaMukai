import { useEffect, useState } from 'react';
import { DetailWeatherIcon } from '../manga/referenceIcons';

const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase('es') + value.slice(1);

const NightIcon = () => (
  <svg className="manga-detail-clock-night" width="63" height="63" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M11.4733 11C11.3608 9.98614 10.9072 9.04058 10.1868 8.31836C9.46638 7.59614 8.52198 7.14011 7.5084 7.02504C6.49483 6.90997 5.47223 7.14268 4.60827 7.68502C3.7443 8.22737 3.09024 9.04716 2.75331 10.01C1.98126 10.0732 1.26357 10.4326 0.750479 11.0129C0.237391 11.5933 -0.031319 12.3496 0.000596555 13.1236C0.0325121 13.8976 0.362579 14.6292 0.921706 15.1654C1.48083 15.7015 2.22567 16.0006 3.00031 16H11.5003C12.1634 16 12.7992 15.7366 13.2681 15.2678C13.7369 14.7989 14.0003 14.163 14.0003 13.5C14.0003 12.837 13.7369 12.2011 13.2681 11.7322C12.7992 11.2634 12.1634 11 11.5003 11H11.4733Z" fill="currentColor" />
    <path d="M11.2868 1.77799C11.3442 1.69198 11.3736 1.59026 11.3709 1.48685C11.3681 1.38344 11.3333 1.28343 11.2714 1.20061C11.2094 1.11778 11.1232 1.05622 11.0248 1.02441C10.9264 0.992601 10.8205 0.992103 10.7218 1.02299C9.68636 1.34724 8.7991 2.02743 8.21708 2.9431C7.63506 3.85877 7.39583 4.95086 7.54176 6.02599C7.89941 6.06102 8.25276 6.13102 8.59676 6.23499C8.44198 5.5769 8.47564 4.88852 8.69388 4.24867C8.91211 3.60882 9.30611 3.04334 9.83076 2.61699C9.65756 3.28481 9.63704 3.98307 9.77071 4.65991C9.90439 5.33675 10.1888 5.97478 10.6029 6.52662C11.017 7.07846 11.55 7.52992 12.1625 7.84749C12.775 8.16506 13.4511 8.34057 14.1408 8.36099C13.4853 8.81618 12.6965 9.03933 11.8998 8.99499C12.0624 9.31299 12.1938 9.64632 12.2938 9.99499C13.0158 9.96424 13.7203 9.76346 14.3501 9.40897C14.9798 9.05448 15.5169 8.5563 15.9178 7.95499C15.9752 7.86898 16.0046 7.76726 16.0019 7.66385C15.9991 7.56044 15.9643 7.46043 15.9024 7.37761C15.8404 7.29478 15.7542 7.23322 15.6558 7.20141C15.5574 7.1696 15.4515 7.1691 15.3528 7.19999C14.6435 7.42262 13.8826 7.41976 13.175 7.1918C12.4674 6.96384 11.8479 6.522 11.402 5.92718C10.956 5.33237 10.7055 4.61388 10.6851 3.87074C10.6646 3.12761 10.8742 2.39643 11.2868 1.77799Z" fill="currentColor" />
  </svg>
);

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
  const isNight = now.getHours() < 6 || now.getHours() >= 18;
  const time = hours + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0') + (now.getHours() >= 12 ? ' PM' : ' AM');
  return (
    <div className="manga-detail-clock" role="timer" aria-label={date + ', ' + time}>
      <span className={`manga-detail-clock-icon${isNight ? ' is-night' : ''}`} aria-hidden="true">
        <DetailWeatherIcon size={63} className="manga-detail-clock-day" />
        <NightIcon />
      </span>
      <div><p>{date}</p><p>{time}</p></div>
    </div>
  );
};
