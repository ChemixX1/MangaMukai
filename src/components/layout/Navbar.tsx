import { X } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { AlarmAlert, TimerModal } from '../modals';
import { NotificationsPanel } from '../social';
import { NavbarM } from './NavbarM';
import { NavbarP } from './NavbarP';
import { useNavbarState } from './useNavbarState';
export { OPEN_TIMER_EVENT } from './useNavbarState';
const SearchOverlay = lazy(() => import('./SearchOverlay').then(({ SearchOverlay }) => ({ default: SearchOverlay })));
const NotificationsOverlay = lazy(() => import('./NotificationsOverlay').then(({ NotificationsOverlay }) => ({ default: NotificationsOverlay })));
const CartOverlay = lazy(() => import('./CartOverlay').then(({ CartOverlay }) => ({ default: CartOverlay })));

export function Navbar() {
  const model = useNavbarState();
  const { isLightMode, currentUser, sessionNotice, setSessionNotice, showNotifications, setShowNotifications, setUnreadNotifications, isMobile, isStoreMode, isMessagesRoute, isSearchOpen, closeSearchOverlay, isNotificationsOpen, closeNotificationsOverlay, isCartOpen, closeCartOverlay, isTimerModalOpen, setIsTimerModalOpen, isAlarmAlertOpen, setIsAlarmAlertOpen, timeLeft, isTimerActive, startTimer, stopTimer, openAuthPage } = model;
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

      <NotificationsPanel isOpen={showNotifications} isLight={isLightMode} onClose={() => setShowNotifications(false)} onUnreadChange={setUnreadNotifications} />

      <Suspense fallback={null}>
        <SearchOverlay open={isSearchOpen} isLight={isLightMode} onClose={closeSearchOverlay} />
        <NotificationsOverlay open={isNotificationsOpen} isLight={isLightMode} onClose={closeNotificationsOverlay} />
        {/* Sigue montado mientras esté abierto al salir de la Tienda, para que el panel se cierre solo con la ruta. */}
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