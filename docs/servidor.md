# Servidor y despliegue

El frontend se publica junto a una instalación de WordPress. Este repositorio
no contiene una copia completa de WordPress, de su base de datos ni de todos
los complementos instalados en producción.

## Archivos publicados

`npm run build` genera el frontend en `dist` y copia el contenido de `server`
y `backend` en esa carpeta.

| Origen | Destino |
| --- | --- |
| `dist/index.html` y `dist/assets` | Aplicación y recursos compilados |
| `public` | Imágenes, fuentes y recursos con dirección fija |
| `server/.htaccess` | Reglas de rutas, redirecciones y acceso |
| `server/backend-patches` | Metadatos, sitemaps y redirección de mangas |
| `server/wp-content/mu-plugins` | Complemento de imágenes para SEO |
| `backend/wp-content/mu-plugins` | Comunidad, recibos y retención de notificaciones |

La configuración de la conexión se consulta desde `scripts/deploy-ftps.ps1`.
No guardes contraseñas ni claves en el repositorio.

## Publicación

`npm run deploy:dry` permite revisar qué se publicaría. `npm run deploy` compila
y sube los archivos por FTPS. La limpieza de recursos antiguos del despliegue
se limita a los bundles de `assets`; no debe borrar imágenes subidas por los
usuarios, datos de WordPress ni complementos ajenos a este repositorio.

Los directorios `dist` y `dist-pages` se pueden regenerar. No contienen una
versión alternativa que deba mantenerse a mano.

## Servicios que se conservan

WordPress proporciona autenticación, catálogo, capítulos, lecturas, monedas,
suscripciones y funciones sociales. Una parte de esos servicios se administra
directamente en el servidor. Que no tengan una pantalla propia no significa
que estén sin uso.

Antes de retirar un complemento del servidor hay que comprobar sus rutas,
llamadas, tareas programadas y datos. La limpieza del frontend local no elimina
las tablas ni los archivos de una instalación remota.

## SEO

Las páginas públicas reciben un título y una descripción desde PHP antes de
cargar React. La navegación interna mantiene esos mismos metadatos. Las rutas
privadas y de pago no se indexan. Los detalles están en [SEO](seo.md).

Después de publicar, comprueba la portada, las colecciones, Comunidad, Character
Chat, una ficha de manga y sus capítulos. Verifica también el inicio de sesión,
las rutas de pago y los sitemaps con la configuración real del servidor.
