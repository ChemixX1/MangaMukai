import { SOCIAL_LINKS } from '../../config/social';
import { HomeDiscordIcon, HomeTelegramIcon } from '../home/HomeIcons';

/** Solo los dos enlaces de comunidad, contenidos en la columna de la ficha. */
export const MangaCommunityLinks = () => (
  <nav aria-label="Comunidad de MangaMukai" className="manga-community-links">
    <a href={SOCIAL_LINKS.telegram} target="_blank" rel="noopener noreferrer" className="manga-community-telegram">
      <span><strong>TELEGRAM</strong><span>Alertas &amp; Novedades</span></span><HomeTelegramIcon />
    </a>
    <a href={SOCIAL_LINKS.discord} target="_blank" rel="noopener noreferrer" className="manga-community-discord">
      <HomeDiscordIcon /><span><strong>Discord</strong><span>Únete a la Comunidad</span></span>
    </a>
  </nav>
);
