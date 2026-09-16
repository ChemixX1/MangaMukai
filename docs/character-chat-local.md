# Chat de personajes en desarrollo local

El chat funciona inicialmente en **modo demo**: utiliza respuestas locales predefinidas para probar los personajes, la escena y la conversación sin una clave, acceso al servicio IA ni cargos por API. El demo no es un modelo de IA. Puedes abrirlo con `npm run dev` desde `http://localhost:5173` (o el puerto indicado por Vite).

## Activar el servicio IA opcional

Configura **ambas** variables en el entorno del proceso que inicia Vite:

- `OPENAI_API_KEY`: clave de API de tu proyecto de OpenAI.
- `OPENAI_CHAT_MODEL`: identificador de un modelo compatible con Responses al que tu proyecto tenga acceso.

No existe un modelo predeterminado. `.env.example` documenta los nombres, pero este endpoint no lee archivos `.env`: deben ser variables del servidor heredadas al iniciar `npm run dev`. Reinicia Vite después de cambiarlas. No les añadas el prefijo `VITE_`, no las incluyas en el código del navegador y no guardes la clave en el repositorio. Utiliza tu gestor de secretos o una configuración local de entorno para pasar la clave al proceso.

Con ambos valores, el chat muestra disponible el servicio IA y ofrece utilizarlo. Cada mensaje enviado en ese modo llama a la API real y puede generar cargos. Para volver al demo, usa el selector del chat; para desactivar por completo el endpoint IA, elimina una de las variables del entorno y reinicia Vite. Configurar una variable no verifica que la clave o el modelo sean válidos: los errores de conexión y de configuración se muestran al intentar enviar el mensaje.

## Personalidad y contexto

El servidor obtiene el personaje desde la lista permitida de `src/data/chatCharacters.ts`. Su rol, escena y saludo se incorporan a `instructions`, junto con pautas de interacción; el navegador solo puede enviar el identificador y los turnos de conversación. Esto es **configuración mediante instrucciones y contexto**, no entrenamiento ni ajuste fino del modelo. El comportamiento puede variar y requiere revisión antes de cualquier uso público.

La integración envía `POST https://api.openai.com/v1/responses`, con `store: false`, un máximo de 800 tokens de salida y hasta 20 mensajes recientes en `input`. Extrae únicamente el texto de elementos `message` / `output_text` del resultado. El historial enviado se procesa por el proveedor al usar IA; `store: false` controla el almacenamiento de esta respuesta en Responses y no constituye una promesa de retención cero. Referencia de la integración: [guía oficial de generación de texto de OpenAI](https://developers.openai.com/api/docs/guides/text).

## Alcance y límites

- `GET /api/character-chat` devuelve `{ "enabled": true|false }`; no expone la clave ni el modelo.
- `POST /api/character-chat` recibe `{ "characterId": "gojo", "messages": [{ "role": "user", "content": "Hola" }] }` y devuelve `{ "reply": "…" }` o `{ "error": "…" }`.
- Se aceptan exclusivamente conexiones de loopback con Host `localhost` o `127.0.0.1` y el puerto real de Vite. Los POST requieren Origin exacto de una de esas direcciones con el mismo protocolo y puerto. Abrir mediante una IP de la red local no habilita el endpoint.
- El cuerpo está limitado a 64 KiB y la lectura a 10 segundos. Se validan entre 1 y 20 mensajes, alternancia de roles y último turno de usuario; cada mensaje admite hasta 1500 caracteres de usuario o 5000 de asistente.
- Hay un máximo global de seis intentos por minuto y una solicitud a la vez por proceso local. Las llamadas al proveedor tienen un tiempo límite de 30 segundos; los errores devueltos al navegador no incluyen respuestas internas ni secretos.
- El plugin usa `configureServer`: solo existe en el servidor de desarrollo. No se incorpora al sitio estático, al build, a `vite preview` ni a un despliegue del frontend.

Esto es una integración para pruebas locales, **no un backend listo para producción**. Un servicio público necesita un backend propio con autenticación y permisos, controles de abuso y coste por usuario, políticas de privacidad y retención, y una evaluación de las conversaciones y de los personajes. La integración no realiza solicitudes de prueba automáticamente ni llama a la API al consultar disponibilidad.
