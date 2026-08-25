# Análisis de Error: Mail List Subscription

## Errores Observados

1. **500 Internal Server Error** en `/api/mail-list/subscribe`
2. **401 Unauthorized** en `/api/auth/heartbeat` (esperado, es endpoint público)
3. **CSP Violation** para Google Fonts (no relacionado)

---

## Problemas Identificados (de más obvio a menos evidente)

### 1. **MÁS OBVIO: RESEND_API_KEY no configurado o inválido**

**Ubicación**: `lib/notification-providers.ts:64` y `lib/email-service.ts:125-130`

**Problema**:
- `sendMailListConfirmationEmail` llama a `notificationManager.getConfigForCompany('default')`
- Esta función usa `process.env.RESEND_API_KEY` directamente
- Si `RESEND_API_KEY` es `undefined` o inválido, el email falla
- El error se captura silenciosamente en línea 127-130 de `subscribe.ts`, pero puede causar que el endpoint falle antes

**Evidencia**:
```typescript
// lib/notification-providers.ts:64
apiKey: process.env.RESEND_API_KEY,  // Puede ser undefined

// lib/email-service.ts:125-130
if (!provider.apiKey) {
  return {
    success: false,
    error: 'RESEND_API_KEY no configurado',
    errorCode: 'MAIL_CONFIG_MISSING'
  }
}
```

**Solución**:
- Verificar que `RESEND_API_KEY` esté configurado en variables de entorno
- Verificar que la API key sea válida en Resend
- Agregar validación temprana en el endpoint

---

### 2. **OBVIO: Tabla `mail_list_subscriptions` no existe o RLS bloquea**

**Ubicación**: `pages/api/mail-list/subscribe.ts:40-44`

**Problema**:
- El endpoint usa `supabaseAdmin` (service role), pero si la tabla no existe, fallará
- Si RLS está mal configurado, puede bloquear incluso con service role

**Evidencia**:
```typescript
// subscribe.ts:40-44
const { data: existing } = await supabaseAdmin
  .from('mail_list_subscriptions')
  .select('id, status')
  .eq('email', normalizedEmail)
  .single()
```

**Solución**:
- Verificar que la migración `20250115000000_mail_list_subscriptions.sql` se haya ejecutado
- Verificar que la tabla existe en Supabase
- Verificar permisos de service role

---

### 3. **MODERADO: Error silencioso en envío de email**

**Ubicación**: `pages/api/mail-list/subscribe.ts:118-130`

**Problema**:
- El envío de email está envuelto en try/catch que solo hace `console.warn`
- Si el email falla, el endpoint retorna éxito igual
- Pero si `getConfigForCompany` retorna `null`, lanza error antes del try/catch

**Evidencia**:
```typescript
// subscribe.ts:11-14 de mail-list-confirmation.ts
const config = await notificationManager.getConfigForCompany('default')
if (!config) {
  throw new Error('Email configuration not found')  // Esto causa 500
}
```

**Solución**:
- Manejar el caso cuando `config` es `null` más gracefully
- No fallar el endpoint si el email falla (ya está así, pero mejorar logging)

---

### 4. **MODERADO: `getConfigForCompany('default')` puede retornar null**

**Ubicación**: `lib/notification-providers.ts:50-90`

**Problema**:
- Si hay un error en `getConfigForCompany`, retorna `null`
- Esto causa que `sendMailListConfirmationEmail` lance error
- El error se propaga y causa 500

**Evidencia**:
```typescript
// notification-providers.ts:87-90
} catch (error) {
  console.error('Error en NotificationProviderManager:', error)
  return null  // Esto causa que mail-list-confirmation.ts lance error
}
```

**Solución**:
- Manejar el caso cuando `config` es `null` en `sendMailListConfirmationEmail`
- O asegurar que `getConfigForCompany` nunca retorne `null` para 'default'

---

### 5. **MENOS EVIDENTE: Rate limiting puede estar bloqueando**

**Ubicación**: `pages/api/mail-list/subscribe.ts:16`

**Problema**:
- El endpoint usa `withRateLimit('general')` que limita a 20 requests por 5 minutos
- Si el usuario hace muchas pruebas, puede estar bloqueado
- El rate limit retorna 429, no 500, pero verificar

