# PLAN DE CONSOLIDACIÓN - FASE 1: AUTENTICACIÓN
## 3 Etapas para Unificar y Mejorar los Sistemas de Autenticación

---

## 📋 RESUMEN EJECUTIVO

**Objetivo:** Consolidar los 4 sistemas de autenticación bajo Supabase Auth, eliminar vulnerabilidades críticas y mejorar la seguridad.

**Duración estimada:** 2-3 semanas
**Prioridad:** CRÍTICA

---

## 🎯 ETAPA 1: INFRAESTRUCTURA Y OTP EN BASE DE DATOS
**Duración:** 3-5 días  
**Objetivo:** Crear la base sólida para consolidación

### 1.1 Crear tabla `otp_codes` en base de datos
**Archivo:** `supabase/migrations/YYYYMMDDHHMMSS_create_otp_codes_table.sql`

```sql
-- Tabla para almacenar códigos OTP
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- Código de 6 dígitos
    purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'password_reset', 'verification')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para búsqueda rápida
    CONSTRAINT unique_active_otp UNIQUE(email, purpose) WHERE verified_at IS NULL AND expires_at > NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_employee_id ON otp_codes(employee_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_codes(email, purpose);

-- RLS: Solo el sistema puede insertar/leer OTPs
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage OTP codes" ON otp_codes
    FOR ALL USING (true);

-- Función para limpiar OTPs expirados (ejecutar cada hora)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_codes 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
```

**Tareas:**
- [ ] Crear migración SQL
- [ ] Ejecutar migración en desarrollo
- [ ] Verificar índices y RLS

### 1.2 Refactorizar `lib/employee-otp.ts` para usar base de datos
**Archivo:** `lib/employee-otp.ts`

**Cambios principales:**
- Eliminar `Map` en memoria
- Usar `createAdminClient()` para insertar/leer OTPs
- Implementar rate limiting por email usando la tabla
- Mantener compatibilidad con API actual

**Funciones a modificar:**
- `sendOtp()`: Insertar en `otp_codes` table
- `verifyOtp()`: Leer y verificar desde `otp_codes` table
- Agregar función `cleanupExpiredOtps()` para limpieza periódica

**Tareas:**
- [ ] Modificar `sendOtp()` para usar base de datos
- [ ] Modificar `verifyOtp()` para usar base de datos
- [ ] Implementar rate limiting por email (max 3 intentos en 15 min)
- [ ] Agregar logging de intentos fallidos
- [ ] Probar flujo completo de OTP

### 1.3 Crear helper unificado de autenticación
**Archivo:** `lib/auth/unified-auth.ts` (NUEVO)

**Propósito:** Centralizar lógica común de autenticación

**Funciones:**
```typescript
// Tipos de autenticación soportados
type AuthMethod = 'password' | 'otp' | 'magic_link' | 'social'

// Resultado unificado de autenticación
interface UnifiedAuthResult {
  success: boolean
  user?: any
  session?: any
  userProfile?: any
  method: AuthMethod
  error?: string
}

// Función principal
async function authenticateUser(
  email: string,
  method: AuthMethod,
  credentials: PasswordCredentials | OtpCredentials
): Promise<UnifiedAuthResult>
```

**Tareas:**
- [ ] Crear archivo `lib/auth/unified-auth.ts`
- [ ] Definir interfaces y tipos
- [ ] Implementar función base de autenticación
- [ ] Integrar con Supabase Auth
- [ ] Agregar logging estructurado

---

## 🔒 ETAPA 2: ELIMINAR CONTRASEÑA DETERMINÍSTICA Y RATE LIMITING
**Duración:** 4-6 días  
**Objetivo:** Eliminar vulnerabilidades críticas y proteger endpoints

### 2.1 Eliminar contraseña determinística de empleados
**Archivo:** `pages/api/employees/auth/login.ts`

**Problema actual:**
- Líneas 167-227: Contraseña `emp_{id}_paragon` es predecible
- Se hace login con contraseña después de crear usuario

**Solución:**
1. **Opción A (Recomendada):** Usar Magic Links de Supabase
   - Empleado solicita OTP
   - Al verificar OTP, generar Magic Link
   - Redirigir a Magic Link para crear sesión sin contraseña

2. **Opción B:** Crear sesión directamente después de verificar OTP
   - Usar `adminSupabase.auth.admin.generateLink()` para crear sesión
   - No crear contraseña en absoluto

