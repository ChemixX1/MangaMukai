import { SOCIAL_LINKS } from '../../config/social';
import { HomeDiscordIcon, HomeSocialEndIcon, HomeSocialStartIcon, HomeTelegramIcon } from '../home/HomeIcons';

export const MangaCommunityLinks = () => (
  <nav aria-label="Comunidad de MangaMukai" className="manga-community-links">
    <a href={SOCIAL_LINKS.telegram} target="_blank" rel="noopener noreferrer" className="manga-community-telegram">
      <HomeSocialStartIcon className="manga-social-decoration" />
      <span><strong>TELEGRAM</strong><span>Alertas &amp; Novedades</span></span>
      <HomeTelegramIcon className="manga-social-icon" />
    </a>
    <a href={SOCIAL_LINKS.discord} target="_blank" rel="noopener noreferrer" className="manga-community-discord">
      <HomeDiscordIcon className="manga-social-icon" />
      <span><strong>Discord<i aria-hidden="true" /></strong><span>Únete a la Comunidad</span></span>
      <HomeSocialEndIcon className="manga-social-decoration" />
    </a>
  </nav>
);
