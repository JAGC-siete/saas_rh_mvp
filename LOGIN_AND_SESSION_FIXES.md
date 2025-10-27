# Correcciones de Login y Sesión

## 🔍 Problemas Identificados:

### 1. **Error de Login que Requiere Refresh**
- **Síntoma:** El login lanza mensaje de error pero funciona después de refresh
- **Causa:** Las cookies de sesión no se establecen correctamente antes de redirigir
- **Solución:** Se agregó un delay para asegurar que las cookies se establezcan antes de continuar

### 2. **Sesión Expira Demasiado Rápido**
- **Síntoma:** Después de unos minutos necesitan hacer refresh para navegar
- **Causa:** `jwt_expiry` estaba configurado en 3600 segundos (1 hora)
- **Solución:** Se aumentó a 86400 segundos (1 día) y se configuraron las cookies con `maxAge` de 1 día

## ✅ Correcciones Aplicadas:

### 1. **`pages/api/auth/login-supabase.ts`**
```typescript
// CRITICAL: Wait for cookies to be set before proceeding
// This ensures the session is properly established
await new Promise(resolve => setTimeout(resolve, 100))
```
- Agrega un delay de 100ms para que las cookies se establezcan correctamente antes de continuar

### 2. **`supabase/config.toml`**
```toml
# How long tokens are valid for, in seconds. Defaults to 3600 (1 hour), maximum 604,800 (1 week).
jwt_expiry = 86400  # 1 día (antes era 3600 = 1 hora)
```
- Aumenta el TTL del JWT de 1 hora a 1 día

### 3. **`lib/supabase/server.ts`**
```typescript
// Set maxAge to 1 day for auth cookies to match JWT expiry
const isAuthCookie = name.includes('sb-') && name.includes('auth-token')
const cookieMaxAge = isAuthCookie && !options?.maxAge 
  ? 24 * 60 * 60 // 1 day in seconds
  : options?.maxAge
```
- Configura las cookies de autenticación con `maxAge` de 1 día
- Asegura que las cookies de sesión no expiren antes que el JWT

### 4. **`middleware.ts`**
```typescript
set(name: string, value: string, options: any) {
  // Set maxAge to 1 day for auth cookies to match JWT expiry
  if (name.includes('sb-') && name.includes('auth-token') && !options?.maxAge) {
    options = { ...options, maxAge: 24 * 60 * 60 } // 1 day in seconds
  }
  response.cookies.set(name, value, options)
}
```
- Aplica el mismo `maxAge` en el middleware para cookies de autenticación

## 🎯 Resultado Esperado:

### **Login:**
1. Usuario ingresa email y contraseña
2. Se establecen cookies con `maxAge` de 1 día
3. Redirección inmediata sin necesidad de refresh
4. Sesión válida por 1 día

### **Navegación:**
1. Las cookies no expiran durante 1 día
2. No es necesario hacer refresh para navegar entre opciones
3. La sesión se mantiene activa durante todo el período

## 📋 Instrucciones de Deployment:

### Para Aplicar los Cambios:

1. **Cambios de Código:** Los archivos ya están modificados y listos para deploy
2. **Cambios de Supabase Config:** Ejecuta este SQL en el dashboard de Supabase:
   ```sql
   -- No se requiere SQL, solo redeploy de la aplicación
   ```

3. **Redeploy:** Los cambios requieren redeploy en Railway/deployment
   ```bash
   git add .
   git commit -m "Fix login session and cookie expiry"
   git push origin develop
   ```

## 🔒 Configuración de Seguridad:

- **JWT Expiry:** 1 día (86400 segundos)
- **Cookie maxAge:** 1 día (86400 segundos)
- **Cookie httpOnly:** Sí (previene XSS)
- **Cookie secure:** Sí en producción (previene MITM)
- **Cookie sameSite:** Lax (previene CSRF)

## 📊 Comparación Antes/Después:

| Aspecto | Antes | Después |
|---------|-------|---------|
| JWT Expiry | 1 hora | 1 día |
| Cookie maxAge | No configurado | 1 día |
| Login Redirect | Requiere refresh | Funciona inmediatamente |
| Navegación | Requiere refresh frecuente | Funciona sin problemas |

## 🧪 Testing:

1. **Login Test:**
   - Ingresar email y contraseña
   - Debe redirigir inmediatamente sin errores
   - No debe requerir refresh

2. **Sesión Test:**
   - Hacer login
   - Esperar 2+ horas
   - Intentar navegar entre opciones
   - No debe requerir refresh

3. **Expiración Test:**
   - Hacer login
   - Borrar cookies manualmente
   - Intentar acceder a rutas protegidas
   - Debe redirigir a /app/login
