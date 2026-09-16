# Servidor de producción (public_html)

Inventario de lo que vive en `public_html` de BanaHosting, de dónde sale cada
cosa y qué reglas seguir para no volver a acumular restos. Actualizado tras la
limpieza del 2026-09-06.

## Cómo llega el código al servidor

`npm run deploy` compila (`npm run build`) y sube `dist/` por FTPS a la raíz de
`public_html`. El build fusiona esta carpeta `server/` dentro de `dist/`, así que
lo que hay aquí se publica tal cual:

| En el repo                                   | En el servidor                                   |
| -------------------------------------------- | ------------------------------------------------ |
| `dist/index.html`, `dist/assets/*`           | `/index.html`, `/assets/*` (shell React + bundles) |
| `public/favicon.svg`                         | `/favicon.svg`                                   |
| `server/.htaccess`                           | `/.htaccess` (rutas React, OAuth, bloqueos)      |
| `server/backend-patches/*.php`               | `/backend-patches/*.php` (SEO head, sitemaps, redirecciones) |
| `server/wp-content/mu-plugins/*.php`         | `/wp-content/mu-plugins/*.php`                   |
| `server/wp-content/plugins/manga-wordpress-storage-fix/` | `/wp-content/plugins/manga-wordpress-storage-fix/` |
| `server/wp-content/plugins/manga-auth-legacy-fix/` | `/wp-content/plugins/manga-auth-legacy-fix/` (desde 2026-09-06; sobrescribe `/login`, `/register`, `/me`, `/coins`, `/chapters/*` con prioridad 99) |
| `server/wp-content/plugins/manga-paypal-payments/` | `/wp-content/plugins/manga-paypal-payments/` (desde 2026-09-06; monedas y suscripción por PayPal, y **es quien responde `/me`** con prioridad 100) |

El deploy **sobrescribe y añade**; desde el 2026-09-15, tras subir, además
**borra de `/assets/` todo bundle que no exista en el `dist/` recién subido**
(solo esa carpeta; nunca `wp-content`, `images`, etc.). Las pestañas abiertas
con un bundle viejo recargan sola la página al fallar el import. Opciones:
`-NoPrune` (no borrar), `-PruneOnly` (solo limpiar, sin compilar ni subir) y
`-DryRun` (listar lo que se subiría/borraría).

## Lo que solo existe en el servidor

No está versionado aquí. Antes de tocarlo, descargarlo por FTPS.

- **mu-plugins propios sin copia en el repo**: `manga-subscription.php`,
  `manga-views-tracker.php`, `manga-comments-api.php`, `manga-country-block.php`,
  `manga-rest-cover.php`.
- ~~Plugins `manga-auth-legacy-fix` y `manga-paypal-payments`~~: desde el
  2026-09-06 están en el repo (`server/wp-content/plugins/`). Cadena real de
  `rest_api_init`: `manga-auth-api.php` (prioridad 10) → `manga-auth-legacy-fix`
  (99, `override`: `/login`, `/register`, `/me`, `/coins`, `/chapters/*`) →
  `manga-paypal-payments` (100, `override`: `/me`, `/buy-coins`, suscripción).
  Por tanto **`/login` y `/register` los responde el legacy y `/me` lo responde
  el de PayPal** (comprobado por los textos de error en producción). Ambos
  devolvían `username = user_login` y avatar de Gravatar, y cada refresco de
  sesión del navbar pisaba el nombre y la foto editados en `/perfil`; ahora
  devuelven `display_name` y el avatar propio (`mm_profile_avatar_url`), y el
  cliente además prefiere `display_name`.
- **Plugin `manga-popular-refresh-fix`** (`wp-content/plugins/`).
- **WordPress y sus plugins** (Ultimate Member + Social Login, Elementor,
  myCRED, W3 Total Cache, AIOSEO, wpDiscuz, Forminator, WP Telegram, Site Kit,
  MonsterInsights, OptinMonster, mukai-license-server…). Se gestionan desde
  wp-admin, no por FTP.
