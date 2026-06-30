# fe-nav-unification — Acceptance Criteria

## Criterios por tarea

### T1 — Breadcrumb de Settings

- [ ] Navegando a `/app/settings/profile` el topbar muestra "Cuenta › Settings › Perfil"
      (o equivalente en el idioma activo), nunca "Administrar".
- [ ] Todos los breadcrumbs de rutas hijo de settings empiezan por `nav.account`.
- [ ] La clave `nav.account` existe en `en.json` y `es.json`.
- [ ] `/fe-check` pasa sin errores.

### T2 — Split de settings/system

- [ ] `/app/settings/preferences` muestra solo los controles personales: tema, layout
      del dashboard, items por página.
- [ ] `/app/settings/org` muestra solo los controles de admin del tenant: métricas
      avanzadas, features beta, nivel de log — y está gated a ADMIN con tenant activo.
- [ ] Un USER que navega a `/app/settings/org` es redirigido (guard rebota).
- [ ] Un SUPERADMIN en modo plataforma que navega a `/app/settings/org` es redirigido
      (`superadminTenantGuard` activo).
- [ ] `/app/settings/system` redirige a `/app/settings/preferences`.
- [ ] `/fe-check` pasa.

### T3 — SettingsHubPage reorganizada

- [ ] El hub de settings muestra dos secciones con cabecera: "Tu cuenta" y "Organización".
- [ ] Un USER solo ve "Tu cuenta" (profile, security, notifications, preferences).
- [ ] Un ADMIN con tenant activo ve ambas secciones. "Organización" incluye thresholds,
      api-keys y config de la app.
- [ ] Un SUPERADMIN en modo plataforma (sin tenant) solo ve "Tu cuenta".
- [ ] El ítem "System" ha desaparecido del hub (redirige a preferences).
- [ ] Tests del hub pasan en los tres roles.
- [ ] `/fe-check` pasa.

### T4 — Fix "Logs" duplicado en drawer móvil

- [ ] Un ADMIN con tenant activo abre el drawer "···" y ve "Logs" exactamente una vez
      en la sección Admin.
- [ ] El único "Logs" que aparece navega a la ruta correcta (no produce 404).
- [ ] Test de `BottomNavComponent`: en rol ADMIN + tenant, `adminNav()` no contiene
      items con label repetido.
- [ ] `/fe-check` pasa.

### T5 — DevicesPage scope-aware

- [ ] Un ADMIN con tenant activo ve solo los dispositivos de su tenant. Sin cambios
      respecto al comportamiento anterior.
- [ ] Un SUPERADMIN en modo plataforma (sin tenant) ve todos los dispositivos de todos
      los clientes, con columna "Cliente" visible.
- [ ] El banner de scope aparece: "Cliente activo: X" cuando hay tenant; "Modo plataforma
      — viendo todos los clientes" cuando no hay.
- [ ] `/app/admin/devices` ya no existe: la ruta devuelve 404 o redirige a `/app/devices`.
- [ ] `admin/devices` ha desaparecido del rail de admin en el shell de desktop.
- [ ] El guard `superadminTenantGuard` ya no está en la ruta `devices` (el SUPERADMIN
      no es redirigido; ve la página en modo plataforma).
- [ ] Tests: DevicesPage en dos modos (tenant scope vs. platform scope).
- [ ] `/fe-check` pasa.

### T6 — LogsPage scope-aware con tabs

- [ ] Un USER no puede acceder a `/app/logs` (guard de ADMIN sigue activo).
- [ ] Un ADMIN con tenant activo ve dos tabs: "Operativos" y "Auditoría". Tab "Operativos"
      muestra los logs del tenant; "Auditoría" muestra los audit logs de plataforma.
- [ ] Un USER con tenant activo que llegara a la ruta (no debería) no ve la tab Auditoría.
- [ ] `/app/admin/logs` ya no existe: redirige a `/app/logs` o devuelve 404.
- [ ] `admin/logs` ha desaparecido del rail de admin en el shell de desktop.
- [ ] Si T4 aplicó dedup temporal, la dedup ha sido eliminada (el bug se resuelve de raíz).
- [ ] Tests: LogsPage en rol USER (un tab) y ADMIN (dos tabs).
- [ ] `/fe-check` pasa.

