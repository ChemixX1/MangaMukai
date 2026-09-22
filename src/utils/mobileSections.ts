/**
 * Páginas de "Recursos" (panel lateral de Más) que en móvil se abren a pantalla
 * completa: sin navbar y sin barra inferior, solo una flecha
 * de volver y el título de la sección.
 */
export const MOBILE_SECTIONS: Record<string, { title: string; dark: boolean }> = {
  '/nosotros': { title: 'Sobre nosotros', dark: false },
  '/contacto': { title: 'Contacto', dark: false },
  '/legal': { title: 'Términos y privacidad', dark: true },
  '/privacidad': { title: 'Política de privacidad', dark: false },
  '/terminos': { title: 'Términos de servicio', dark: false },
  '/normas-comunidad': { title: 'Normas de la comunidad', dark: false },
  '/cookies': { title: 'Política de cookies', dark: false },
};

export const isMobileSectionRoute = (pathname: string) => Object.prototype.hasOwnProperty.call(MOBILE_SECTIONS, pathname);
