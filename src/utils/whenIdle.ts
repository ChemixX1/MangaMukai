/**
 * Ejecuta trabajo secundario cuando el navegador queda libre, para que no compita
 * por ancho de banda con las portadas y los listados que el usuario está esperando.
 * Devuelve la función que cancela la tarea si el componente se desmonta antes.
 */
export const whenIdle = (task: () => void, timeout = 2000): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(handle);
  }

  // Safari antiguo no trae `requestIdleCallback`: un respiro corto ya basta para
  // que el trabajo secundario no salga a la vez que el contenido principal.
  const handle = globalThis.setTimeout(task, 200);
  return () => globalThis.clearTimeout(handle);
};
