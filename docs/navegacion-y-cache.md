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
| Listas de capítulos | 2 minutos | 24 |
| Recomendaciones | 5 minutos | 24 |

El inicio conserva su último contenido al regresar. Si han pasado 60 segundos,
refresca progresivamente; un fallo temporal no vacía lo que ya estaba visible.
Los rankings y el catálogo conservan su caché existente de cinco minutos.
No se añaden cachés de compras, saldos, mensajes ni permisos de lectura.

## Precarga desde el inicio

`HomePrefetchProvider` se activa cuando todas las listas del inicio terminan y
utiliza la misma cola de tiempo libre, sin modificar su carga progresiva.
Prepara el código de la ficha y del lector y reutiliza la biblioteca musical.
Los hero registran sus portadas mostradas; las tendencias, el ranking activo;
y las novedades, la página y pestaña seleccionadas y su página siguiente.

`homeNavigationQueue.ts` atiende primero las secciones en pantalla, luego el
resto de las páginas actuales y finalmente las páginas siguientes. Cambiar de
página o pestaña sustituye los candidatos y cancela los capítulos especulativos
que dejaron de tener prioridad. Al salir del inicio o esconder la pestaña se
cancela la cola; las peticiones públicas compartidas que ya empezaron pueden
terminar para otros consumidores.

La cola trabaja por etapas dentro de cada grupo: primero la ficha y el listado
de capítulos de todas las series visibles; después, los capítulos recientes;
por último, recomendaciones y comentarios. Solo entonces pasa a las tarjetas
fuera de pantalla y a la página siguiente. Los comentarios lentos no bloquean
la preparación inicial de las otras series visibles.

Cada sección se publica en cuanto llega: la sinopsis no espera al listado y el
selector del lector no espera recomendaciones, comentarios ni imágenes.
Las tarjetas recientes también conservan en memoria el ID de serie, el título
y el número de sus capítulos desde que llega la respuesta del inicio. Ese
registro público está limitado a 5.000 capítulos y permite mostrar el número
en el primer render del lector, incluso si todavía no hubo tiempo de precargar.
No contiene imágenes ni permisos de acceso.

Cuando una tarjeta ya identifica su serie, la precarga inicia su listado antes
de pedir la ficha y publica el selector aunque la ficha siga pendiente. Al abrir
el lector se solicita el listado antes del contenido si la serie ya es conocida;
en un enlace directo comienza en cuanto llegan los metadatos. Ambos avanzan de
forma independiente. Home, ficha y lector comparten la caché pública y las
peticiones de listados en curso. Los comentarios del lector se piden después.

Se conserva una instantánea parcial durante dos minutos, con un máximo de
24 fichas. Los listados públicos, las fichas preparadas y las sesiones del
inicio comparten los límites de `navigationCachePolicy.ts`. La cola selecciona
como máximo 24 series distintas, priorizando las tarjetas visibles y las
páginas actuales antes de las siguientes. Así no prepara más series de las que
puede conservar entre etapas ni vuelve a descargar datos recién expulsados.
Al abrir `MangaDetail`, las secciones preparadas hace menos de un
minuto se reutilizan directamente; las antiguas se muestran mientras se
actualizan mediante las cachés públicas compartidas. Recomendaciones y catálogo
pueden completar la barra lateral por separado. Los comentarios se solicitan
después del listado, sin esperar al catálogo y con una espera de tiempo libre
limitada a 250 ms en navegadores con `requestIdleCallback`.
Los comentarios preparados solo se muestran durante 60 segundos y para la
misma cuenta. Las otras cachés públicas conservan sus límites y vigencia.

El fondo de Mukai Music ya estaba en WebP; se recomprimió de 117.994 a 71.378
bytes conservando los 768 × 432 píxeles y su prioridad de descarga baja.

De los dos capítulos recientes mostrados en cada tarjeta, solo se solicitan los
publicados y gratuitos, comprobando también la lista de capítulos. Se preparan
sus datos y las primeras cinco imágenes, con prioridad baja. No se registran
vistas ni progreso y no se realizan compras. Las sesiones del inicio se mantienen
separadas (máximo 24, dos minutos); al navegar se conserva la sesión elegida
y se descartan las demás. Un cambio de cuenta invalida las sesiones. La carga
del capítulo actual sigue a cargo del lector. Las portadas del hero y del
ranking también pueden preparar las primeras cinco imágenes del primer
capítulo de la serie, si está disponible sin pago.

## Precarga durante la lectura

Cuando terminan las imágenes del capítulo actual, se prepara únicamente su
sucesor inmediato. Un capítulo bloqueado no se salta para descargar otros más
lejanos, y el último capítulo no genera precargas. En la ficha solo se prepara
el capítulo inicial.

La precarga automática se omite con ahorro de datos, sin conexión, en 2G/3G o
cuando el navegador informa hasta 1,5 Mbps. En dispositivos que informan hasta
4 GB de memoria o cuatro núcleos se limita a cinco imágenes y una descarga a
la vez; en los demás se puede preparar el siguiente capítulo completo con dos
descargas simultáneas de prioridad baja. Esto no limita la carga del capítulo
que el usuario está leyendo.

Ocultar la pestaña o pasar a una conexión restringida cancela las imágenes
especulativas en curso. Se conserva el prefijo de imágenes ya descargadas para
no volver a solicitarlo al reanudar. Al recuperar una conexión permitida, el
lector reanuda la preparación si las imágenes del capítulo actual ya terminaron;
la ficha también reanuda su precarga. Los marcadores se eliminan junto con los
datos del capítulo al expulsarlo de la caché; los bytes de las imágenes quedan
bajo la política de caché HTTP del navegador.

## Consultas del chat

`adaptivePolling.ts` programa cada consulta después de terminar la anterior.
Los mensajes se consultan cada cinco segundos mientras se conversa; después
de un minuto sin escritura ni mensajes nuevos pasan a 15 segundos, y desde
tres minutos a 30 segundos. Escribir recupera la frecuencia rápida sin hacer
una petición por tecla; enviar y volver a una pestaña visible o recuperar la
conexión provocan una actualización inmediata.

La bandeja pasa de 15 a 30 y 60 segundos, y el perfil de 30 a 60 segundos. Con
la pestaña oculta o sin conexión se suspenden los temporizadores. Los errores
aumentan la espera de forma exponencial hasta dos minutos; escribir no acorta
esa espera y una respuesta correcta la restablece.

Con 1.000 conversaciones visibles, cinco segundos suponen aproximadamente
200 consultas de mensajes por segundo. Si todas llevan tres minutos sin
actividad, 30 segundos reducen esa cifra teórica a unas 33 consultas por
segundo. No incluye bandeja, perfiles ni envíos; no es una medición de carga
del servidor. Al llegar un mensaje a una conversación inactiva, su detección
puede tardar hasta 30 segundos más el tiempo de respuesta de la petición.

La configuración de caché administrada en el servidor permite reutilizar durante un año los archivos
estáticos cuyo nombre contiene la huella generada por Vite. Cada versión
modificada recibe otra URL. HTML y API quedan fuera de esa regla; no se añade
un service worker.

## Comprobación

Ejecutar `npm test`, `npm run lint` y `npm run typecheck`, sin generar `dist`. Las pruebas cubren
prioridad, cancelación, conexiones lentas, caché, reintentos, expiración y pausa
de carruseles fuera de pantalla.

En un teléfono real conviene comparar la primera visita y volver a inicio,
B&N y búsqueda; repetir con ahorro de datos y desplazamiento continuo.
La regla HTTP requiere Apache con `mod_headers` y debe comprobarse tras
publicar los archivos de servidor.
