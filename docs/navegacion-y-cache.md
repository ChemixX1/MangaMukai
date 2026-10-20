# Navegación y caché

La carga progresiva del inicio conserva su orden: hero y tendencias primero,
después el resto de listas. Las precargas adicionales usan una cola compartida,
con un solo trabajo a la vez.

## Cuándo se prepara una sección

- `src/utils/backgroundTasks.ts` espera a que termine la carga del documento,
  no haya datos visibles bloqueando la cola, haya una pausa de red y de
  interacción y las imágenes visibles hayan terminado. Usa tiempo libre del
  navegador; el fallback para navegadores antiguos espera un poco más.
- No inicia trabajos con la pestaña oculta, sin conexión, con ahorro de datos o
  con 2G. En 3G se conserva la anticipación por intención, pero no la automática.
- `src/utils/routePrefetchPolicy.ts` limita las rutas automáticas a dos, o una si
  el navegador informa hasta 4 GB de memoria o cuatro núcleos. Sin esa
  información se mantiene la cola serial. Las fichas y el lector conservan la
  prioridad de sus propias cargas.
- `NavigationPreload` detecta intención al enfocar, tocar o pasar sobre enlaces
  internos. Cancela lo pendiente al abandonar el enlace o cambiar de ruta.
  No solicita capítulos ni información de cuentas por este mecanismo.
- Búsqueda y notificaciones preparan su código en la cola; sus paneles se
  montan al abrirlos y conservan las animaciones de cierre.

La observación de recursos informa descargas terminadas, no todas las
solicitudes pendientes. Por eso se combina con bloqueos explícitos durante
la carga del inicio, el cambio de página y el uso de paneles. Un import que ya
comenzó no puede cancelarse; la cancelación afecta trabajos aún en cola.

## Qué se reutiliza

`publicDataCache.ts` comparte solicitudes simultáneas y limita la memoria:

| Datos públicos | Vigencia | Máximo de entradas |
| --- | --- | --- |
| Novedades y listas recientes | 60 segundos | 8 |
| Fichas de manga | 60 segundos | 24 |
| Listas de capítulos | 60 segundos | 12 |
| Recomendaciones | 5 minutos | 24 |

El inicio conserva su último contenido al regresar. Si han pasado 60 segundos,
refresca progresivamente; un fallo temporal no vacía lo que ya estaba visible.
Los rankings y el catálogo conservan su caché existente de cinco minutos.
No se añaden cachés de compras, saldos, mensajes ni permisos de lectura.

`server/assets/.htaccess` permite reutilizar durante un año los archivos
estáticos cuyo nombre contiene la huella generada por Vite. Cada versión
modificada recibe otra URL. HTML y API quedan fuera de esa regla; no se añade
un service worker.

## Comprobación

Ejecutar `npm test`, `npm run lint` y `npm run build`. Las pruebas cubren
prioridad, cancelación, conexiones lentas, caché, reintentos, expiración y pausa
de carruseles fuera de pantalla.

En un teléfono real conviene comparar la primera visita y volver a inicio,
B&N y búsqueda; repetir con ahorro de datos y desplazamiento continuo.
La regla HTTP requiere Apache con `mod_headers` y debe comprobarse tras
publicar los archivos de servidor.
