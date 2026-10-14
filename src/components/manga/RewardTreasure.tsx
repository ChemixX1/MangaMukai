import type { CSSProperties } from 'react';
import '../../styles/reward-treasure.css';

const LID_PANELS = Array.from({ length: 9 }, (_, index) => {
  const angle = (index - 4) * 20;
  const radians = angle * Math.PI / 180;

  return {
    '--panel-y': `${-19 * Math.cos(radians)}cqw`,
    '--panel-z': `${19 * Math.sin(radians)}cqw`,
    '--panel-angle': `${90 - angle}deg`,
    '--panel-wood': `hsl(28 58% ${26 + Math.cos(radians) * 16}%)`,
  } as CSSProperties;
});

const COINS = Array.from({ length: 35 }, (_, index) => {
  const column = index % 7;
  const row = Math.floor(index / 7);

  return {
    '--money-x': `${5 + column * 7.1 + (row % 2) * 1.2}cqw`,
    '--money-y': `${-1.5 + Math.abs(column - 3) * .65 + Math.abs(row - 2) * .4}cqw`,
    '--money-z': `${-13 + row * 6.3}cqw`,
    '--money-tilt': `${70 + (index % 4) * 5}deg`,
    '--money-turn': `${index * 37}deg`,
  } as CSSProperties;
});

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

/** A dimensional chest: the curved lid rotates around the back edge of its body. */
export const RewardTreasure = ({ coupon = true, open = false, cycling = false }: { coupon?: boolean; open?: boolean; cycling?: boolean }) => (
  <span className={`manga-reward-treasure${open ? ' is-open' : ''}${cycling ? ' is-cycling' : ''}`} aria-hidden="true">
    <span className="reward-chest-shadow" />
    <span className="reward-chest-aura" />
    <span className="reward-chest-scene">
      <span className="reward-chest-body">
        <span className="reward-chest-face reward-chest-back" />
        <span className="reward-chest-face reward-chest-left" />
        <span className="reward-chest-face reward-chest-right">
          <span className="reward-chest-side-emblem" />
          {CORNERS.map(corner => <span key={corner} className={`reward-chest-corner reward-chest-corner-${corner}`} />)}
        </span>
        <span className="reward-chest-face reward-chest-bottom" />
        <span className="reward-chest-floor" />
        <span className="reward-chest-hoard" />
        {COINS.map((style, index) => <span key={index} className="reward-chest-money" style={style}><span /></span>)}
        <span className="reward-chest-rim" />
        <span className="reward-chest-face reward-chest-front">
          {CORNERS.map(corner => <span key={corner} className={`reward-chest-corner reward-chest-corner-${corner}`} />)}
          <span className="reward-chest-front-emblem" />
          <span className="reward-chest-lock"><span /></span>
        </span>
      </span>
      <span className="reward-chest-lid">
        <span className="reward-chest-lid-inner" />
        <span className="reward-chest-lid-side reward-chest-lid-left" />
        <span className="reward-chest-lid-side reward-chest-lid-right" />
        {LID_PANELS.map((style, index) => <span key={index} className="reward-chest-lid-panel" style={style} />)}
        <span className="reward-chest-lid-edge" />
        <span className="reward-chest-latch" />
      </span>
    </span>
    <span className="reward-chest-spark reward-chest-spark-one" />
    <span className="reward-chest-spark reward-chest-spark-two" />
    {coupon && <span className="reward-chest-coupon">−50%</span>}
  </span>
);
