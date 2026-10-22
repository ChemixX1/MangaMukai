import { SOCIAL_LINKS } from '../../config/social';
import { DetailXIcon, DetailYoutubeIcon, DetailTelegramIcon, DetailDiscordIcon, DetailInstagramIcon, DetailFacebookIcon } from './referenceIcons';

const SOCIAL_ICONS = { X: DetailXIcon, Instagram: DetailInstagramIcon, YouTube: DetailYoutubeIcon, Telegram: DetailTelegramIcon, Discord: DetailDiscordIcon, Facebook: DetailFacebookIcon };
const DETAIL_SOCIALS = [
  { name: 'Facebook', size: 23, left: 0, top: 3 },
  { name: 'Instagram', size: 23, left: 31, top: 3 },
  { name: 'Discord', size: 29, left: 62, top: 0 },
  { name: 'Telegram', size: 22, left: 100, top: 2 },
  { name: 'YouTube', size: 28, left: 130, top: 1 },
  { name: 'X', size: 21, left: 168, top: 3 },
] as const;

export const MangaDetailSocials = () => (
  <div className="manga-detail-socials text-center">
    <p>¡Síguenos!</p>
    <div className="manga-detail-social-icons" aria-label="Redes sociales de MangaMukai">
      {DETAIL_SOCIALS.map(({ name, size, left, top }) => {
        const SocialIcon = SOCIAL_ICONS[name];
        const href = SOCIAL_LINKS[name.toLowerCase() as keyof typeof SOCIAL_LINKS];
        return (
          <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name} title={name} style={{ width: size, height: size, left, top }} className="absolute flex items-center justify-center text-ink transition-transform hover:-translate-y-0.5 hover:text-mukai-magenta">
            <SocialIcon size={size} />
          </a>
        );
      })}
    </div>
  </div>
);