- **Tema activo**: `wp-content/themes/mangareader` (Themesia). Solo lo ve el
  usuario en las páginas de Ultimate Member que WordPress renderiza durante el
  OAuth. Se conserva `twentytwentyfive` como tema de respaldo de WordPress.
  Su núcleo (`inc/core.php`) está cifrado con ionCube, así que no se puede
  parchear: cuando se crea un capítulo desde una serie, su
  `assets/js/autopick-manga.js` marca la categoría de la serie en el editor y
  muestra `Cannot auto select post category` si la casilla no existe. El
  mu-plugin `mangamukai-chapter-category-fix.php` (repo) intercepta ese aviso,
  localiza o crea la categoría de la serie (`/mangamukai/v1/admin/chapter-category`)
  y la deja marcada.
- `wp-content/uploads/` (portadas, avatares, `mm-generated-covers`).
- `mukai-updates/` (instalador que distribuye `mukai-license-server`),
  `.well-known/` (ACME), `llms.txt`, `ads.txt`, `robots.txt`, `litespeed.conf`,
  `.private/`.
- `wp-config.php` (secretos; nunca descargar a un sitio compartido).

## Social: seguidores, lecturas y presencia

`mangamukai-friends.php` (v4.0.0, 2026-09-15) sustituyó las amistades por
**seguir** (unidireccional). Tablas nuevas, creadas por `dbDelta` en `init`
cuando cambia `mm_social_db_version`:

- `wp_mm_follows` (`follower_id`, `following_id`, `created_at`). Las amistades
  previas de `wp_mm_friendships` se migraron con `INSERT IGNORE` (aceptada =
  mutuo, pendiente = quien la envió sigue al otro); la tabla vieja y sus rutas
  `/friends/*` siguen existiendo pero el cliente ya no las usa.
- `wp_mm_manga_reads` (`user_id`, `manga_id`, `chapters`, `last_chapter_id`,
  fechas). El lector hace `POST /social/reads` al abrir un capítulo con sesión;
  "Mangas leídos" del perfil es el número de filas del usuario.
- Presencia: `user_meta.mm_last_active` (epoch) se actualiza como mucho una vez
  por minuto en cada petición social autenticada; `is_online` = activo en los
  últimos 3 min (`MM_SOCIAL_ONLINE_MINUTES`). El chat lo muestra como
  "Conectado / No conectado".

**Pendiente de desplegar (2026-09-15, solo en local por ahora)**: v4.1.0 añade
notificaciones `chapter_new` (a los suscriptores de la serie cuando un capítulo
—`post` con meta `ero_seri`— queda publicado; se marca `_mm_chapter_notified`
en el capítulo y se dispara en `save_post` o al escribirse `ero_seri`),
`manga_new` (a todos los usuarios cuando se publica un CPT `manga`, una fila
por usuario en un solo `INSERT … SELECT`; meta `_mm_manga_notified`; los avisos
masivos de más de 60 días se borran) y, en
`mangamukai-community-interactions.php`, `post_reaction`, `post_comment` y
`post_share` para el dueño de la publicación. También se corrigió `manga_update`,
cuya `dedupe_key` era la misma para todos los suscriptores (solo llegaba a uno).
El cliente pinta estos tipos como tarjetas en `/notificaciones`
(`src/components/social/NotificationCard.tsx`).

Rutas nuevas: `POST /social/follow`, `DELETE /social/follow/{id}`,
`GET /social/follows[?user_id]` (público), `POST /social/reads`,
`GET /social/users/search?q=` (cualquier lector, para iniciar un chat).
`/social/profile/{id}` devuelve `follow_status`, `follows_you`,
`followers_count`, `following_count`, `mangas_read_count`, `is_online`.
El chat (`/social/messages*`) **ya no exige amistad**: cualquier usuario con
sesión puede escribir a otro.

## Moderación de mensajes privados

`mangamukai-moderation-api.php` (mu-plugin del repo) expone
`/wp-json/mangamukai/v1/moderation/*` (overview, messages, conversations,
conversations/{a}/{b}, users) en **solo lectura**. Autoriza con la cabecera
`X-MM-Moderation-Key`, que debe coincidir con la constante `MM_MODERATION_KEY`
definida en `wp-content/mu-plugins/mangamukai-moderation-key.php`. Ese archivo
**no está en git**: lo genera la herramienta local en `server/wp-content/mu-plugins/`
y se publica con `npm run deploy` como cualquier otro PHP de `server/`. Si la
clave se filtra, se borra el archivo, se vuelve a ejecutar la herramienta y se
despliega. Lo consume `tools/moderacion-mensajes` (`npm run moderacion`), que
corre en el equipo local y no se despliega. Detalles y avisos de privacidad en
`tools/moderacion-mensajes/README.md`.

