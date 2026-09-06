import { lazy, Suspense, useEffect, useState } from 'react';

import { OPEN_SUBSCRIPTION_MODAL_EVENT } from '../../utils/subscriptionModal';

const SubscriptionModal = lazy(() =>
  import('./SubscriptionModal').then((module) => ({ default: module.SubscriptionModal })),
);

/** Única instancia del modal de suscripción para toda la aplicación. */
export const SubscriptionModalHost = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(OPEN_SUBSCRIPTION_MODAL_EVENT, open);
    return () => window.removeEventListener(OPEN_SUBSCRIPTION_MODAL_EVENT, open);
  }, []);

  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <SubscriptionModal isOpen onClose={() => setIsOpen(false)} />
    </Suspense>
  );
};
