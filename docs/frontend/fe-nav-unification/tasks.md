# fe-nav-unification — Tasks

Cada tarea es un PR pequeño (≤ 1 dev-día). El orden respeta dependencias: T1 es
independiente; T2 debe ir antes de T3; T5 debe ir antes de T6; T7–T9 son independientes
entre sí pero conviene tener T5/T6 fusionados primero para que los prototipos coincidan
con las rutas finales.

## Status

| # | Task | Status |
|---|---|---|
| T1 | Fix breadcrumb de Settings: mover de `nav.administer` a `nav.account` | done |
| T2 | Split `settings/system` en Personal (Preferencias) y Tenant (Config de la app) | done |
| T3 | Reorganizar SettingsHubPage en secciones "Tu cuenta" y "Organización" | done |
| T4 | Fix bug: "Logs" duplicado en el drawer móvil de admin | done |
| T5 | DevicesPage scope-aware: unificar `/devices` + `/admin/devices` | done |
| T6 | LogsPage scope-aware: co-localizar `/logs` + `/admin/logs` como tabs | done |
| T7 | Componente `ui-nav-select` y reemplazo de DeviceTabNavComponent | done |
| T8 | Patrón de menú de acciones: `ui-actions-menu` + TopbarService overflow | done |
| T9 | Componente `ui-list-row` unificado y aplicación en listings | done |

---

### T1 — Fix breadcrumb de Settings: mover de `nav.administer` a `nav.account`

- **Problema:** El `breadcrumb` de todas las rutas de settings usa `'nav.administer'`
  como primer segmento (e.g. `['nav.administer', 'nav.settings', 'settings.tabs.profile']`).
  Settings no es una sección de administración — es una sección de cuenta personal.
  El prototipo usa `['Account', 'Settings']`.

- **Does:**
  1. En `shell/shell.routes.ts`: cambiar el `breadcrumb` del padre `settings` de
     `['nav.administer', 'nav.settings']` a `['nav.account', 'nav.settings']`.
  2. En `features/settings/settings.routes.ts`: actualizar todos los breadcrumbs de
     las rutas hijo reemplazando `'nav.administer'` por `'nav.account'`.
  3. Añadir clave de traducción `nav.account` en los archivos i18n (`en.json`, `es.json`).
     Valor sugerido: "Account" / "Cuenta".
  4. Verificar que `BreadcrumbsComponent` (o el topbar) renderiza el cambio correctamente.
  5. Tests del `spec` del hub de settings: actualizar snapshot/assertion del breadcrumb si
     aplica.

- **Output:**
  - `shell/shell.routes.ts` — primer breadcrumb de settings corregido.
  - `settings/settings.routes.ts` — todos los breadcrumbs actualizados.
  - `assets/i18n/en.json`, `es.json` — clave `nav.account` añadida.
  - `/fe-check` pasa.

- **Invariant:** no hay cambios de comportamiento; solo texto del breadcrumb.

---

### T2 — Split `settings/system` en Personal (Preferencias) y Tenant (Config de la app)

- **Problema:** `SettingsSystemPage` contiene dos secciones con scopes distintos:
  - **Personal** (todos los roles): tema (light/dark/system), layout del dashboard
    (grid/list), items por página (10/25/50). Ya gestionado por `ThemeService`.
  - **Admin/tenant** (solo ADMIN con tenant activo): métricas avanzadas, features beta,
    nivel de log. Renderizados bajo `@if(isAdmin)`.
  El prototipo dice que deben vivir en páginas distintas: personal → `Cuenta › Preferencias`,
  admin → `Organización › Config de la app`.

- **Does:**
  1. Crear `features/settings/pages/preferences/settings-preferences.page.ts/html/scss/spec.ts`.
     Contenido: los campos personales extraídos de `settings-system.page` (tema, layout,
     items/página). Misma lógica de `ThemeService` que ya existe.
  2. Crear `features/settings/pages/org/settings-org.page.ts/html/scss/spec.ts`.
     Contenido INICIAL: solo la sección admin extraída de `settings-system.page` (métricas
     avanzadas, beta, log level). Este componente crecerá en T3 cuando se añadan
     thresholds y api-keys.
  3. Mantener `settings-system.page` con un redirect a `preferences` (o eliminarla
     directamente si no hay URLs indexadas/guardadas en producción — ver Q1 en
     open-questions.md). Decisión: redirect por compatibilidad.
  4. Añadir rutas `preferences` y `org` en `settings.routes.ts`. Añadir `canActivate:
     [roleGuard('ADMIN'), superadminTenantGuard]` a la ruta `org`.
  5. Claves i18n: `settings.tabs.preferences`, `settings.tabs.org`.

