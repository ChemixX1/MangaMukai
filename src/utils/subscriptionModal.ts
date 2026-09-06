export const OPEN_SUBSCRIPTION_MODAL_EVENT = 'mm_open_subscription_modal';

/**
 * Abre el modal de suscripción, que vive montado una sola vez en la app.
 * Cualquier punto de entrada (Mukai Music, banner VIP, menú de perfil) lo llama
 * desde aquí para que nunca haya dos modales apilados.
 */
export const openSubscriptionModal = () => {
  window.dispatchEvent(new Event(OPEN_SUBSCRIPTION_MODAL_EVENT));
};
