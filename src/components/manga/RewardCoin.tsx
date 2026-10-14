import coinImage from '../../assets/manga/reward-coin-3d.webp';

/** Moneda 3D con canto estriado y emblema facetado a juego con el cofre. */
export const RewardCoinIcon = ({ className = 'manga-reward-coin-icon' }: { className?: string }) => (
  <img className={className} src={coinImage} width="192" height="175" alt="" aria-hidden="true" draggable={false} />
);
