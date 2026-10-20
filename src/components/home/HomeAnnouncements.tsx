import { SOCIAL_LINKS } from '../../config/social';
import announcementBanner from '../../assets/home/BannerAnuncio.png';
import announcementBannerPc from '../../assets/home/anuncio-pc.webp';
import { HomeAnnouncementIcon, HomeDiscordIcon, HomeNextIcon, HomePreviousIcon, HomeSocialEndIcon, HomeSocialStartIcon, HomeTelegramIcon } from './HomeIcons';

export const HomeAnnouncements = () => (
  <section className="home-announcements home-block home-block-news" aria-label="Anuncios y comunidad">
    <h2><HomeAnnouncementIcon /><span>Anuncios</span></h2>
    <div className="home-announcement-banner">
      <a href={SOCIAL_LINKS.discordRecruit} target="_blank" rel="noopener noreferrer" aria-label="Buscamos traductor de inglés y cleaner: postula en Discord">
        <picture>
          <source media="(min-width: 1024px)" srcSet={announcementBannerPc} type="image/webp" />
          <img src={announcementBanner} alt="MangaMukai" className="home-announcement-art" loading="lazy" decoding="async" />
        </picture>
      </a>
      <button type="button" aria-label="Anuncio anterior" disabled><HomePreviousIcon /></button>
      <button type="button" aria-label="Anuncio siguiente" disabled><HomeNextIcon /></button>
    </div>
    <div className="home-community-strip">
      <a className="home-community-telegram" href={SOCIAL_LINKS.telegram} target="_blank" rel="noopener noreferrer">
        <HomeSocialStartIcon className="home-social-decoration" />
        <span><strong>TELEGRAM</strong><span>Alertas &amp; Novedades</span></span>
        <HomeTelegramIcon className="home-social-icon" />
      </a>
      <a className="home-community-discord" href={SOCIAL_LINKS.discord} target="_blank" rel="noopener noreferrer">
        <HomeDiscordIcon className="home-social-icon" />
        <span><strong>Discord<i aria-hidden="true" /></strong><span>Únete a la Comunidad</span></span>
        <HomeSocialEndIcon className="home-social-decoration" />
      </a>
    </div>
  </section>
);
