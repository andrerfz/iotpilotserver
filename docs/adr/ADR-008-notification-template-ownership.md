# ADR-008: Propiedad y renderizado de plantillas de notificación

**Estado:** Aceptado — implementado  
**Fecha:** 2026-06-03  
**Relacionado con:** bc-notification Q2, `DispatchNotificationCommand`

## Contexto

El comando `DispatchNotification` requiere que el caller pase `subject` y `body` ya renderizados. Esto significa que los event handlers (`OnAlertTriggeredHandler`, `OnDeviceOfflineHandler`, etc.) contienen las cadenas de texto de los mensajes hardcodeadas en inglés.

Este diseño (Option A a continuación) es funcional para el MVP pero bloquea:
- Soporte multiidioma.
- Plantillas configurables por administrador desde la UI.
- Consistencia de formato entre canales (e.g. email HTML vs Slack markdown).

## Opciones

### Option A — Pre-renderizado en los event handlers (diseño actual)
Los handlers construyen `subject` y `body` en el momento del dispatch. Las plantillas son strings hardcodeados en el código fuente.

**Pros:** Sin nueva infraestructura. Simple.  
**Contras:** No personalizable. Requiere deploy para cambiar una plantilla.

### Option B — Agregado `NotificationTemplate` dentro de bc-notification
Un nuevo agregado `(type, channel, locale) → (subjectTemplate, bodyTemplate)`. El `DispatchNotificationHandler` resuelve y renderiza la plantilla usando el `sourceEntityId` para sustituir variables.

**Pros:** Plantillas configurables por admin desde la UI. Soporte multiidioma sin cambios de código.  
**Contras:** Nuevo agregado, nueva tabla, nueva interfaz de admin. Complejidad de renderizado (motor de plantillas, variables disponibles por tipo de evento).

### Option C — Servicio externo (SendGrid dynamic templates, etc.)
Para email, delegar el renderizado al proveedor. Para otros canales, Option A o B.

**Pros:** El proveedor gestiona el editor de plantillas.  
**Contras:** Acoplamiento a proveedor externo. No funciona para SMS/Slack/Webhook.

## Decisión

**Option A adoptada para el MVP.** Los event handlers (`OnAlertTriggeredHandler`, `OnDeviceOfflineHandler`, etc.) contienen las cadenas hardcodeadas. Decisión 2026-06-03.

Option B puede añadirse como feature autónoma sin cambiar la interfaz del comando `DispatchNotification` — solo cambia quién construye `subject`/`body` antes de llamar al handler.
