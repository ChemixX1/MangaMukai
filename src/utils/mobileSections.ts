/**
 * Páginas de "Recursos" (panel lateral de Más) que en móvil se abren a pantalla
 * completa: sin navbar, sin barra inferior, sin GlobalLoader, solo una flecha
 * de volver y el título de la sección.
 */
export const MOBILE_SECTIONS: Record<string, { title: string; dark: boolean }> = {
  '/nosotros': { title: 'Sobre nosotros', dark: false },
  '/contacto': { title: 'Contacto', dark: false },
  '/legal': { title: 'Términos y privacidad', dark: true },
};

export const isMobileSectionRoute = (pathname: string) => Object.prototype.hasOwnProperty.call(MOBILE_SECTIONS, pathname);
