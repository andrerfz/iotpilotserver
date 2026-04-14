# 🐶 Configuración de Husky (Docker-Based)

Husky está configurado para ejecutarse **dentro de Docker**, garantizando que todos los desarrolladores tengan el mismo entorno de pruebas sin necesidad de instalar dependencias localmente.

## ✅ Ya está configurado

Los hooks de Husky ya están configurados en `.husky/` y Git está configurado para usarlos. **No necesitas hacer nada más.**

## Cómo funciona

Cuando hagas commit o push, los hooks ejecutan comandos dentro del contenedor Docker:

- `git commit` → Ejecuta lint + type-check en Docker (rápido ~5-10s)
- `git push` → ⚠️ Tests temporalmente deshabilitados (ver sección "Estado Actual")

### Estado Actual

**Pre-commit**: ✅ Funcionando
- Lint
- Type-check

**Pre-push**: ⚠️ Tests deshabilitados temporalmente
- Los tests tienen problemas de resolución de rutas desde la migración DDD
- Necesitan ser actualizados para que vitest resuelva correctamente `@/lib/*`
- Ver `.husky/pre-push` para re-habilitarlos después de arreglados

## Prerequisito

**IMPORTANTE:** El contenedor Docker debe estar corriendo antes de hacer commit/push:

```bash
make dev-start      # Recomendado: con hot reload
# o
make local-start    # Alternativa
```

Si el contenedor no está corriendo, el hook te mostrará un mensaje indicándote que lo inicies.

## ✅ ¡Listo!

Ahora cuando hagas:
- `git commit` → Corre lint + type-check en Docker (rápido) ✅
- `git push` → Por ahora solo verifica que Docker esté corriendo ⚠️

Si algo falla, el commit/push se bloquea automáticamente.

### ¿Por qué esta estructura?

- **Pre-commit rápido**: Solo lint y type-check para commits rápidos e iterativos
- **Pre-push completo**: Diseñado para correr todos los tests, pero temporalmente deshabilitado
- **Pendiente**: Arreglar configuración de vitest para re-habilitar tests en pre-push

## 💰 Ahorro de Créditos

Con Husky instalado:
- ✅ Tests en Docker: **gratis** y **rápidos** (2-3 min)
- ✅ GitHub Actions: Solo corre cuando TODO ya pasó localmente
- 💰 Ahorras ~90% de créditos GitHub Actions

## Comandos útiles

Ver los hooks configurados:
```bash
ls -la .husky/
```

Ver configuración de Git:
```bash
git config --get core.hooksPath
```

Ejecutar tests manualmente (como lo haría el hook):
```bash
make lint
make test-unit
make test-integration
make test-e2e
```

## Desactivar temporalmente

Si necesitas hacer un commit sin checks:
```bash
git commit --no-verify -m "WIP: work in progress"
```

## Arquitectura

Los hooks están en la raíz del proyecto (`.husky/`) y ejecutan comandos del `Makefile` que a su vez ejecutan comandos dentro del contenedor Docker `iotpilot-server-app`. Esto garantiza:

1. **Cero dependencias locales** - No necesitas npm install en tu máquina
2. **Entorno consistente** - Todos los desarrolladores usan la misma imagen Docker
3. **Tests confiables** - Los tests se ejecutan en el mismo entorno que producción
