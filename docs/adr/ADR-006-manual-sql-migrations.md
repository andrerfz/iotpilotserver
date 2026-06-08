# ADR-006: Migraciones SQL manuales (sin `prisma migrate dev`)

**Estado:** Aceptado — implementado  
**Fecha:** 2026-06-03

## Contexto

Prisma tiene dos flujos de migración:

1. `prisma migrate dev` — genera migraciones automáticamente a partir de diff del schema. Mantiene una tabla `_prisma_migrations` en la base de datos. Diseñado para desarrollo, no para producción.
2. `prisma migrate deploy` — aplica migraciones ya generadas. Requiere que los archivos existan en `prisma/migrations/`.

En entornos de producción de IoT Pilot se identificaron dos problemas con el flujo automático:

- `prisma migrate dev` requiere acceso de escritura al schema de la base de datos en cualquier entorno donde se ejecute, lo que no es aceptable en producción.
- La tabla `_prisma_migrations` puede desincronizarse si se aplican cambios fuera de Prisma (e.g. hotfixes SQL directos).

## Decisión

Usar **migraciones SQL manuales numeradas** en `app/prisma/migration/`:

```
app/prisma/migration/
├── 001_initial_setup.sql
├── 002_add_sessions.sql
├── ...
└── 011_add_notification_bc.sql
```

- Cada migración es un archivo `.sql` puro, numerado secuencialmente.
- Se aplican con `make apply-migration` o directamente con `psql`.
- El schema `app/prisma/schema.prisma` se mantiene en sync manualmente — es la fuente de verdad para el cliente Prisma generado.
- `prisma generate` se ejecuta después de cada cambio de schema para regenerar el cliente TypeScript.
- **No se usa `prisma migrate dev` ni `prisma migrate deploy`** — no existe la tabla `_prisma_migrations`.

### Proceso para añadir un campo

1. Editar `app/prisma/schema.prisma`.
2. Crear `app/prisma/migration/NNN_descripcion.sql` con el DDL correspondiente.
3. Ejecutar `make migrate` (aplica el SQL) + `docker exec iotpilot-server-app npx prisma generate`.
4. Actualizar el mapper y la entidad de dominio si aplica.

## Consecuencias

**Positivo:**
- Las migraciones son SQL puro — cualquier DBA puede revisarlas, auditarlas y aplicarlas.
- No hay dependencia del tooling de Prisma para aplicar migraciones en producción.
- Es trivial incluir operaciones que Prisma no puede generar (e.g. índices parciales, funciones PL/pgSQL).

**Negativo:**
- El schema `.prisma` y las migraciones SQL pueden desincronizarse si un desarrollador olvida actualizar uno de los dos.
- No hay `prisma migrate status` para ver qué migraciones están aplicadas — el equipo debe mantener un registro propio o comparar el schema actual de la base de datos.
- Añadir campos a tablas con datos existentes requiere escribir SQL defensivo manualmente (NOT NULL con DEFAULT, backfills).

## Alternativas descartadas

- **`prisma migrate dev` en producción**: genera riesgo de perder datos en migraciones destructivas autogeneradas. Descartado.
- **Flyway / Liquibase**: añade una herramienta de migración adicional cuando el equipo ya tiene SQL puro funcionando. Descartado.