**Implementación (Opción A):**

```typescript
// Después de verificar OTP (línea 80)
const otpVerification = verifyOtp(email, code)

if (!otpVerification.success) {
  return res.status(401).json({...})
}

// Obtener empleado
const { data: employee } = await adminSupabase...

// Buscar o crear usuario en auth.users SIN contraseña
let authUser = await findOrCreateAuthUser(email, employee)

// Generar Magic Link para crear sesión
const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
  type: 'magiclink',
  email: email,
  options: {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
  }
})

// Crear sesión usando el link
const { data: sessionData } = await supabase.auth.signInWithPassword({
  email: email,
  password: linkData.properties.action_link // Usar el link como "password"
})
```

**Tareas:**
- [ ] Eliminar generación de contraseña determinística
- [ ] Implementar creación de usuario sin contraseña
- [ ] Usar Magic Links o sesión directa
- [ ] Actualizar flujo de login de empleados
- [ ] Probar flujo completo
- [ ] Actualizar documentación

### 2.2 Implementar rate limiting en todos los endpoints de auth
**Archivos a modificar:**
- `pages/api/auth/login-supabase.ts`
- `pages/api/employees/auth/login.ts`
- `pages/api/auth/register-b2c.ts`
- `pages/api/auth/register.ts`

**Usar:** `lib/rate-limit.ts` (ya existe pero mejorarlo)

**Mejoras necesarias:**
1. Mover rate limiting a base de datos (usar tabla `rate_limit_requests`)
2. Rate limiting por IP + Email (más preciso)
3. Diferentes límites según tipo de endpoint:
   - Login: 5 intentos / 15 min
   - Registro: 3 intentos / hora
   - OTP send: 3 intentos / 15 min
   - OTP verify: 5 intentos / 15 min

**Implementación:**

```typescript
// lib/auth/rate-limit-auth.ts (NUEVO)
import { createAdminClient } from '../supabase/server'

export async function checkAuthRateLimit(
  identifier: string, // email o IP
  type: 'login' | 'register' | 'otp_send' | 'otp_verify'
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const adminSupabase = createAdminClient()
  
  const limits = {
    login: { max: 5, windowMs: 15 * 60 * 1000 },
    register: { max: 3, windowMs: 60 * 60 * 1000 },
    otp_send: { max: 3, windowMs: 15 * 60 * 1000 },
    otp_verify: { max: 5, windowMs: 15 * 60 * 1000 }
  }
  
  const limit = limits[type]
  const windowStart = new Date(Date.now() - limit.windowMs)
  
  // Contar intentos en ventana
  const { count } = await adminSupabase
    .from('rate_limit_requests')
    .select('*', { count: 'exact', head: true })
    .eq('key', `${type}:${identifier}`)
    .gte('timestamp', windowStart.toISOString())
  
  if (count >= limit.max) {
    return { allowed: false, retryAfter: limit.windowMs / 1000 }
  }
  
  // Registrar intento
  await adminSupabase.from('rate_limit_requests').insert({
    key: `${type}:${identifier}`,
    ip_address: identifier.includes('@') ? null : identifier,
    method: 'POST',
    url: `/api/auth/${type}`,
    success: true
  })
  
  return { allowed: true }
}
```

**Tareas:**
- [ ] Crear `lib/auth/rate-limit-auth.ts`
- [ ] Implementar `checkAuthRateLimit()`
- [ ] Agregar rate limiting a `login-supabase.ts`
- [ ] Agregar rate limiting a `employees/auth/login.ts`
- [ ] Agregar rate limiting a `register-b2c.ts`
- [ ] Agregar rate limiting a `register.ts`
- [ ] Probar límites funcionan correctamente
- [ ] Agregar headers de rate limit en respuestas

### 2.3 Mejorar manejo de errores y logging
**Archivos:** Todos los endpoints de auth

**Mejoras:**
- Mensajes de error consistentes
- No exponer información sensible
- Logging estructurado de eventos de auth
- Registrar intentos fallidos en `audit_logs`

**Tareas:**
- [ ] Crear función `logAuthEvent()` en `lib/auth/audit.ts`
- [ ] Actualizar todos los endpoints para usar logging estructurado
- [ ] Estandarizar mensajes de error
- [ ] Agregar eventos a `audit_logs` table

---

