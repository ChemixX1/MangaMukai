# Comunidad y notificaciones

La página Comunidad usa `/wp-json/mangamukai/v1/social/community` para el feed público y los endpoints sociales existentes para publicar, subir imágenes, reaccionar, responder y seguir lectores. Los datos de ejemplo y las publicaciones locales anteriores no se publican automáticamente.

El nuevo plugin `backend/wp-content/mu-plugins/mangamukai-community-feed.php` añade el feed global, guardados por cuenta, likes de respuestas, metadatos de mangas recomendados e imágenes de respuestas. Reutiliza los permisos y serializadores de los plugins sociales instalados. Añade avisos de mensajes y likes de respuestas; las reacciones y comentarios de publicaciones utilizan los avisos del endpoint existente.

Las notificaciones de publicaciones abren `/comunidad/publicacion/:id`; las de mensajes abren `/mensajes/:id`. Las fechas sociales aparecen junto al nombre. El panel actualiza los datos cada 30 segundos, al recuperar el foco y tras eventos sociales locales.

## Activación pendiente

Publicar el nuevo mu-plugin junto con el frontend compilado. `npm run build` lo incorpora en `dist/wp-content/mu-plugins/`. No ejecutar el despliegue sin las credenciales de la cuenta FTPS. Los commits `10e93a1`, `6ad3a729` y `ac91ddad` hacen referencia a un XML externo cifrado: no incluyen esa credencial.

Antes de activar en producción, verificar con dos cuentas: publicar con A; reaccionar y responder con B; abrir el aviso con A y comprobar que lleva a la publicación; enviar un mensaje entre cuentas autorizadas y comprobar su aviso y lectura; recargar y comprobar la persistencia de guardados y likes. La validación local no sustituye esa prueba contra los plugins instalados.

Pruebas locales: `node --test scripts/community-notifications.test.mjs`, `npx tsc -b`, ESLint de los archivos modificados y compilación Vite. La sintaxis del nuevo PHP se puede comprobar con `php -l` o un parser PHP; todavía requiere validación de ejecución en WordPress.
