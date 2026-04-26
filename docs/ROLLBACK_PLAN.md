# Plan de Rollback a Versión Estable

## Situación Actual
- **Problema**: Error 502 Bad Gateway en producción
- **Urgencia**: Página caída con clientes afectados
- **Objetivo**: Revertir a versión funcional del 27 de noviembre

## Commit Objetivo

**Commit**: `fd903912`  
**Fecha**: Thu Nov 27 10:35:45 2025  
**Mensaje**: `feat(webhooks): procesar heartbeats con datos de empleado como asistencia`

### Por qué este commit es seguro:

1. ✅ **Usa `createPagesServerClient`** (versión funcional)
   - No tiene el cambio problemático a `createAdminClient`
   - Está antes del commit `c2f239cf` que introdujo el problema

2. ✅ **Antes de cambios problemáticos**:
   - `c2f239cf` (Nov 30) - Cambió a `createAdminClient` ❌
   - `5a1bbf74` (Nov 30) - Cambió `next.config.js` ❌
   - `fd903912` (Nov 27) - Versión funcional ✅

3. ✅ **Endpoint de webhooks funcional**:
   - Usa `formidable` correctamente
   - Procesa heartbeats con datos de empleado
   - No tiene dependencias problemáticas

## Opciones de Rollback

### Opción 1: Revert (Recomendado - Mantiene historial)
```bash
git revert --no-commit c2f239cf..HEAD
git commit -m "rollback: revertir a versión estable del 27 de noviembre"
```

### Opción 2: Reset Hard (Más agresivo - Pierde historial)
```bash
git reset --hard fd903912
```

### Opción 3: Checkout y crear nueva rama (Más seguro)
```bash
git checkout fd903912
git checkout -b hotfix/rollback-stable-version
# Hacer deploy desde esta rama
```

## Verificaciones Antes del Rollback

### 1. Verificar estado actual
```bash
git status
git log --oneline -5
```

### 2. Verificar que el commit objetivo existe
```bash
git show fd903912 --stat
```

### 3. Verificar configuración en el commit objetivo
```bash
git show fd903912:next.config.js | head -30
git show fd903912:pages/api/webhooks/attendance.ts | head -20
```

## Pasos Recomendados (Opción 3 - Más Segura)

1. **Crear rama de hotfix**:
```bash
git checkout fd903912
git checkout -b hotfix/rollback-nov-27
```

2. **Verificar que compile**:
```bash
npm run build
```

3. **Si compila correctamente, hacer deploy**:
```bash
# Push a Railway desde esta rama
git push origin hotfix/rollback-nov-27
```

4. **Una vez estable, merge a develop**:
```bash
git checkout develop
git merge hotfix/rollback-nov-27
```

## Riesgos del Rollback

### ⚠️ Cambios que se perderán:

1. **Integración del proxy Hikvision** (commits del 30 de noviembre):
   - `lib/hikvision/sdk.ts` - SDK integrado
   - `pages/api/hikvision/provision.ts` - Endpoint de provisionamiento
   - `pages/api/hikvision/status/` - Endpoint de status

2. **Mejoras de manejo de errores** (commits del 1 de diciembre):
   - Mejoras en `createAdminClient`
   - Try-catch en webhooks

3. **Configuración de Next.js**:
   - Cambios en `next.config.js`
   - Rewrite del favicon

### ✅ Lo que se mantiene:

1. **Funcionalidad core del webhook**:
   - Procesamiento de eventos Hikvision
   - Manejo de heartbeats
   - Guardado en `attendance_records`

2. **Configuración estable**:
   - `next.config.js` con `publicRuntimeConfig`
   - `createPagesServerClient` funcional

## Verificación Post-Rollback

1. ✅ Servidor inicia correctamente
2. ✅ Endpoint `/api/health` responde
3. ✅ Endpoint `/api/webhooks/attendance` funciona
4. ✅ No hay errores 502
5. ✅ Página principal carga correctamente

## Notas Importantes

- **No hay commits del 28 de noviembre** - El commit más cercano es del 27
- **El commit `fd903912` es funcional** - Usa `createPagesServerClient`
- **Después del rollback, se puede trabajar en los fixes** sin presión de clientes

## Comando Rápido (Si estás seguro)

```bash
# Crear rama desde commit estable
git checkout -b hotfix/rollback-stable fd903912

# Verificar build
npm run build

# Si todo está bien, hacer push
git push origin hotfix/rollback-stable
```






