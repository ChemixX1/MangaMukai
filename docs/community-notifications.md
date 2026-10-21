# Comunidad y notificaciones

La página Comunidad usa `/wp-json/mangamukai/v1/social/community` para el feed público y los endpoints sociales existentes para publicar, subir imágenes, reaccionar, responder y seguir lectores. Los datos de ejemplo y las publicaciones locales anteriores no se publican automáticamente.

Los plugins instalados en WordPress proporcionan el feed global, guardados por cuenta, likes de respuestas, metadatos de mangas recomendados e imágenes de respuestas. Sus archivos se administran directamente en el servidor; el frontend conserva las conexiones con sus endpoints.

Las notificaciones de publicaciones abren `/comunidad/publicacion/:id`; las de mensajes abren `/mensajes/:id`. Las fechas sociales aparecen junto al nombre. El panel actualiza los datos cada 30 segundos, al recuperar el foco y tras eventos sociales locales.

## Verificación

La publicación del frontend no incluye complementos ni copias del backend de WordPress.

Antes de activar en producción, verificar con dos cuentas: publicar con A; reaccionar y responder con B; abrir el aviso con A y comprobar que lleva a la publicación; enviar un mensaje entre cuentas autorizadas y comprobar su aviso y lectura; recargar y comprobar la persistencia de guardados y likes. La validación local no sustituye esa prueba contra los plugins instalados.

Pruebas locales sin generar `dist`: `node --test scripts/community-notifications.test.mjs`, `npm run typecheck` y ESLint de los archivos modificados.
