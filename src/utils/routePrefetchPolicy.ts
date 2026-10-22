// Only known, local routes can be warmed. Query strings never create new cache entries.
export function routeModuleKey(path: string): string | null {
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  if (/^\/manga\/[^/]+$/.test(pathname)) return '/manga/:id';
  if (/^\/read\/[^/]+$/.test(pathname)) return '/read/:id';
  if (/^\/auth\/(login|register)$/.test(pathname)) return '/auth';
  if (/^\/chat(?:\/[^/]+(?:\/conversacion)?)?$/.test(pathname)) return '/chat';
  if (/^\/comunidad\/publicacion\/[^/]+$/.test(pathname)) return '/comunidad';
  if (/^\/mensajes(?:\/[^/]+)?$/.test(pathname)) return '/mensajes';
  if (/^\/usuarios\/[^/]+\/publicacion\/[^/]+$/.test(pathname)) return '/usuarios/:id/publicacion/:postId';
  if (/^\/usuarios\/[^/]+$/.test(pathname)) return '/usuarios/:id';
  if (['/pro/pago', '/tienda/pago', '/recargar/pago'].includes(pathname)) return '/recargar';
  if (pathname === '/login') return '/auth';
  if (pathname === '/mas') return '/profile';
  if (['/privacidad', '/terminos', '/normas-comunidad', '/cookies'].includes(pathname)) return '/legal-document';
  return pathname;
}

export function idleRouteCandidates(pathname: string, constrained: boolean): string[] {
  // Keep speculation small and leave the reader's existing chapter prefetch in charge.
  const candidates = pathname === '/' ? ['/manga-bn', '/comunidad', '/chat', '/tienda']
    : ['/manga-bn', '/manga-19'].includes(pathname) ? ['/', '/comunidad', '/chat', '/tienda']
      : pathname === '/comunidad' ? ['/mensajes', '/chat', '/']
        : [];
  return candidates.slice(0, constrained ? 1 : 4);
}
