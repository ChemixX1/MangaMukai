import { lazy, Suspense } from 'react';
import electricCircle from '../../assets/subscription/electric-circle.svg';
import '../../styles/premium-electric-border.css';

const ElectricLogo = lazy(() => import('./ElectricLogo'));

/** Decorative overlay; the parent owns the avatar and premium eligibility. */
export function PremiumElectricBorder() {
  return <span className="premium-electric-border" aria-hidden="true">
    <Suspense fallback={null}>
      <ElectricLogo src={electricCircle} color="#ffd77a" glowColor="#F4A223" scale={0.78} strands={3} bend={0.25} crackle={0.6} arcs={0.3} speed={2.5} interactive={false} intensity={0.85} glow={0.5} thickness={1} flicker={0.3} fill={0} />
    </Suspense>
  </span>;
}
