# Apariencia en buscadores

La portada presenta Tendencia Ahora y Mangas Juveniles. Sus enlaces llevan a
las tendencias, la sección juvenil, Mangas Blanco & Negro, Mangas para adultos,
los dos títulos con más vistas del ranking histórico, Comunidad Mukai y
Character Chat.

Los dos títulos se eligen al combinar los rankings históricos del catálogo,
eliminar series repetidas y ordenar sus vistas reales. No se usan las cifras
provisionales de presentación. Si faltan datos, no se inventan títulos ni vistas.

El frontend define sus rutas en `src/config/seo-routes.json` y configura sus
metadatos en `src/hooks/useDocumentTitle.ts`. La portada usa `MangaMukai` y
Blanco y Negro usa `Manga Blanco y Negro / MangaMukai`.

El PHP que entrega metadatos en la respuesta inicial se administra directamente
en el servidor. Las rutas estáticas aplican los títulos del frontend al cargar,
conservando los datos enriquecidos de listas y fechas enviados por el servidor.

El sitemap `https://mangamukai.com/sitemap-react.xml` incluye las colecciones,
Comunidad Mukai, Character Chat y las fichas de manga. Las páginas privadas,
las conversaciones y los pagos llevan `noindex`.

La dirección antigua `/biblioteca` redirige a la portada. `/sube-tu-manga`
redirige a Contacto. Son redirecciones permanentes del servidor, por lo que
también sirven para corregir resultados antiguos del buscador.

Después de publicar, revisa las respuestas del servidor y solicita un nuevo
rastreo de las páginas principales en Google Search Console. Envía también
el sitemap actualizado. La compilación local no cambia los resultados de Google.

Google decide los enlaces adicionales que muestra, sus títulos y su orden.
Esta estructura ayuda a descubrir las secciones, pero no permite imponer
una lista exacta de resultados ni un plazo de actualización.

Referencia: [enlaces de sitio de Google](https://developers.google.com/search/docs/appearance/sitelinks?hl=es).


## Migración pendiente a direcciones por título

El cliente sigue usando `/manga/:id`: la API actual consulta `/manga/{id}`
y el PHP que sirve metadatos y sitemap no está en este repositorio.
Antes de cambiar los enlaces, el servidor debe proporcionar un `slug` único,
estable y persistido por serie, resolverlo mediante un índice y devolver el ID
interno junto con los datos. No resolver títulos descargando todo el catálogo.

La migración debe coordinar enlaces del cliente, canonical, metadatos iniciales,
sitemap y redirecciones HTTP 301 de las direcciones numéricas y alias antiguos.
Conservar el slug al editar el título evita romper enlaces compartidos. Las
colisiones entre títulos necesitan un sufijo estable decidido por el servidor.
Verificar apertura directa, recarga, navegación atrás, comentarios y precarga.

Las URLs descriptivas facilitan entender el contenido; no aceleran por sí mismas
las consultas ni convierten el ID público de una serie en un secreto. Mantener
la autorización de capítulos de pago, compras y conversaciones en cada endpoint.

Referencias: [estructura de URLs de Google](https://developers.google.com/search/docs/crawling-indexing/url-structure)
y [prevención de IDOR de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html).