**Evidencia**:
```typescript
// subscribe.ts:16
export default withRateLimit('general')(handler)

// rate-limiting.ts:25-29
general: {
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 requests por ventana
  message: 'Demasiadas solicitudes. Intente más tarde.'
}
```

**Solución**:
- Verificar logs para ver si hay rate limiting
- Ajustar límites si es necesario

---

### 6. **MENOS EVIDENTE: Validación de email puede fallar silenciosamente**

**Ubicación**: `pages/api/mail-list/subscribe.ts:26-34`

**Problema**:
- La validación de email retorna 400, no 500
- Pero si hay un error en el regex o normalización, puede causar 500

**Evidencia**:
```typescript
// subscribe.ts:36
const normalizedEmail = email.trim().toLowerCase()
// Si email es null/undefined, esto puede fallar antes del try/catch
```

**Solución**:
- Ya está validado antes, pero asegurar que siempre esté en try/catch

---

### 7. **MENOS EVIDENTE: Token de confirmación puede duplicarse**

**Ubicación**: `pages/api/mail-list/subscribe.ts:55-76`

**Problema**:
- El código intenta generar un token único con máximo 10 intentos
- Si después de 10 intentos sigue duplicado, retorna 500
- Muy poco probable, pero posible

**Evidencia**:
```typescript
// subscribe.ts:73-76
if (attempts >= maxAttempts) {
  console.error('Error generando token único después de múltiples intentos')
  return res.status(500).json({ error: 'Error interno del servidor.' })
}
```

**Solución**:
- Aumentar `maxAttempts` o usar UUID en lugar de randomBytes

---

## Checklist de Debugging

### Paso 1: Verificar Variables de Entorno
```bash
# Verificar que RESEND_API_KEY esté configurado
echo $RESEND_API_KEY

# En Railway/Producción, verificar en dashboard
```

### Paso 2: Verificar Tabla en Supabase
```sql
-- Ejecutar en Supabase SQL Editor
SELECT * FROM mail_list_subscriptions LIMIT 1;

-- Verificar estructura
\d mail_list_subscriptions;
```

### Paso 3: Verificar Logs del Servidor
```bash
# Buscar errores específicos
grep "Error en suscripción" logs
grep "RESEND_API_KEY" logs
grep "mail_list_subscriptions" logs
```

### Paso 4: Probar Endpoint Directamente
```bash
curl -X POST https://humanosisu.net/api/mail-list/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"landing"}'
```

### Paso 5: Verificar Configuración de Email
```typescript
// Agregar logging temporal en subscribe.ts
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'MISSING')
console.log('Config:', await notificationManager.getConfigForCompany('default'))
```

---

## Soluciones Aplicadas ✅

### 1. **Fix: `.single()` lanza error cuando no hay filas (PGRST116)**
**Problema**: `.single()` lanza error PGRST116 cuando no encuentra filas, causando 500
**Solución**: Cambiado a `.maybeSingle()` que retorna `null` en lugar de lanzar error
**Archivos modificados**:
- `pages/api/mail-list/subscribe.ts:40-44` - Cambiado a `.maybeSingle()` y manejo de error
- `pages/api/mail-list/subscribe.ts:64-68` - Cambiado a `.maybeSingle()` para verificación de token

### 2. **Mejorado manejo de errores en envío de email**
**Problema**: Errores de email no se logueaban con suficiente detalle
**Solución**: 
- Validación temprana de `RESEND_API_KEY` antes de intentar enviar
- Logging detallado con errorCode y contexto
- No falla el endpoint si el email falla (ya estaba así, mejorado logging)
**Archivos modificados**:
- `pages/api/mail-list/subscribe.ts:118-130` - Validación y logging mejorado
- `lib/emails/mail-list-confirmation.ts:9-20` - Validación de config y apiKey

### 3. **Logging mejorado para debugging**
**Problema**: Errores genéricos sin contexto
**Solución**: Agregado logging detallado con stack traces y contexto
**Archivos modificados**:
- `pages/api/mail-list/subscribe.ts:137-140` - Logging detallado de errores

## Soluciones Pendientes (verificar manualmente)

1. **Verificar que RESEND_API_KEY esté configurado en producción**
2. **Verificar que la migración `20250115000000_mail_list_subscriptions.sql` se haya ejecutado**
3. **Verificar que la tabla `mail_list_subscriptions` existe en Supabase**
4. **Verificar permisos de service role en Supabase**

