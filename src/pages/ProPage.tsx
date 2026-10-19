import bonusCoins from '../assets/recharge/icon-2.svg';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSubscriptionBackground } from '../utils/subscriptionBackground';
import { GooeySelector } from '../components/ui/GooeySelector';
import { PLANS } from '../data/subscriptionPlans';
import { getStoredUser } from '../services/authService';
import readingIcon from '../assets/subscription/reading.svg';
import communityIcon from '../assets/subscription/community.svg';
import basicProfileIcon from '../assets/subscription/basic-profile.svg';
import musicIcon from '../assets/subscription/music.svg';
import collectionsIcon from '../assets/subscription/collections.svg';
import discountIcon from '../assets/subscription/discount.svg';
import premiumProfileIcon from '../assets/subscription/premium-profile.svg';
import '../styles/pro.css';


const GradientASCII = lazy(loadSubscriptionBackground);

export function preloadProAssets() {
  [bonusCoins, readingIcon, communityIcon, basicProfileIcon, musicIcon, collectionsIcon, discountIcon, premiumProfileIcon].forEach(src => {
    const image = new Image();
    image.src = src;
  });
}

interface PlanFeature {
  icon: ReactNode;
  text: string;
}

interface PricingTier {
  id: 'free' | 'monthly' | 'yearly';
  name: string;
  monthlyPrice: string;
  periodLabel?: string;
  variant: 'free' | 'standard' | 'pro';
  ctaLabel: string;
  features: PlanFeature[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 'Gratis',
    variant: 'free',
    ctaLabel: 'Comenzar',
    features: [
      {
        icon: <img src={readingIcon} alt="" />,
        text: 'Lectura de capítulos gratuitos del catálogo',
      },
      {
        icon: <img src={communityIcon} alt="" />,
        text: 'Participación en comentarios y comunidad',
      },
      {
        icon: <img src={basicProfileIcon} alt="" />,
        text: 'Apariencia de perfil básica de lector',
      },
    ],
  },
  {
    id: 'monthly',
    name: 'Pro',
    monthlyPrice: PLANS.monthly.monthlyPrice,
    periodLabel: '/m',
    variant: 'standard',
    ctaLabel: 'Elegir Plan',
    features: [
      {
        icon: <img src={musicIcon} alt="" />,
        text: 'Mukai Music: disfruta música mientras lees',
      },
      {
        icon: <img src={collectionsIcon} alt="" />,
        text: 'Portadas y acceso a colecciones de temporada',
      },
      {
        icon: <img src={discountIcon} alt="" />,
        text: 'Descuentos en capítulos exclusivos (hasta 20%)',
      },
      {
        icon: <span className="pro-premium-icon">
          <img src={premiumProfileIcon} alt="" />
          <span className="pro-premium-icon__electric" aria-hidden="true" />
        </span>,
        text: 'Apariencia de perfil premium',
      },
    ],
  },
  {
    id: 'yearly',
    name: 'Pro anual',
    monthlyPrice: PLANS.yearly.monthlyPrice,
    periodLabel: '/m',
    variant: 'pro',
    ctaLabel: 'Elegir Plan',
    features: [
      {
        icon: <img src={bonusCoins} alt="" />,
        text: PLANS.yearly.savingsNote!,
      },
    ],
  },
];

// Ambos ciclos incluyen los mismos beneficios; el anual añade la bonificación de monedas.
PRICING_TIERS[2].features = [...PRICING_TIERS[1].features, ...PRICING_TIERS[2].features];

export default function ProPage() {
  const navigate = useNavigate();
  const [mobileCycle, setMobileCycle] = useState<'monthly' | 'yearly'>('monthly');
  const currentUser = getStoredUser();
  const isUserPremium = Boolean(currentUser?.isPremium || currentUser?.is_premium);

  const handleSelectTier = (tier: PricingTier) => {
    navigate(tier.id === 'free' ? '/' : `/pro/pago?plan=${tier.id}&metodo=yape`);
  };

  return (
    <main className="pro-page" aria-label="Suscripción Mukai">
      <div className="pro-gradient-background" aria-hidden="true">
        <div className="pro-gradient-canvas">
          <Suspense fallback={null}>
          <GradientASCII
            colors={["#1e3fd8", "#527cdb", "#60a5fa", "#38bdf8"]}
            shape="horizon"
            characters=" =+xX0S8#@"
            cellSize={18}
            density={0}
            glyphOpacity={0.54}
            glow={0.2}
            depthOfField={0}
            flicker={0.2}
            softness={0.47}
            scale={1.05}
            flow={0.5}
            speed={1}
            gradientOpacity={0.9}
            grain={0.08}
            variation={0}
            mouseInteraction
            scrambleRadius={0.1}
            clickEffect="wave"
            intro
            lightMode={false}
          />
          </Suspense>
        </div>
      </div>
      <div className="pro-shell is-ready">
        {/* Marca de agua tipográfica gigante detrás de las tarjetas */}
        <div className="pro-stage">
          <span className="pro-backdrop-word" aria-hidden="true">
            Mukai Pro
          </span>

          <div className="pro-cycle-selector" role="group" aria-label="Periodo de suscripción">
            <GooeySelector activeIndex={mobileCycle === 'monthly' ? 0 : 1} itemCount={2} color="#ffffff" labelColor="#cbd5e1" activeLabelColor="#111111" cornerRadius={0} />
            <button type="button" aria-pressed={mobileCycle === 'monthly'} onClick={() => setMobileCycle('monthly')}>Mensual</button>
            <button type="button" aria-pressed={mobileCycle === 'yearly'} onClick={() => setMobileCycle('yearly')}>Anual <span>−20%</span></button>
          </div>

          <section className="pro-grid" aria-label="Planes de Suscripción Mukai">
            {PRICING_TIERS.map((tier) => {
              const price = tier.monthlyPrice;
              const isCurrentPro = tier.id !== 'free' && isUserPremium;

              return (
                <article
                  key={tier.id}
                  className={`pro-card pro-card--${tier.variant}${isCurrentPro ? '' : ' pro-card--selectable'}${tier.id === mobileCycle ? ' pro-card--mobile-visible' : ''}`}
                  aria-label={`Plan ${tier.name}`}
                  onClick={() => { if (!isCurrentPro) handleSelectTier(tier); }}
                >
                  <div className="pro-card__top">
                    <div className="pro-card__tier-row">
                      <h2 className={`pro-card__tier${tier.id === 'yearly' ? ' pro-card__tier--annual' : ''}`}>{tier.name}</h2>
                      {tier.id === 'yearly' && (
                        <span className="pro-card__badge">{PLANS.yearly.badge}</span>
                      )}
                    </div>

                    <div className="pro-card__price-row">
                      <span className="pro-card__price">{price}</span>
                      {tier.periodLabel && (
                        <span className="pro-card__period">{tier.periodLabel}</span>
                      )}
                    </div>
                  </div>

                  <ul className="pro-card__features" aria-label={`Beneficios del plan ${tier.name}`}>
                    {tier.features.map(({ icon, text }) => (
                      <li key={text} className="pro-card__feature">
                        <span className="pro-card__feature-icon" aria-hidden="true">
                          {icon}
                        </span>
                        <span className="pro-card__feature-text">{text}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pro-card__footer">
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); handleSelectTier(tier); }}
                      disabled={isCurrentPro}
                      className="pro-card__cta"
                    >
                      <span>{isCurrentPro ? 'Plan Activo' : tier.ctaLabel}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </section>


        </div>
      </div>
    </main>
  );
}

