# Conexión con el servidor

Este repositorio contiene el frontend. WordPress, sus complementos, las reglas
del servidor y la base de datos se administran en el servidor remoto; no se
mantienen copias ni respaldos locales de esos archivos.

## Conexiones

- `src/config/api.ts` define la dirección de los servicios de WordPress.
- `vite.config.ts` conserva el proxy de `/wp-json` y la sesión de acceso social.
- `src/services` contiene los clientes de autenticación, catálogo, capítulos,
  monedas, pagos, comunidad y mensajería.
- `scripts/deploy-ftps.ps1` conserva la conexión de publicación FTPS. Las
  credenciales se leen desde el archivo externo configurado, sin guardarlas aquí.

## Comprobaciones locales

`npm run typecheck`, `npm run lint` y `npm test` permiten comprobar el frontend
sin generar `dist` ni respaldos. La tarea de compilación, cuando se ejecuta
expresamente para una publicación, empaqueta solo el frontend y sus recursos;
ya no copia archivos de WordPress.

## SEO

Los títulos de las rutas del frontend están en `src/config/seo-routes.json`.
La respuesta HTML inicial y los sitemaps del servidor se administran allí.
Los detalles del frontend están en [SEO](seo.md).
