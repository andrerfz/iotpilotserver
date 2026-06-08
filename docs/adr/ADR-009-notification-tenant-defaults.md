# ADR-009: Comportamiento por defecto cuando un usuario no tiene preferencias de notificación

**Estado:** Aceptado — implementación pendiente  
**Fecha:** 2026-06-03  
**Relacionado con:** bc-notification Q4, `NotificationRoutingService`

## Contexto

`NotificationRoutingService.resolveRoutes()` busca `NotificationPreference` activas para un usuario y tipo de evento. Si un usuario nuevo no ha configurado ninguna preferencia, actualmente no recibe ninguna notificación — comportamiento opt-in silencioso.

Esto puede resultar en que usuarios nuevos no reciban alertas críticas (ALERT_TRIGGERED, DEVICE_OFFLINE) hasta que visiten la página de configuración.

## Opciones

### Option A — Opt-in por defecto (diseño actual)
Sin preferencia configurada = sin notificación. El usuario debe activar explícitamente.

**Pros:** Sin ruido para usuarios que no quieren notificaciones. Simple.  
**Contras:** Usuarios nuevos pueden perder alertas críticas. Mala UX por defecto.

### Option B — Opt-out para tipos críticos (recomendada para MVP)
`ALERT_TRIGGERED` y `DEVICE_OFFLINE` están habilitados por EMAIL por defecto para todos los usuarios. `NotificationRoutingService` genera una ruta sintética cuando no existe preferencia explícita para esos tipos.

**Pros:** Los usuarios nuevos reciben alertas críticas desde el primer día. Sigue siendo opt-out (pueden desactivarlo).  
**Contras:** Requiere lógica adicional en `NotificationRoutingService`. El email del usuario debe estar confirmado.

### Option C — Defaults configurables por tenant
Un nuevo agregado `TenantNotificationDefault (channel, type, enabled)`. Los admins configuran los defaults; los nuevos usuarios los heredan.

**Pros:** Cada tenant puede definir su política.  
**Contras:** Nuevo agregado, nueva UI de admin. Complejidad mayor.

## Decisión

**Option B adoptada.** `ALERT_TRIGGERED` y `DEVICE_OFFLINE` se habilitan por EMAIL por defecto para todos los usuarios activos. Decisión 2026-06-03.

### Implementación pendiente en `NotificationRoutingService`

`resolveRoutes()` debe generar una ruta sintética cuando:
1. No existe `NotificationPreference` activa para el usuario + tipo + canal.
2. El tipo está en la lista de tipos críticos: `['ALERT_TRIGGERED', 'DEVICE_OFFLINE']`.
3. El usuario tiene email confirmado.

La ruta sintética usa `channel: 'EMAIL'` con las credenciales del usuario. El usuario puede desactivarla creando una preferencia explícita con `enabled: false`.
