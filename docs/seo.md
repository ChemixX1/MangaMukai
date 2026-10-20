# Apariencia en buscadores

La portada presenta Tendencia Ahora y Mangas Juveniles. Sus enlaces llevan a
las tendencias, la sección juvenil, Mangas Blanco & Negro, Mangas para adultos,
los dos títulos con más vistas del ranking histórico, Comunidad Mukai y
Character Chat.

Los dos títulos se eligen al combinar los rankings históricos del catálogo,
eliminar series repetidas y ordenar sus vistas reales. No se usan las cifras
provisionales de presentación. Si faltan datos, no se inventan títulos ni vistas.

El navegador configura sus metadatos en `src/hooks/useDocumentTitle.ts`.
El servidor los entrega en la primera respuesta con
`server/backend-patches/manga-route-meta.php`. Las fichas de manga usan
`manga-social-meta.php`. Los títulos y las descripciones deben mantenerse
coherentes en ambos lados.

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
