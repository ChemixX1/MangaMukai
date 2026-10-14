import { Link } from 'react-router-dom';

import storeCover from '../../assets/community/store-cover.webp';
import { openSubscriptionModal } from '../../utils/subscriptionModal';
import { MukaiMusicPromo } from '../manga/MukaiMusicPromo';
import { CommunityIcon } from './CommunityIcons';
import '../../styles/community-promotions.css';

type CommunityPromotionProps = {
  className?: string;
};

export const CommunityProCard = ({ className = '' }: CommunityPromotionProps) => (
  <section className={`community-pro-card ${className}`} aria-label="Beneficios de MukaiPro">
    <MukaiMusicPromo onUnlock={openSubscriptionModal} />
  </section>
);

export const CommunityStoreCard = ({ className = '' }: CommunityPromotionProps) => (
  <Link to="/tienda" className={`community-store-card ${className}`}>
    <img className="community-store-card__image" src={storeCover} alt="" loading="lazy" decoding="async" />
    <CommunityIcon className="community-store-card__arrow" name="arrow" size={22} />
    <div className="community-store-card__copy">
      <h2 className="community-store-card__title">Tienda Mukai</h2>
      <p className="community-store-card__description">Descubre merch y colecciones de tus personajes favoritos</p>
    </div>
  </Link>
);
