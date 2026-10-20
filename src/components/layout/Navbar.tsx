import { X } from 'lucide-react';
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
  const { isLightMode, currentUser, sessionNotice, setSessionNotice, isMobile, isStoreMode, isMessagesRoute, isSearchOpen, closeSearchOverlay, isNotificationsOpen, closeNotificationsOverlay, isCartOpen, closeCartOverlay, isTimerModalOpen, setIsTimerModalOpen, isAlarmAlertOpen, setIsAlarmAlertOpen, timeLeft, isTimerActive, startTimer, stopTimer, openAuthPage } = model;
  return (
    <>
      {!isMessagesRoute && (isMobile ? <NavbarM model={model} /> : <NavbarP model={model} />)}

      {sessionNotice && !currentUser && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto z-[130] flex max-w-sm items-center gap-3 rounded-xl border border-yellow-400/20 bg-[#0A0A0F] px-4 py-3 text-yellow-100 shadow-2xl">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-yellow-300">Sesion expirada</p>
            <p className="text-xs text-white/70">Ingresa otra vez para usar monedas, guardados y compras.</p>
          </div>
          <button
            onClick={() => openAuthPage('login')}
            className="shrink-0 rounded-lg bg-yellow-400 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black hover:bg-yellow-300"
          >
            Ingresar
          </button>
          <button
            onClick={() => setSessionNotice(false)}
            className="shrink-0 rounded-md p-1 text-white/40 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
