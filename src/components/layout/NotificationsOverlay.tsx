import { NotificationsPage } from '../../pages/NotificationsPage';
import { SlidePanel } from './SlidePanel';

export const NotificationsOverlay = ({ open, isLight, onClose, desktop = false }: { open: boolean; isLight: boolean; onClose: () => void; desktop?: boolean }) => (
  <SlidePanel open={open} from={desktop ? 'right' : 'left'} size={desktop ? 'compact' : 'full'} blurBackdrop={desktop} animateOnOpen={desktop} isLight={isLight} label="Notificaciones" onClose={onClose}>
    <NotificationsPage embedded onClose={onClose} />
  </SlidePanel>
);