## Reglas

1. **Nada de `.bak`, `.save`, `.before-*` ni zips en el servidor.** Las
   versiones anteriores están en Git; si hace falta comparar, se descarga a una
   carpeta local fuera del repo.
2. **Nada de código fuente ni dependencias en `public_html`** (`src/`,
   `node_modules/`, `dist/` anidado, `.env`, `package.json`). Solo se sube el
   resultado del build.
3. **Logs**: PHP escribe `error_log` en la raíz y en `backend-patches/`; no son
   públicos (`.htaccess` devuelve 403 a `*.log`, `error_log`, `*.bak*`,
   `*.before-*`, `src/`, `node_modules/`). Ningún mu-plugin debe volver a
   escribir logs propios en carpetas servidas (el antiguo
   `mu-plugins/debug_auth.log` expuso tokens de sesión).
4. **Scripts de mantenimiento de un solo uso** (tipo `manga-gender-tags.php`)
   se ejecutan y se borran el mismo día.

## Inspeccionar el servidor sin SSH

Con la misma credencial FTPS del deploy (`~/.ssh/mangamukai-deploy-ftps.xml`),
curl fija la IP del servidor sin perder la validación TLS:

```bash
curl -s --ssl-reqd --resolve lake-9070.banahosting.com:21:50.31.188.151 -u "deploy@mangamukai.com" --list-only "ftp://lake-9070.banahosting.com/wp-content/mu-plugins/"
```

Para árboles grandes (listar, copiar o borrar recursivamente) conviene una
conexión persistente; en la sesión de limpieza se usó `basic-ftp` desde Node.

## Limpieza del 2026-09-06

Copia local previa de todo lo borrado (salvo `node_modules`, los logs grandes y
los temas por defecto de WordPress, que se descargan de wordpress.org) en
`C:\Proyectos\MangaMukai-server-limpieza-20260906\` (135 MB), con manifiestos
`_manifest-backup.txt`, `_manifest-delete.txt` y `_assets-borrados.txt`.

La portada por defecto de los metadatos sociales vivía como bundle con hash
(`/assets/imagen1-C8Sivx-G.webp`, sin fuente en el repo). Se recuperó del
servidor a `public/og-default.webp` y `manga-social-meta.php` apunta ahí; el
bundle antiguo se conserva en el servidor hasta la próxima limpieza.

Eliminado (51 archivos y 9 carpetas en la primera fase, más 139 bundles y
`node_modules`):

- Raíz: `src/`, `node_modules/`, `dist/` (build de mayo), `public/`, `.vscode/`,
  `.env`, `.gitignore`, `vite.svg`, `default.php` (página por defecto de
  Hostinger), 10 variantes de `.htaccess.*`, 4 zips `mangamukai-*.zip`,
  `error_log`.
- `backend-patches/`: copias duplicadas y antiguas de mu-plugins
  (`manga-auth-api.php`, `manga-subscription.php`, `manga-views-tracker.php`,
  `manga-comments-api.php`, `manga-country-block.php`, `manga-rest-cover.php`)
  con sus `.bak`, el script de un solo uso `manga-gender-tags.php` y
  `error_log`.
- `wp-content/mu-plugins/`: 15 copias `.bak-*` / `.before-*` y
  `debug_auth.log` (89 MB).
- `wp-content/plugins/manga-popular-refresh-fix/*.bak-*`,
  `wp-content/themes/mangareader/functions.php.save`, `wp-content/debug.log`,
  `wp-content/uploads/content-control-debug-*.log`.
- Temas inactivos: `dramastream` (web antigua de series) y
  `twentytwentyone`…`twentytwentyfour`.
- 139 bundles antiguos en `/assets/` anteriores al 5 de septiembre (se
  conservaron los 94 de los deploys del 5 y 6 de septiembre para las pestañas
  abiertas; se pueden borrar en la próxima limpieza).

Pendiente de decidir en wp-admin (plugins instalados sin uso aparente):
WooCommerce y sus placeholders en `uploads/`, Simple Membership,
`manga-paypal-payments`, Disqus (se usa wpDiscuz), LiteSpeed Cache (se usa
W3 Total Cache), Coming Soon, All-in-One WP Migration, Classic Editor,
Hello Dolly, los tres plugins de Hostinger (el hosting es BanaHosting),
Meta Box, User Role Editor y Essential Addons for Elementor.
