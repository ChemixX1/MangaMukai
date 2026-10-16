import PulseHeart from '../common/PulseHeart';
import { useTheme } from '../../hooks/useTheme';

type MangaSeriesLikeButtonProps = {
  liked: boolean;
  likes: number;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
};

export const MangaSeriesLikeButton = ({ liked, likes, disabled, onClick }: MangaSeriesLikeButtonProps) => {
  const { theme } = useTheme();
  return (
    <div className="manga-series-reaction">
      <PulseHeart
        liked={liked}
        count={likes}
        onChange={onClick}
        disabled={disabled}
        showCount
        hideCountWhenIdle
        interruptible
        icon="heart"
        idleOutline
        size={26}
        corner={32}
        likedColor="var(--detail-magenta, #ff008c)"
        idleColor={theme === 'light' ? '#66666c' : '#b5b5bd'}
        pillColor={theme === 'light' ? '#dedee2' : '#323236'}
        textColor={theme === 'light' ? '#161616' : '#f5f5f5'}
        duration={560}
        dotSize={0.3}
        overshoot={1.7}
        beat={3}
        rollDuration={350}
        label={liked ? 'Quitar Me gusta de la serie' : 'Me gusta esta serie'}
      />
    </div>
  );
};