### T7 — ui-nav-select

- [ ] `UiNavSelectComponent` existe y está exportado desde `shared/ui/index.ts`.
- [ ] En viewport ≥ 1080px, al hacer click en el selector se abre un popover con la
      lista de destinos.
- [ ] En viewport < 1080px, al hacer click se abre un action sheet de Ionic.
- [ ] Al seleccionar un ítem, el `valueChange` se emite con el path del ítem.
- [ ] `DeviceTabNavComponent` usa `ui-nav-select` y los 9 destinos del dispositivo
      son accesibles desde el selector (no hay pestañas con scroll oculto).
- [ ] Tests del componente pasan.
- [ ] `/fe-check` pasa.

### T8 — ui-actions-menu y TopbarService overflow

- [ ] `UiActionsMenuComponent` existe y está exportado desde `shared/ui/index.ts`.
- [ ] `TopbarService` expone `primaryAction` y `overflowActions` como signals.
- [ ] Cuando solo hay `primaryAction`, el topbar muestra un único botón de acción.
- [ ] Cuando hay `overflowActions`, aparece un botón "···" adicional que en desktop
      abre un popover y en móvil un action sheet.
- [ ] Cada acción en el overflow invoca su handler al hacer click.
- [ ] Tests del componente pasan.
- [ ] `/fe-check` pasa.

### T9 — ui-list-row

- [ ] `UiListRowComponent` existe y está exportado desde `shared/ui/index.ts`.
- [ ] En viewport ≥ 1080px, las columnas definidas en `cols` se muestran a la derecha
      del título.
- [ ] En viewport < 1080px, las columnas se ocultan y se muestra el array `meta` debajo
      del título.
- [ ] `DevicesPage`, `AdminUsersPage`, `AdminCustomersPage` y `MonitoringPage` usan
      `ui-list-row` — no mantienen tabla y lista por separado.
- [ ] Tests de los componentes actualizados pasan.
- [ ] `/fe-check` pasa.

---

## Escenarios Gherkin de módulo

```gherkin
Feature: Settings scope reorganization

  Scenario: USER solo ve ajustes personales en Settings
    Given soy un usuario con rol USER y tenant activo
    When navego a /app/settings
    Then veo la sección "Tu cuenta" con Profile, Security, Notifications, Preferences
    And no veo la sección "Organización"
    And el breadcrumb muestra "Cuenta > Settings"

  Scenario: ADMIN ve ajustes de organización adicionales
    Given soy un usuario con rol ADMIN y tenant activo
    When navego a /app/settings
    Then veo la sección "Tu cuenta"
    And veo la sección "Organización" con Thresholds, API Keys y Config de la app

  Scenario: SUPERADMIN en plataforma no ve ajustes de organización
    Given soy SUPERADMIN sin tenant activo (modo plataforma)
    When navego a /app/settings
    Then veo solo la sección "Tu cuenta"
    And no veo la sección "Organización"

Feature: DevicesPage scope-aware

  Scenario: DevicesPage en modo tenant muestra solo los dispositivos del tenant
    Given soy ADMIN con tenant "Acme IoT" activo
    When navego a /app/devices
    Then veo solo los dispositivos de "Acme IoT"
    And no hay columna "Cliente"

  Scenario: DevicesPage en modo plataforma muestra todos los dispositivos
    Given soy SUPERADMIN sin tenant activo
    When navego a /app/devices
    Then veo dispositivos de todos los clientes
    And la columna "Cliente" es visible
    And hay un banner "Modo plataforma — viendo todos los clientes"
    And la ruta /app/admin/devices ya no existe

Feature: LogsPage con tabs

  Scenario: ADMIN ve los dos tipos de logs en una sola página
    Given soy ADMIN con tenant activo
    When navego a /app/logs
    Then veo dos tabs: "Operativos" y "Auditoría"
    And la tab activa por defecto es "Operativos"
    And la ruta /app/admin/logs ya no existe

Feature: Mobile drawer sin duplicados

  Scenario: El drawer móvil no muestra "Logs" dos veces
    Given soy ADMIN con tenant activo en móvil
    When abro el drawer "···"
    Then en la sección "Admin" veo "Logs" exactamente una vez
```
