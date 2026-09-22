import { NotificationsPage } from '../../pages/NotificationsPage';
import { SlidePanel } from './SlidePanel';

/** Campana del navbar (móvil): las notificaciones entran deslizándose hacia la derecha, sin cambiar de ruta. */
export const NotificationsOverlay = ({ open, isLight, onClose }: { open: boolean; isLight: boolean; onClose: () => void }) => (
  <SlidePanel open={open} from="left" isLight={isLight} label="Notificaciones" onClose={onClose}>
    <NotificationsPage embedded onClose={onClose} />
  </SlidePanel>
);