## 🔄 ETAPA 3: UNIFICAR SISTEMAS BAJO SUPABASE AUTH
**Duración:** 5-7 días  
**Objetivo:** Consolidar todos los sistemas en una arquitectura unificada

### 3.1 Crear servicio unificado de autenticación
**Archivo:** `lib/auth/auth-service.ts` (NUEVO)

**Propósito:** Servicio central que maneja todos los tipos de autenticación

**Estructura:**

```typescript
// lib/auth/auth-service.ts
export class AuthService {
  // Login Admin/Empresa con password
  async loginWithPassword(email: string, password: string): Promise<AuthResult>
  
  // Login Empleado con OTP
  async loginWithOtp(email: string, code: string): Promise<AuthResult>
  
  // Registro B2C
  async registerB2C(email: string, password: string, fullName: string): Promise<AuthResult>
  
  // Registro B2B
  async registerB2B(email: string, password: string, fullName: string, companyName: string): Promise<AuthResult>
  
  // Verificar permisos y roles
  async verifyUserAccess(userId: string): Promise<AccessResult>
  
  // Crear sesión
  async createSession(userId: string, session: any, companyId?: string): Promise<SessionResult>
}
```

**Tareas:**
- [ ] Crear clase `AuthService`
- [ ] Implementar `loginWithPassword()`
- [ ] Implementar `loginWithOtp()`
- [ ] Implementar `registerB2C()`
- [ ] Implementar `registerB2B()`
- [ ] Implementar `verifyUserAccess()`
- [ ] Implementar `createSession()`
- [ ] Agregar tests unitarios

### 3.2 Refactorizar endpoints para usar AuthService
**Archivos a refactorizar:**
- `pages/api/auth/login-supabase.ts` → Usar `AuthService.loginWithPassword()`
- `pages/api/employees/auth/login.ts` → Usar `AuthService.loginWithOtp()`
- `pages/api/auth/register-b2c.ts` → Usar `AuthService.registerB2C()`
- `pages/api/auth/register.ts` → Usar `AuthService.registerB2B()`

**Estructura de endpoint refactorizado:**

```typescript
// Ejemplo: pages/api/auth/login-supabase.ts
import { AuthService } from '../../../lib/auth/auth-service'
import { checkAuthRateLimit } from '../../../lib/auth/rate-limit-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  // Validación
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || 'unknown'
  const rateLimitCheck = await checkAuthRateLimit(email, 'login')
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({
      error: 'Demasiados intentos',
      retryAfter: rateLimitCheck.retryAfter
    })
  }

  // Autenticación usando servicio unificado
  const authService = new AuthService()
  const result = await authService.loginWithPassword(email, password)

  if (!result.success) {
    return res.status(401).json({ error: result.error })
  }

  return res.status(200).json({
    success: true,
    user: result.user,
    session: result.session,
    userProfile: result.userProfile
  })
}
```

**Tareas:**
- [ ] Refactorizar `login-supabase.ts`
- [ ] Refactorizar `employees/auth/login.ts`
- [ ] Refactorizar `register-b2c.ts`
- [ ] Refactorizar `register.ts`
- [ ] Probar cada endpoint individualmente
- [ ] Probar flujos completos end-to-end

### 3.3 Unificar verificación de permisos y roles
**Archivo:** `lib/auth/permissions.ts` (NUEVO o mejorar existente)

**Propósito:** Centralizar lógica de permisos y roles

**Funciones:**
```typescript
// Verificar si usuario tiene acceso válido
async function verifyUserAccess(userId: string): Promise<AccessResult>

// Obtener roles válidos de configuración centralizada
function getValidRoles(): string[]

// Verificar si rol es válido
function isValidRole(role: string): boolean

// Verificar permisos específicos
function hasPermission(userProfile: UserProfile, permission: string): boolean
```

**Tareas:**
- [ ] Crear/mejorar `lib/auth/permissions.ts`
- [ ] Mover lista de roles a configuración centralizada
- [ ] Unificar lógica de verificación de permisos
- [ ] Eliminar código duplicado de verificación
- [ ] Actualizar todos los endpoints para usar funciones unificadas

### 3.4 Actualizar frontend para usar endpoints unificados
**Archivos:**
- `lib/auth.tsx` (AuthProvider)
- `components/AuthForm.tsx`
- `pages/app/login.tsx`
- Componentes de login de empleados

**Cambios:**
- Asegurar que todos usen los endpoints refactorizados
- Manejar errores de forma consistente
- Actualizar tipos TypeScript

