# fe-nav-unification — Open Questions

## Q1 — ¿Eliminar o redirigir la ruta `/settings/system`?

**Pregunta:** Cuando se implemente T2 (split de system), la ruta `settings/system` queda
obsoleta. ¿La eliminamos o dejamos un redirect para no romper posibles bookmarks o
deep-links?

**Contexto:** La app está en migración (el Next.js legado sigue corriendo). No hay URLs
de settings indexadas externamente. La ruta se construyó hace pocas semanas.

**Opciones:**
- **A (preferida):** Redirect `settings/system → settings/preferences` en `settings.routes.ts`.
  Sin riesgo de 404 para bookmarks internos. Un `{ redirectTo: 'preferences' }` es trivial.
- **B:** Eliminar directamente. Más limpio. Si alguien tiene el bookmark, llega a `/settings`
  que redirige a `profile` — sin error fatal.

**Decisión pendiente.** Recomendación: Opción A, mínimo riesgo.

---

## Q2 — ¿Fusionar `admin/users` en una `UsersPage` scope-aware?

**Pregunta:** El prototipo propone también fusionar `admin/users` + (usuarios del tenant,
que hoy no existe como ruta separada) en una `/app/users` scope-aware. ¿Se incluye en
este módulo o se pospone?

**Contexto:** `AdminUsersPage` existe bajo `/app/admin/users`. No hay una página de
usuarios de tenant (`/app/users`). El prototipo lo propone como paralelo a devices.

**Bloqueador identificado:** La fusión requiere saber si el backend tiene un endpoint que
devuelva usuarios filtrados por tenant para un ADMIN no-superadmin. Si el endpoint de
`/api/admin/users` solo acepta SUPERADMIN, la fusión no es posible sin cambio de backend.

**Decisión pendiente.** Excluido de este módulo hasta verificar el endpoint. Si el backend
soporta filtrado por tenant, crear T10 en este módulo para ejecutarlo.

---

## Q3 — Guard de `logs` (tenant operativos) tras unificación en T6

**Pregunta:** Hoy `logs` tiene `canActivate: [roleGuard('ADMIN'), superadminTenantGuard]`.
Con la unificación en T6, la tab "Operativos" necesita tenant (superadminTenantGuard tiene
sentido), pero "Auditoría" no necesita tenant (es cross-tenant). ¿Qué guard va en la ruta?

**Opciones:**
- **A:** La ruta `logs` solo exige `roleGuard('ADMIN')`. La page decide internamente qué
  tab mostrar activa según si hay tenant o no. En modo plataforma se aterriza en "Auditoría".
- **B:** La ruta exige ambos guards pero "Auditoría" se muestra aunque no haya tenant
  (el `superadminTenantGuard` se modifica para no botar si la tab activa es "Auditoría").

**Decisión pendiente.** Opción A es más simple y coherente con el modelo del prototipo
("el scope es estado, no ruta").

---

## Q4 — Estructura del ui-nav-select para device-detail: grupos o lista plana

**Pregunta:** `DeviceTabNavComponent` agrupa los 9 destinos en 3 grupos (Monitor, Operate,
System) con un selector de grupo superior. ¿El `ui-nav-select` mantiene esta estructura
de grupos (separadores en el popover/sheet) o aplana todo en una lista?

**Contexto:** El prototipo muestra un dropdown plano con 9 ítems. La agrupación actual
fue una decisión de implementación para no tener 9 tabs horizontales. Con el dropdown,
la limitación de espacio desaparece y la agrupación es opcional.

**Opciones:**
- **A:** Lista plana de 9 ítems en el dropdown. El ítem activo se muestra en el selector.
  Más simple de implementar y usar.
- **B:** Grupos con separadores visuales en el dropdown (Monitor / Operate / System).
  Más orientadora para el usuario si los destinos son numerosos.

**Decisión pendiente.** Recomendación: Opción A para la primera iteración; añadir grupos
si el usuario feedback lo pide.

---

## Q5 — ¿Prioridad de T9 (ui-list-row) vs. páginas ya funcionales?

**Pregunta:** `DevicesPage` y `AdminUsersPage` ya tienen un modo table (desktop) y un
modo ion-list (móvil) que funcionan correctamente. ¿Es prioritario reescribirlos con
`ui-list-row` ahora, o solo aplicar el componente a páginas nuevas?

**Contexto:** El objetivo de `ui-list-row` es eliminar el doble mantenimiento a futuro.
Si las páginas actuales no tienen bugs visuales en ningún viewport, el ROI de la refactor
inmediata es bajo.

**Opciones:**
- **A:** Aplicar `ui-list-row` solo a páginas nuevas (de momento ninguna en este módulo).
  Posponer la refactor de páginas existentes a un PR de limpieza separado.
- **B:** Refactorizar todas las páginas listadas en T9 como parte de este módulo.

**Decisión pendiente.** Recomendación: Opción A — T9 crea el componente pero no lo
impone retroactivamente si las páginas existentes no tienen bugs.
