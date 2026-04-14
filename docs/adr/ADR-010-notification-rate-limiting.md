# ADR-010: Rate limiting de notificaciones por usuario y canal

**Estado:** Aceptado — implementado  
**Fecha:** 2026-06-03  
**Relacionado con:** bc-notification Q5, `DispatchNotificationHandler`, `RateLimitConfig` en shared

## Contexto

Un dispositivo que alterna entre ONLINE y OFFLINE repetidamente (flapping) puede generar decenas de eventos `DeviceDisconnectedEvent` en minutos. Cada evento produce N `DispatchNotification` commands (uno por canal por usuario). Sin límite de envío, un usuario puede recibir 50 emails en 10 minutos por un dispositivo inestable.

El shared VO `RateLimitConfig` existe en el código pero no está conectado a ningún enforcement.

## Opciones

### Option A — Sin rate limiting en el BC (diseño actual)
Delegar la supresión al `monitoring` BC mediante el cooldown de `Threshold`. Si el threshold tiene un periodo de cooldown de 10 minutos, no se generarán nuevos eventos durante ese periodo.

**Pros:** Sin nueva infraestructura en el BC de notificaciones. El cooldown de threshold ya existe.  
**Contras:** Los eventos DEVICE_OFFLINE/ONLINE no pasan por threshold — no hay cooldown. El flapping de dispositivos sí puede generar floods.

### Option B — Rate limit en `DispatchNotificationHandler`
Si existen N registros `NotificationRecord` del mismo `(userId, type, channel)` en estado PENDING/SENDING en los últimos X minutos, rechazar el nuevo dispatch.

**Pros:** Enforcement en el punto de creación. Simple de implementar.  
**Contras:** Requiere query adicional en cada dispatch. El threshold N/X debe configurarse.

### Option C — Deduplicación por `sourceEventId` en el job processor
El `DispatchNotificationChannelProcessor` comprueba si ya existe un `NotificationRecord` DELIVERED para el mismo `sourceEventId`. Si existe, omite el envío.

**Pros:** Elimina duplicados por el mismo evento. No ralentiza el dispatch.  
**Contras:** Solo deduplica por evento exacto, no limita la frecuencia de eventos distintos.

## Decisión

**Option A adoptada para el MVP.** Sin rate limiting en el BC de notificaciones. El cooldown de `Threshold` cubre los eventos de alertas. Decisión 2026-06-03.

Revisitar cuando se observen floods de dispositivos en producción. `NotificationRecord` ya tiene `(createdAt, type, channel, userId)` — Option B puede añadirse sin cambios de schema.