**Tareas:**
- [ ] Revisar `lib/auth.tsx`
- [ ] Actualizar componentes de login
- [ ] Probar flujos en frontend
- [ ] Verificar manejo de errores

### 3.5 Documentación y testing
**Tareas:**
- [ ] Documentar nueva arquitectura de autenticación
- [ ] Crear diagrama de flujo de autenticación
- [ ] Escribir tests de integración para cada flujo
- [ ] Actualizar README con cambios
- [ ] Crear guía de migración para desarrolladores

---

## 📊 CHECKLIST DE COMPLETACIÓN

### Etapa 1: Infraestructura
- [ ] Tabla `otp_codes` creada y migrada
- [ ] `lib/employee-otp.ts` refactorizado para usar BD
- [ ] `lib/auth/unified-auth.ts` creado
- [ ] Tests de OTP pasando

### Etapa 2: Seguridad
- [ ] Contraseña determinística eliminada
- [ ] Rate limiting implementado en todos los endpoints
- [ ] Rate limiting usando base de datos
- [ ] Logging estructurado implementado
- [ ] Tests de rate limiting pasando

### Etapa 3: Consolidación
- [ ] `AuthService` creado e implementado
- [ ] Todos los endpoints refactorizados
- [ ] Verificación de permisos unificada
- [ ] Frontend actualizado
- [ ] Documentación completa
- [ ] Tests de integración pasando

---

## 🚨 RIESGOS Y MITIGACIONES

### Riesgo 1: Romper flujos existentes
**Mitigación:** 
- Mantener endpoints existentes durante transición
- Implementar feature flags
- Testing exhaustivo antes de deploy

### Riesgo 2: Performance de OTP en base de datos
**Mitigación:**
- Usar índices apropiados
- Implementar cache si es necesario
- Monitorear queries lentas

### Riesgo 3: Empleados sin acceso durante migración
**Mitigación:**
- Migración gradual por empresa
- Mantener sistema antiguo como fallback
- Comunicación proactiva a usuarios

---

## 📈 MÉTRICAS DE ÉXITO

1. **Seguridad:**
   - 0 contraseñas determinísticas en código
   - Rate limiting activo en 100% de endpoints de auth
   - 0 vulnerabilidades críticas de autenticación

2. **Consolidación:**
   - 1 servicio unificado de autenticación
   - 0 código duplicado de verificación de permisos
   - 100% de endpoints usando `AuthService`

3. **Performance:**
   - OTP queries < 100ms
   - Rate limit checks < 50ms
   - Login completo < 500ms

---

## Operación: usuarios y contraseñas (super admin)

Referencia breve para el panel **Usuarios** (`/app/admin/users`).

- **Alta de usuario:** usar **Invitar**, completar email, empresa, rol y contraseña (mínimo **8 caracteres**). El sistema valida la misma regla en servidor. Conviene comunicar la contraseña al usuario por un canal seguro aparte del correo de bienvenida si aplica.
- **Recuperar acceso (usuario olvidó su contraseña):** si el producto expone recuperación por correo para ese tipo de cuenta, usarla; si no, el super admin puede **Restablecer contraseña** desde el listado: modal con confirmación e indicador de fortaleza (no usar contraseñas triviales).
- **Reset vs invitación:** el **reset** es para cuentas que ya existen en Auth y hay que definir una contraseña nueva de inmediato. La **invitación/alta** es para crear la cuenta vinculada a empresa y rol; a medio plazo se puede sustituir por enlace de invitación sin contraseña en claro.
- **Auditoría:** altas y resets desde super admin quedan registrados como acciones de auditoría (`user_created`, `user_password_reset_by_admin`) con actor y `user_id` objetivo, sin almacenar la contraseña.
- **Portal empleado (OTP):** las respuestas al pedir código no indican si el correo existe o no (mensaje neutro), para reducir enumeración de cuentas.

---

## 🔄 PRÓXIMOS PASOS (Post-Fase 1)

Después de completar estas 3 etapas, considerar:
- Fase 2: Agregar 2FA para admins
- Fase 3: Implementar Magic Links
- Fase 4: Social Login (Google, Microsoft)
- Fase 5: SSO con SAML/OIDC

---

**Última actualización:** 2025-01-02  
**Responsable:** Equipo de Desarrollo  
**Estado:** Pendiente de inicio















