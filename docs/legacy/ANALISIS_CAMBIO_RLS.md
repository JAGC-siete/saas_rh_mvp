# Análisis: Cambio que Rompió el Sistema de Empresa

## Comparación: Antes vs Después

### ANTES (6e4ea48e - 19 agosto 2025) ✅ CORRECTO
```typescript
// lib/useCompanyContext.ts
const supabase = createClient()
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('company_id, role')
  .eq('id', user.id)
  .single()
```

**Características:**
- ✅ Consulta directa desde cliente
- ✅ Respeta RLS con política `id = auth.uid()`
- ✅ Usa anon key (patrón recomendado por Supabase)
- ✅ Más rápido (menos latencia)
- ✅ Menos carga en servidor

### DESPUÉS (0df4e679 - 28 octubre 2025) ❌ INCORRECTO
```typescript
// lib/useCompanyContext.ts
const response = await fetch('/api/user-profile')
const { data: userProfile } = await response.json()
```

**Características:**
- ❌ Usa API que bypass RLS con `createAdminClient()`
- ❌ Rompe el modelo de seguridad recomendado
- ❌ Más lento (latencia adicional)
- ❌ Más carga en servidor
- ❌ Más puntos de fallo

## Problema Identificado

El commit `0df4e679` cambió de consulta directa a API porque "RLS bloqueaba". Pero el problema real era que las políticas RLS no estaban bien configuradas, no que necesitáramos bypass.

**Política RLS actual:**
```sql
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());
```

Esta política DEBERÍA funcionar. Si no funciona, el problema es:
1. El `auth.uid()` no está disponible en el cliente
2. La sesión no está correctamente autenticada
3. Hay un problema con cómo se inicializa el cliente

## Solución Correcta (Según Mejores Prácticas Supabase)

### Opción 1: Consulta Directa + RLS (Recomendado)
```typescript
// Cliente directo respetando RLS
const supabase = createClient() // Usa anon key + JWT del usuario
const { data } = await supabase
  .from('user_profiles')
  .select('company_id, role')
  .eq('id', user.id)
  .single()
```

**Ventajas:**
- ✅ Respeta el modelo de seguridad
- ✅ Más rápido
- ✅ Menos carga
- ✅ Patrón recomendado por Supabase para SPAs

### Opción 2: Backend con RLS (Si necesitas lógica adicional)
```typescript
// Backend respeta RLS usando el JWT del usuario
const supabase = createClient(req, res) // Respeta RLS
const { data } = await supabase
  .from('user_profiles')
  .select('company_id, role')
  .eq('id', user.id)
  .single()
```

**Ventajas:**
- ✅ Respeta RLS
- ✅ Permite lógica de negocio adicional
- ✅ Mejor para logging y validaciones

### Opción 3: Service Role Solo para Operaciones Privilegiadas
```typescript
// Solo para jobs administrativos, migraciones, etc.
const adminSupabase = createAdminClient() // Service role
// Usar SOLO para operaciones que no exponen data al usuario final
```

## Recomendación Final

**Restaurar consulta directa desde cliente** (como era antes) porque:
1. Es el patrón recomendado por Supabase
2. Respeta RLS correctamente
3. Es más eficiente
4. Si falla, arreglar las políticas RLS, no saltárselas

Si la consulta directa falla, verificar:
1. Que `createClient()` esté usando el JWT correcto
2. Que la sesión esté autenticada
3. Que las políticas RLS estén activas y correctas

