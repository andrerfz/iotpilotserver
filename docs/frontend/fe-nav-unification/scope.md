# fe-nav-unification — Scope

## Purpose

Cierra las brechas entre el prototipo **"Navegación Unificada"**
(`docs/prototype frontend/iotpilot/Navegación Unificada.html`) y el estado actual
del código en `apps/frontend-ng`. El prototipo es el contrato de diseño; este módulo
implementa las decisiones que todavía no están reflejadas en el código.

Tres grandes áreas:

1. **Reorganización de Settings por scope** — la barra plana de 6 pestañas mezcla
   ajustes personales con ajustes del tenant y configuración de admin. Se divide en
   "Tu cuenta" y "Organización".
2. **Unificación de rutas duplicadas** — el scope es un estado, no una ruta.
   `/devices` y `/admin/devices`, `/logs` y `/admin/logs` son la misma vista con
   distinto alcance de datos.
3. **Catálogo de patrones UI** — `ui-nav-select` (dropdown para 4+ destinos),
   `ui-list-row` (fila unificada desktop+móvil) y el patrón de menú de acciones.

## Análisis de inconsistencias (prototipo → código actual)

### A. Settings — flat tabs vs. scopes

| Prototipo propone | Código actual | Gap |
|---|---|---|
| Sección "Tu cuenta" (`/settings/account`): profile, security, notifications, preferences | Pestaña plana por cada página bajo `/settings/` | Estructura de hub no separa scopes |
| Sección "Organización" (`/settings/org`, gated ADMIN + tenant): thresholds, api-keys, app config | api-keys y thresholds al mismo nivel que profile | El scope del ajuste no está expresado en la UI |
| `settings/system` debe partir en dos: personal (tema, layout, items/página) → Cuenta; admin (métricas avanzadas, beta, log level) → Organización | `settings/system` mezcla ambos bajo `@if(isAdmin)` | Una página schizofrénica con lógica de presentación oculta |
| Breadcrumb: `['Account', 'Settings']` | `['nav.administer', 'nav.settings']` | Settings se presenta como sección de Administer, no como sección de cuenta personal |

### B. Rutas duplicadas

| Prototipo propone | Código actual | Gap |
|---|---|---|
| `/app/devices` scope-aware: con tenant filtra al tenant; SUPERADMIN sin tenant → todos los clientes + columna "Cliente" | `/app/devices` (tenant, con `superadminTenantGuard`) y `/app/admin/devices` (SUPERADMIN) separados | Dos componentes para la misma entidad; el guard rebota en lugar de ampliar la vista |
| `/app/logs` con tabs "Operativos \| Auditoría" (Auditoría solo ADMIN) | `/app/logs` (tenant, ADMIN) y `/app/admin/logs` (plataforma, ADMIN) separados | Doble ruta, doble componente |
| Bug: "Logs" aparece dos veces en el drawer "···" de móvil para un ADMIN con tenant activo | `adminNav` en `bottom-nav.component.ts` incluye `logs` (adminOnly, tenantScoped) y `admin/logs` (adminOnly) sin deduplicar | Bug visible en producción |

### C. Patrones UI no implementados

| Prototipo propone | Código actual | Gap |
|---|---|---|
| `ui-nav-select`: dropdown para 4+ destinos (desktop: popover; móvil: action-sheet). Reemplaza la fila de pestañas con scroll oculto | `DeviceTabNavComponent` usa grupos de `ion-segment` (3 grupos: Monitor, Operate, System) | El componente propuesto no existe; el actual es una solución intermedia |
| Menú de acciones: 1 acción primaria visible + "···" overflow → popover (desktop) / action-sheet (móvil) | `TopbarService` soporta un solo `TopbarAction`; no hay patrón de overflow | Páginas con múltiples acciones añaden botones ad-hoc |
| `ui-list-row`: fila de lista unificada que muestra columnas en desktop y las pliega a meta en móvil. Reemplaza tabla + swipe-list por un solo componente | Tablas y listas mantenidas por separado (ej. fe-settings/thresholds tiene tabla en desktop, lista en móvil) | Doble mantenimiento; divergencia visual |

## Dependencias

- **fe-settings** — done. Las páginas de settings existen; se refactorizan, no se crean.
- **fe-dashboard** — done. `DevicesPage` y `LogsPage` existen; se amplían.
- **fe-admin** — done. `AdminDevicesPage` y `AdminLogsPage` existen; se deprecan/fusionan.
- **fe-device-detail** — done. `DeviceTabNavComponent` existe; se sustituye.
- **fe-ui-kit** — done. Los nuevos componentes se añaden al barrel `shared/ui`.

## Estructura objetivo

```
apps/frontend-ng/src/app/
├── shell/
│   └── nav.ts                              # quitar admin/devices y admin/logs de children
├── features/
│   ├── settings/
│   │   ├── settings.routes.ts              # renombrar rutas, añadir redirects
│   │   └── pages/
│   │       ├── hub/                        # SettingsHubPage — secciones por scope
│   │       ├── preferences/                # NUEVO (split de system, parte personal)
│   │       └── org/                        # NUEVO (Organización: thresholds + api-keys + app config)
│   ├── dashboard/
│   │   ├── pages/devices/                  # DevicesPage ampliada con scope-awareness
│   │   └── pages/logs/                     # LogsPage ampliada con tabs Operativos|Auditoría
│   │       ├── components/device-tab-nav/  # reemplazado por ui-nav-select
│   └── admin/
│       └── admin.routes.ts                 # admin/devices y admin/logs eliminados
└── shared/ui/
    ├── ui-nav-select/                      # NUEVO — dropdown compacto 4+ destinos
    ├── ui-list-row/                        # NUEVO — fila de lista unificada
    └── ui-actions-menu/                    # NUEVO — 1 primaria + overflow
```

## Qué no cubre este módulo

- Fusión de `admin/users` → `/app/users` scope-aware (open question Q2 — depende de
  si el backend expone un endpoint cross-tenant de usuarios para ADMIN no-superadmin).
- Eliminación de `admin/customers` (no tiene duplicado de tenant; se queda donde está).
- Implementación de export (xlsx/pdf) en logs/admin-logs (pendiente en backlog, ver
  memory `project_export_feature_pending.md`).
