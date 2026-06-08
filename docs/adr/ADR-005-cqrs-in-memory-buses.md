# ADR-005: CQRS con buses en memoria (InMemoryCommandBus / InMemoryQueryBus)

**Estado:** Aceptado — implementado  
**Fecha:** 2026-06-03

## Contexto

Con la adopción de DDD (ADR-004) cada bounded context expone casos de uso como comandos (escrituras) y queries (lecturas). Se necesita un mecanismo de despacho que:

1. Desacople el invocador del handler concreto.
2. Permita registrar handlers por bounded context sin acoplamiento cruzado.
3. Sea testeable sin infraestructura de red.
4. No introduzca una dependencia obligatoria de Redis/RabbitMQ en entornos de test.

## Decisión

Implementar **CQRS** con buses en memoria:

- `InMemoryCommandBus` — registra handlers por tipo de comando y los despacha sincrónicamente en el mismo proceso.
- `InMemoryQueryBus` — ídem para queries.
- `InMemoryEventBus` — publica eventos de dominio a suscriptores registrados en el mismo proceso.

Los handlers se registran en `ServiceContainer.registerHandlers()`, que delega a cada `BoundedContextProvider.registerHandlers()`.

Cada comando y query tiene un identificador estático (`static readonly type`) que sobrevive minificación. Los buses usan ese tipo como clave del `Map<string, Handler>`.

### Consecuencia sobre async

Los comandos y queries son **síncronos** dentro del proceso. Las operaciones verdaderamente asíncronas (notificaciones, health checks, cron jobs) van a BullMQ (colas persistentes en Redis), no al bus de comandos.

## Consecuencias

**Positivo:**
- Sin dependencia de broker externo para el flujo principal de negocio.
- Los tests de integración no necesitan Redis para probar comandos y queries.
- La trazabilidad es directa: un comando → un handler → un resultado.
- El tiempo de respuesta de un comando es O(1) en dispatch (lookup en Map).

**Negativo:**
- El bus en memoria no sobrevive a un crash del proceso — si el proceso muere entre el dispatch y la ejecución del handler, el comando se pierde. Aceptable porque los comandos son síncronos (no se despachan y esperan; se ejecutan y se responde).
- No hay reintentos automáticos de comandos/queries. Los errores se propagan al invocador.
- Si en el futuro se necesita despacho distribuido (múltiples réplicas procesando el mismo comando), habrá que migrar a un bus remoto.

## Alternativas descartadas

- **Bus basado en Redis (Bull/BullMQ como command bus)**: introduce latencia y dependencia de Redis para cada request HTTP. Innecesario cuando el proceso puede ejecutar el handler directamente. Descartado.
- **MediatR-style con decoradores**: requiere decoradores TypeScript experimentales. Ya se usa tsyringe para DI — añadir otro framework de mediación es duplicar conceptos. Descartado.