- **Output:**
  - `settings/pages/preferences/` — nueva página con preferencias personales.
  - `settings/pages/org/` — nueva página con config de admin del tenant.
  - `settings.routes.ts` — rutas `preferences` y `org` añadidas; `system` redirige a `preferences`.
  - `settings-system.page` — vaciada o eliminada.
  - `/fe-check` pasa.

---

### T3 — Reorganizar SettingsHubPage en secciones "Tu cuenta" y "Organización"

- **Problema:** El hub de settings muestra una lista plana de 6 pestañas sin indicar el
  scope de cada ajuste. El prototipo propone dos secciones con cabecera explicativa:
  - **Tu cuenta** — solo te afecta a ti. Visible para todos los roles.
  - **Organización** — afecta a todo el tenant. Solo visible para ADMIN con tenant activo.
  Los ítems de plataforma (salud del sistema, clientes) no viven en Settings.

- **Does:**
  1. Reescribir `SettingsHubPage` con dos grupos:
     - Grupo "Tu cuenta": profile, security, notifications, preferences (T2).
     - Grupo "Organización": thresholds, api-keys, org (T2) — solo visible si
       `isAdmin && tenantCtx.isActive()`.
  2. Cada grupo tiene una cabecera descriptiva ("Solo te afecta a ti" / "Afecta a todo
     el cliente") para orientar al usuario.
  3. Eliminar `settings/api-keys` y `settings/thresholds` del grupo plano; moverlos
     visualmente bajo "Organización" (las rutas permanecen; solo cambia la presentación
     en el hub).
  4. Actualizar tests del hub: verificar que los dos grupos se renderizan según el rol.
  5. Eliminar el tab `system` del hub (ya no existe como destino directo — redirige a
     `preferences`, pero no debe aparecer en la lista).

- **Output:**
  - `settings-hub.page.ts/html/scss/spec.ts` — reescritos con dos secciones.
  - `/fe-check` pasa.

- **Invariant:** las URLs de cada página de settings no cambian; solo cambia la estructura
  del hub.

---

### T4 — Fix bug: "Logs" duplicado en el drawer móvil de admin

- **Problema:** En `BottomNavComponent`, el computed `adminNav` aplana todas las entradas
  de `NAV` que tengan `adminOnly: true`. Esto incluye:
  - `logs` (operativos del tenant) — `adminOnly: true`, `tenantScoped: true`.
  - `admin/logs` (auditoría de plataforma) — `adminOnly: true`.
  Para un ADMIN con tenant activo, ambas pasan el filtro y aparecen en la sección "Admin"
  del drawer como "Logs" / "Logs" — duplicado visible.

- **Does:**
  Aplicar una de estas dos estrategias (ver Q2 en open-questions.md para la decisión):

  **Opción A (fix rápido, pre-T6):** En `adminNav` computed de `bottom-nav.component.ts`,
  deduplicar por etiqueta: si dos items tienen el mismo `label`, conservar el que tiene
  path `admin/*` (el de plataforma). Añadir comentario explicando el duplicado estructural
  que esta dedup parchea, con referencia a T6 (la solución real).

  **Opción B (preferida si T6 se lanza pronto):** Extraer `logs` del grupo `Operate` en
  `nav.ts` y marcarlo como `tenantScoped: false` + `adminOnly: false` para que no caiga
  en `adminNav`. Pero esto cambia la visibilidad en el rail — coordinar con T6.

  Implementar Opción A ahora; T6 eliminará `admin/logs` de `NAV.children` y el duplicado
  desaparecerá de raíz.

- **Output:**
  - `shell/bottom-nav.component.ts` — `adminNav` con dedup por label.
  - `shell/shell.spec.ts` o test de bottom-nav — caso ADMIN + tenant → "Logs" aparece
    exactamente una vez en el drawer admin.
  - `/fe-check` pasa.

---

### T5 — DevicesPage scope-aware: unificar `/devices` + `/admin/devices`

- **Problema:** El prototipo declara que "el scope es un estado, no una ruta". Hoy existe
  `/app/devices` (guard rebota al SUPERADMIN sin tenant) y `/app/admin/devices`
  (solo SUPERADMIN). El prototipo propone una sola ruta `/app/devices` que responde al
  contexto: con cliente activo → filtra al tenant; SUPERADMIN sin cliente → todos los
  dispositivos + columna "Cliente".

- **Does:**
  1. Ampliar `DevicesPage` para leer `TenantContextService`:
     - Si hay tenant activo (cualquier rol): query filtrada al tenant. Comportamiento actual.
     - Si SUPERADMIN sin tenant: query cross-tenant (endpoint de admin). Añade columna
       "Cliente" y un banner "Modo plataforma — viendo todos los clientes".
  2. Eliminar el guard `superadminTenantGuard` de la ruta `devices` en `shell.routes.ts`
     (la propia página maneja el scope; no necesita botar al SUPERADMIN).
  3. En `admin.routes.ts`: eliminar la ruta `devices`.
  4. En `nav.ts`: eliminar `admin/devices` de `children` del ítem `admin`.
  5. Eliminar `AdminDevicesPage` (o dejarla como shell vacío que redirige a `/app/devices`
     si hay URLs guardadas en favoritos).
  6. Tests: `DevicesPage` en modo tenant muestra solo sus dispositivos; en modo plataforma
     muestra todos + columna "Cliente".

- **Output:**
  - `features/dashboard/pages/devices/devices.page.ts/html` — scope-aware.
  - `shell/shell.routes.ts` — `superadminTenantGuard` eliminado de `devices`.
  - `features/admin/admin.routes.ts` — ruta `devices` eliminada.
  - `shell/nav.ts` — `admin/devices` eliminado de children.
  - `features/admin/pages/admin-devices/` — redirect o eliminado.
  - `/fe-check` pasa.

- **Invariant:** Un ADMIN con tenant activo sigue viendo exactamente los mismos
  dispositivos que antes. El SUPERADMIN en modo plataforma ahora ve una página útil
  en lugar de un rebote.

---

### T6 — LogsPage scope-aware: co-localizar `/logs` + `/admin/logs` como tabs

- **Problema:** El prototipo recomienda no fusionar los datos de logs (son diferentes:
  operativos del tenant vs. auditoría de plataforma) pero sí co-localizar la ruta:
  una sola `LogsPage` con dos tabs "Operativos | Auditoría". La tab "Auditoría" se
  muestra solo a ADMIN y contiene los datos actuales de `AdminLogsPage`.

- **Does:**
  1. Ampliar `LogsPage` con un `ion-segment` de dos tabs:
     - "Operativos" — contenido actual de `LogsPage` (logs del tenant).
     - "Auditoría" — visible solo si `isAdmin`. Contenido actual de `AdminLogsPage`
       (audit logs de plataforma, con export CSV existente).
  2. Eliminar el guard `superadminTenantGuard` de la ruta `logs` (los operativos
     necesitan tenant; la auditoría no — ver Q3 en open-questions.md).
  3. En `admin.routes.ts`: eliminar la ruta `logs`.
  4. En `nav.ts`: eliminar `admin/logs` de `children` del ítem `admin`.
  5. Eliminar `AdminLogsPage` (o redirect a `/app/logs`).
  6. Con `admin/logs` eliminado de `NAV`, el bug del duplicado (T4) se resuelve
     de raíz; el fix temporal de T4 puede eliminarse.
  7. Tests: usuario USER ve solo tab "Operativos"; ADMIN ve ambos tabs; la auditoría
     muestra los datos del endpoint correcto.

- **Output:**
  - `features/dashboard/pages/logs/logs.page.ts/html` — con tabs.
  - `features/admin/admin.routes.ts` — ruta `logs` eliminada.
  - `shell/nav.ts` — `admin/logs` eliminado de children.
  - `features/admin/pages/admin-logs/` — redirect o eliminado.
  - `shell/bottom-nav.component.ts` — si el fix de T4 usó dedup, eliminar el parche.
  - `/fe-check` pasa.

---

### T7 — Componente `ui-nav-select` y reemplazo de DeviceTabNavComponent

- **Problema:** El prototipo propone la regla: 2–3 destinos → `ion-segment`; 4+ destinos
  → `ui-nav-select` (dropdown compacto en desktop, sheet en móvil). El detalle de
  dispositivo tiene hasta 9 pestañas. El `DeviceTabNavComponent` actual usa grupos de
  `ion-segment` (3 grupos), lo que es una solución intermedia pero no el componente
  canónico del kit.

- **Does:**
  1. Crear `shared/ui/ui-nav-select/ui-nav-select.component.ts/html/scss/spec.ts`.
     API inputs: `items: NavSelectItem[]`, `value: string`. Output: `valueChange`.
     - En desktop (≥1080px): botón que muestra el ítem activo + ícono de chevron;
       al hacer click abre un popover (usando `PopoverController` de Ionic o un
       posicionamiento propio) con la lista de destinos.
     - En móvil: el click abre un `ActionSheet` (usando `ActionSheetController`
       de Ionic) con los mismos ítems.
  2. Exportar `UiNavSelectComponent` desde `shared/ui/index.ts`.
  3. Refactorizar `DeviceTabNavComponent` para usar `ui-nav-select` en lugar de los
     grupos de `ion-segment`. Los tres grupos actuales (Monitor, Operate, System)
     pueden mantenerse como separadores visuales en el popover/sheet, o aplanarse.
     Ver Q4 en open-questions.md.
  4. Tests del componente: selección cambia el valor; en desktop se abre popover;
     accesibilidad (aria-expanded, role="listbox").

- **Output:**
  - `shared/ui/ui-nav-select/` — nuevo componente.
  - `shared/ui/index.ts` — export añadido.
  - `features/dashboard/components/device-tab-nav/` — refactorizado.
  - `/fe-check` pasa.

---

### T8 — Patrón de menú de acciones: `ui-actions-menu` + TopbarService overflow

- **Problema:** El prototipo establece que las páginas con múltiples acciones deben
  mostrar 1 acción primaria visible y el resto bajo "···" → popover (desktop) /
  action-sheet (móvil). `TopbarService` actualmente soporta un solo `TopbarAction`
  (sin overflow). Las páginas con más de una acción añaden botones propios ad-hoc.

- **Does:**
  1. Extender `TopbarService`:
     ```ts
     interface TopbarAction { icon: string; label: string; handler: () => void; }
     readonly primaryAction = signal<TopbarAction | null>(null);
     readonly overflowActions = signal<TopbarAction[]>([]);
     set(title, primary?, overflow?): void
     ```
  2. Crear `shared/ui/ui-actions-menu/ui-actions-menu.component.ts/html/scss/spec.ts`.
     Inputs: `primary: TopbarAction | null`, `overflow: TopbarAction[]`.
     - Desktop: si `primary`, renderiza un botón con su ícono; si `overflow.length > 0`,
       añade botón "···" que abre un popover con la lista.
     - Móvil: igual, pero "···" abre un `ActionSheetController` de Ionic.
  3. Integrar `UiActionsMenuComponent` en `TopbarComponent` en lugar del botón de acción
     actual.
  4. Exportar `UiActionsMenuComponent` desde `shared/ui/index.ts`.
  5. Adaptar las páginas que ya usan `TopbarService.set()` para pasar las acciones en el
     nuevo formato.
  6. Tests: renderiza solo primaria cuando no hay overflow; abre popover/sheet cuando hay
     overflow; cada acción invoca su handler.

- **Output:**
  - `shared/ui/ui-actions-menu/` — nuevo componente.
  - `shell/topbar.service.ts` — `primaryAction` + `overflowActions`.
  - `shell/topbar.component.ts/html` — usa `ui-actions-menu`.
  - `shared/ui/index.ts` — export añadido.
  - Páginas que usan `TopbarService`: actualizadas al nuevo API.
  - `/fe-check` pasa.

---

### T9 — Componente `ui-list-row` unificado y aplicación en listings

- **Problema:** El prototipo propone una sola `ui-list-row` que muestra columnas a la
  derecha en desktop y las pliega a una línea de meta en móvil. Actualmente algunas
  páginas mantienen tabla (desktop) y lista de `ion-item` (móvil) por separado, lo que
  genera divergencia visual y doble mantenimiento.

- **Does:**
  1. Crear `shared/ui/ui-list-row/ui-list-row.component.ts/html/scss/spec.ts`.
     API: `lead?: TemplateRef` (dot de estado, avatar), `title: string`,
     `meta?: string[]` (pares "key value" en móvil), `cols?: ColDef[]`
     (columnas en desktop), `trailingActions?: TemplateRef`.
     - Breakpoint `1080px`: ≥ desktop → muestra columnas a la derecha;
       < móvil → muestra `meta` condensado debajo del título.
  2. Exportar desde `shared/ui/index.ts`.
  3. Aplicar `ui-list-row` en al menos las siguientes páginas (una por PR si es
     necesario subdividir):
     - `DevicesPage` — lista/tabla de dispositivos.
     - `AdminUsersPage` — tabla de usuarios.
     - `AdminCustomersPage` — tabla de clientes.
     - `MonitoringPage` — lista de alertas.
  4. La `SettingsThresholdsPage` ya usa tabla en desktop y lista en móvil (task
     reciente); aplicar `ui-list-row` para unificar los dos modos.
  5. Tests del componente: en viewport wide muestra columnas; en compact muestra meta.

- **Output:**
  - `shared/ui/ui-list-row/` — nuevo componente.
  - `shared/ui/index.ts` — export añadido.
  - Páginas listadas: actualizadas a `ui-list-row`.
  - `/fe-check` pasa.

- **Nota:** Esta es la tarea de mayor superficie. Si la página ya funciona bien en
  ambos modos (responsive sin bugs) puede posponerse — ver Q5 en open-questions.md.
