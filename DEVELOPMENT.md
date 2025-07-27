# Modo Desarrollo con Hot Reload 🔥

Este proyecto ahora soporta **Hot Module Replacement (HMR)** similar a Ionic, donde los cambios en el código frontend se reflejan automáticamente sin necesidad de recompilar.

## Diferencias entre Modos

### 🏭 Modo Producción (default)
```bash
make local-start
```
- Build compilado de Next.js
- Cambios requieren rebuild completo (`make local-recreate-app`)
- Más rápido en runtime
- Para pruebas finales y producción

### 🔥 Modo Desarrollo (Hot Reload)
```bash
make dev-start
```
- Next.js en modo dev (`npm run dev`)
- Cambios se reflejan automáticamente ⚡
- Hot Module Replacement activo
- Perfecto para desarrollo frontend

## Comandos Disponibles

### Iniciar Modo Desarrollo
```bash
make dev-start
```
Esto:
- Construye la imagen en modo desarrollo
- Monta tu código fuente como volumen
- Inicia Next.js con hot reload
- Cualquier cambio en `/app/src` se refleja automáticamente
- **Mantiene el túnel de Cloudflare activo** ✅
- Accesible desde:
  - Local: `https://iotpilotserver.test:9443`
  - Cloudflare: `https://dashboarddev.iotpilot.app`

### Ver Logs en Tiempo Real
```bash
make dev-logs
```

### Reiniciar
```bash
make dev-restart
```

### Detener
```bash
make dev-stop
```

### Abrir Shell en el Contenedor
```bash
make dev-shell
```

## Workflow Recomendado

1. **Desarrollo Frontend**: Usa `make dev-start`
   ```bash
   make dev-start
   # Edita archivos en app/src/
   # Los cambios se reflejan automáticamente
   ```

2. **Cambios en package.json o Dockerfile**: Requiere rebuild
   ```bash
   make dev-stop
   make dev-start  # Reconstruye automáticamente
   ```

3. **Testing Final**: Cambia a modo producción
   ```bash
   make dev-stop
   make local-start
   ```

## Notas Importantes

- ✅ **Cambios en `/app/src`**: Hot reload automático
- ✅ **Cambios en CSS/Tailwind**: Hot reload automático
- ⚠️ **Cambios en `package.json`**: Requiere `make dev-stop && make dev-start`
- ⚠️ **Cambios en `next.config.cjs`**: Requiere restart manual
- ⚠️ **Cambios en Prisma schema**: Requiere `make migrate`

## Comparación de Velocidad

| Operación | Producción | Desarrollo |
|-----------|-----------|------------|
| Cambio en componente React | ~60s (rebuild completo) | <2s (hot reload) ⚡ |
| Cambio en Tailwind CSS | ~60s (rebuild completo) | <1s (hot reload) ⚡ |
| Primera carga | ~10s | ~20s |

## Acceso y Red

### ✅ Cloudflare Tunnel
El modo desarrollo **SÍ funciona con el túnel de Cloudflare**. No hay diferencia en el acceso:

| URL | Modo Producción | Modo Desarrollo |
|-----|----------------|-----------------|
| Local | `https://iotpilotserver.test:9443` | `https://iotpilotserver.test:9443` |
| Cloudflare | `https://dashboarddev.iotpilot.app` | `https://dashboarddev.iotpilot.app` |

El modo desarrollo hereda todas las configuraciones de Traefik y Cloudflare del archivo base, así que puedes:
- Desarrollar localmente con hot reload
- Compartir el túnel de Cloudflare con otros
- Probar en dispositivos externos

### 🌐 Compartir Durante Desarrollo
```bash
make dev-start

# Comparte esta URL con tu equipo
# https://dashboarddev.iotpilot.app

# Ellos verán tus cambios en tiempo real (después del hot reload)
```

## Troubleshooting

### El hot reload no funciona
```bash
# Verifica que los volúmenes estén montados
docker inspect iotpilot-server-app-dev | grep -A 5 Mounts

# Reinicia el contenedor
make dev-restart
```

### Errores de TypeScript no desaparecen
```bash
# Limpia el cache de Next.js
docker exec iotpilot-server-app-dev rm -rf .next
make dev-restart
```

### Cambios en backend no se reflejan
Los cambios en archivos `.ts` del backend (fuera de `app/src/app` y `app/src/components`) pueden requerir restart:
```bash
make dev-restart
```
