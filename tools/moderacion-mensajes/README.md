# Supervisión de mensajes (herramienta local)

Aplicación local, de solo lectura, para revisar los mensajes privados que los
usuarios de MangaMukai se envían entre sí (chat de amigos) y detectar fraudes,
estafas, acoso u otros delitos. Se ejecuta en tu equipo con la conexión al
sitio ya integrada: no hay que iniciar sesión.

## Qué hace

- Muestra los mensajes más recientes con remitente, destinatario, hora local y
  si fueron leídos.
- Marca **señales** automáticas: palabras de riesgo (transferencia, tarjeta,
  contraseña, WhatsApp, menor, fotos…), enlaces, correos, teléfonos y números que
  parecen tarjetas. Se pueden ampliar en el servidor con el filtro
  `mm_moderation_keywords`.
- Filtra por texto, usuario (ID, nombre o correo), fechas y "solo con señales".
- Lista las conversaciones (pares de usuarios) y abre el hilo completo.
- Exporta a CSV lo que tengas en pantalla (por si hay que documentar un caso).
- Se refresca solo cada minuto (configurable) para vigilar en tiempo casi real.

No envía mensajes, no borra ni modifica nada en el sitio.

## Cómo funciona la conexión

La app y el sitio comparten una clave larga y aleatoria:

1. La primera vez que ejecutas la app, crea
   `server/wp-content/mu-plugins/mangamukai-moderation-key.php` con la clave.
   Ese archivo está en `.gitignore`: nunca sube a GitHub.
2. Como vive dentro de `server/`, el siguiente `npm run deploy` lo publica en el
   servidor junto con el resto de PHP. Desde ese momento el sitio acepta las
   consultas de la app (cabecera `X-MM-Moderation-Key`) y rechaza cualquier
   otra.
3. La app lee la clave de ese mismo archivo cada vez que arranca, así que no
   hay nada que copiar ni escribir.

Hasta que despliegues, la app muestra un aviso con el paso que falta y un
botón "Reintentar".

## Requisitos

- Node.js 18 o superior.
- Tener desplegados (con `npm run deploy`) el mu-plugin
  `mangamukai-moderation-api.php` y el archivo de clave que genera la app.

## Uso

```bash
npm run moderacion
```

Abre <http://127.0.0.1:4317> (o añade `-- --open` para que se abra solo).

Opciones: `MM_PORT=4400 npm run moderacion` cambia el puerto; `MM_SITE` y
`MM_SITE_IP` permiten apuntar a otro dominio/IP (por defecto mangamukai.com y
su IP de BanaHosting, porque el router de desarrollo no resuelve el dominio);
`MM_MODERATION_KEY` o `MM_MODERATION_KEY_FILE` permiten usar otra clave u otro
archivo.

## Seguridad y privacidad

- El servidor local solo escucha en `127.0.0.1`; no es accesible desde otros
  equipos, y solo acepta peticiones de su propia interfaz.
- La clave es el único secreto. Si crees que se ha filtrado: borra
  `mangamukai-moderation-key.php`, vuelve a ejecutar `npm run moderacion` (se
  genera otra) y despliega. La anterior deja de valer al instante.
- En el servidor el archivo de clave es un mu-plugin normal: si alguien lo pide
  por HTTP, PHP lo ejecuta y no devuelve nada.
- Los mensajes son datos personales: usa la herramienta solo para moderación y
  prevención de delitos, no compartas exportaciones y refleja esta supervisión
  en los Términos y la Política de privacidad del sitio.
