import { lazy, Suspense, useEffect, useState } from 'react';
import { AlarmAlert, TimerModal } from '../modals';
import { NavbarM } from './NavbarM';
import { NavbarP } from './NavbarP';
import { useNavbarState } from './useNavbarState';

const SearchOverlay = lazy(() => import('./SearchOverlay').then(({ SearchOverlay }) => ({ default: SearchOverlay })));
const NotificationsOverlay = lazy(() => import('./NotificationsOverlay').then(({ NotificationsOverlay }) => ({ default: NotificationsOverlay })));
const CartOverlay = lazy(() => import('./CartOverlay').then(({ CartOverlay }) => ({ default: CartOverlay })));

export function Navbar() {
  const model = useNavbarState();
  const [searchMounted, setSearchMounted] = useState(false);
  const [notificationsMounted, setNotificationsMounted] = useState(false);
  useEffect(() => { if (model.isSearchOpen) setSearchMounted(true); }, [model.isSearchOpen]);
  useEffect(() => { if (model.isNotificationsOpen) setNotificationsMounted(true); }, [model.isNotificationsOpen]);
  const { isLightMode, isMobile, isStoreMode, isMessagesRoute, isSearchOpen, closeSearchOverlay, isNotificationsOpen, closeNotificationsOverlay, isCartOpen, closeCartOverlay, isTimerModalOpen, setIsTimerModalOpen, isAlarmAlertOpen, setIsAlarmAlertOpen, timeLeft, isTimerActive, startTimer, stopTimer } = model;
  return (
    <>
      {!isMessagesRoute && (isMobile ? <NavbarM model={model} /> : <NavbarP model={model} />)}

      <Suspense fallback={null}>
        {(isSearchOpen || searchMounted) && <SearchOverlay open={isSearchOpen} isLight={isLightMode} onClose={closeSearchOverlay} />}
      </Suspense>
      <Suspense fallback={null}>
        {(isNotificationsOpen || notificationsMounted) && <NotificationsOverlay desktop={!isMobile} open={isNotificationsOpen} isLight={isLightMode} onClose={closeNotificationsOverlay} />}
      </Suspense>
      <Suspense fallback={null}>
        {(isStoreMode || isCartOpen) && <CartOverlay open={isCartOpen} isLight={isLightMode} onClose={closeCartOverlay} />}
      </Suspense>

      <TimerModal
        isOpen={isTimerModalOpen}
        onClose={() => setIsTimerModalOpen(false)}
        onStartTimer={startTimer}
        onStopTimer={stopTimer}
        activeTimer={timeLeft}
        isActive={isTimerActive}
      />
      <AlarmAlert isOpen={isAlarmAlertOpen} onClose={() => setIsAlarmAlertOpen(false)} />
    </>
  );
}
