# 🔧 CONFIGURACIÓN CORRECTA DE SUPABASE OTP

## ❌ **MI ERROR:**
No investigué que Supabase por defecto envía **MAGIC LINKS**, no códigos OTP. 

## ✅ **SOLUCIÓN CORRECTA:**

### **PASO 1: Configurar Template de Email en Supabase**

1. **Ir a Supabase Dashboard** → Tu proyecto → **Authentication** → **Email Templates**

2. **Seleccionar "Magic Link"** template

3. **Reemplazar el contenido** con este template para OTP:

```html
<h2>Código de verificación - Portal de Empleados</h2>
<p>Hola,</p>
<p>Tu código de verificación es:</p>
<h1 style="font-size: 32px; color: #2563eb; letter-spacing: 4px;">{{ .Token }}</h1>
<p>Este código expira en <strong>5 minutos</strong>.</p>
<p>Si no solicitaste este código, ignora este email.</p>
<hr>
<p><small>Paragon Honduras - Sistema de RH</small></p>
```

4. **Guardar cambios**

### **PASO 2: Verificar Configuración Auth**

En **Authentication** → **Settings**:
- ✅ **Email OTP** debe estar habilitado
- ⚠️ **Magic Link** puede estar habilitado (usaremos OTP template)

### **PASO 3: El Código Ya Está Correcto**

```typescript
// ✅ ESTO YA FUNCIONA - solo necesita el template correcto
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: { 
    shouldCreateUser: false 
  }
})

// ✅ VERIFICACIÓN TAMBIÉN CORRECTA
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token: code, // Código de 6 dígitos que llegará al email
  type: 'email'
})
```

## 🎯 **RESULTADO:**

Después de configurar el template:
1. Usuario ingresa email
2. Supabase envía **código de 6 dígitos** (no magic link)
3. Usuario ingresa código
4. Sistema verifica y crea sesión

## 🚨 **NOTA IMPORTANTE:**

**SIN** configurar el template = Magic links
**CON** template correcto = Códigos OTP

La API funciona igual, solo cambia lo que recibe el usuario por email.
