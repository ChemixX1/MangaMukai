# Historial de transacciones

La ruta privada `/transacciones` está enlazada desde Opciones del perfil. Las cuatro categorías se seleccionan mediante `?tipo=recharges|purchases|chapters|bonuses`.

La interfaz usa `getTransactions` en `src/services/transactionService.ts`. Actualmente devuelve `null` (función aún no habilitada), sin inventar movimientos ni consultar un endpoint inexistente. Una respuesta con `items: []` representa un historial real vacío. La página contempla carga, error con reintento y paginación por cursor.

## Contrato para la futura API

GET autenticado `/transactions?category=chapters&cursor=...`, con un límite fijo de 20 registros. Obtener el usuario de la sesión en el servidor. Responder con `TransactionPage`, con los campos definidos en el servicio. Ordenar por fecha descendente y, como desempate, ID descendente. El cursor debe mantener ese orden y estar vinculado al usuario y categoría.

## Tabla propuesta

Usar el prefijo de tablas de WordPress. Campos sugeridos: `id`, `user_id`, `category`, `title`, `status`, `amount_minor`, `unit`, `chapter_id` opcional, `source_type`, `source_id`, `created_at` y `updated_at` en UTC. Guardar dinero como enteros en centavos y monedas como enteros; convertir el dinero a unidades mayores al producir `amount` para la API. No usar flotantes para persistir dinero.

Índice de consulta sobre `(user_id, category, created_at, id)`. Clave única por `(source_type, source_id, category)` para evitar duplicar movimientos al reintentar confirmaciones. Registrar únicamente eventos confirmados por el backend de pagos, compras o recompensas. No inferir transacciones a partir del saldo actual. Compras corresponde a productos y suscripciones; los capítulos tienen su propia categoría.

El historial no otorga acceso: el lector sigue verificando los permisos con su API. Comprobar la propiedad de cada registro y cursor en el servidor. No devolver tokens, datos completos de pago ni información de otras cuentas. La creación de la tabla, migración de datos e implementación de la API quedan pendientes; esta entrega prepara la interfaz y su contrato.
