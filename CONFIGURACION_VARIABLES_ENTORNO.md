# 🔧 CONFIGURACIÓN DE VARIABLES DE ENTORNO
## Sistema HR SaaS - Guía Completa

### 📋 Descripción

Esta guía te ayuda a configurar correctamente todas las variables de entorno necesarias para el sistema HR SaaS. Incluye scripts automáticos y configuración manual.

---

## 🚀 CONFIGURACIÓN AUTOMÁTICA (RECOMENDADA)

### 1. Ejecutar Configurador Automático
```bash
# Crear automáticamente el archivo .env.local
node scripts/setup-env.js
```

**Este script:**
- ✅ Crea el archivo `.env.local` automáticamente
- ✅ Genera secretos únicos y seguros
- ✅ Configura todas las variables necesarias
- ✅ Verifica la configuración

### 2. Verificar Configuración
```bash
# Verificar que todo esté configurado correctamente
node scripts/check-env-vars.js
```

---

## 📝 CONFIGURACIÓN MANUAL

### 1. Crear Archivo .env.local

Crear un archivo llamado `.env.local` en la raíz del proyecto:

```bash
touch .env.local
```

### 2. Configurar Variables Críticas

Copiar y pegar el siguiente contenido en `.env.local`:

```bash
# 🔐 SUPABASE CONFIGURATION
NEXT_PUBLIC_SUPABASE_URL=https://fwyxmovfrzauebiqxchz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_jwt_token_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_jwt_token_here

# 🔑 JWT CONFIGURATION
JWT_SECRET=tu_jwt_secret_unico_y_seguro_aqui

# 🌐 SITE CONFIGURATION
NEXT_PUBLIC_SITE_URL=https://humanosisu.net

# 🗄️ DATABASE CONFIGURATION
DATABASE_URL=postgresql://postgres:your_database_password_here@aws-0-us-east-2.pooler.supabase.com:6543/postgres

# 🔒 SESSION CONFIGURATION
SESSION_SECRET=tu_session_secret_unico_y_seguro_aqui

# 🚀 ENVIRONMENT
NODE_ENV=development
PORT=3000
```

### 3. Generar Secretos Únicos

**IMPORTANTE:** Cambiar los valores de `JWT_SECRET` y `SESSION_SECRET` por secretos únicos y seguros:

```bash
# Generar JWT_SECRET (64 caracteres aleatorios)
openssl rand -hex 32

# Generar SESSION_SECRET (64 caracteres aleatorios)
openssl rand -hex 32
```

**Ejemplo de secretos generados:**
```bash
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
SESSION_SECRET=f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
```

---

## 📊 VARIABLES REQUERIDAS

### 🔴 CRÍTICAS (El sistema no funciona sin ellas)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase | `https://fwyxmovfrzauebiqxchz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | `your_supabase_jwt_token_here` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase | `your_supabase_jwt_token_here` |
| `JWT_SECRET` | Clave secreta para JWT | `tu_jwt_secret_unico_y_seguro_aqui` |
| `SESSION_SECRET` | Clave secreta para sesiones | `tu_session_secret_unico_y_seguro_aqui` |
| `NEXT_PUBLIC_SITE_URL` | URL del sitio | `https://humanosisu.net` |
| `DATABASE_URL` | URL de conexión a la base de datos | `postgresql://postgres:password@host:port/database` |

### 🟡 IMPORTANTES (El sistema funciona pero con configuración básica)

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto del servidor | `3000` |

### 🟢 OPCIONALES (Funcionalidades adicionales)

| Variable | Descripción | Uso |
|----------|-------------|-----|
| `REDIS_URL` | URL de Redis | Sesiones y cache |
| `SMTP_HOST` | Servidor SMTP | Notificaciones por email |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | Analytics |

---

## 🔍 VERIFICACIÓN DE CONFIGURACIÓN

### 1. Verificación Automática
```bash
# Verificar todas las variables
node scripts/check-env-vars.js
```

### 2. Verificación Manual
```bash
# Verificar que el archivo existe
ls -la .env.local

# Verificar contenido (sin mostrar secretos)
grep -E "^(NEXT_PUBLIC_|NODE_ENV|PORT)=" .env.local
```

### 3. Verificación en el Código
```bash
# Probar que las variables se cargan correctamente
node -e "
require('dotenv').config({ path: '.env.local' });
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Faltante');
console.log('JWT Secret:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ Faltante');
"
```

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### ❌ Error: "Cannot find module 'dotenv'"
```bash
# Instalar dotenv
npm install dotenv
```

### ❌ Error: "Supabase URL is not configured"
```bash
# Verificar que NEXT_PUBLIC_SUPABASE_URL esté en .env.local
grep "NEXT_PUBLIC_SUPABASE_URL" .env.local
```

### ❌ Error: "JWT_SECRET is not configured"
```bash
# Generar y configurar JWT_SECRET
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env.local
```

### ❌ Error: "Service role key is missing"
```bash
# Verificar que SUPABASE_SERVICE_ROLE_KEY esté configurada
grep "SUPABASE_SERVICE_ROLE_KEY" .env.local
```

### ❌ Error: "Database connection failed"
```bash
# Verificar DATABASE_URL
grep "DATABASE_URL" .env.local
```

---

## 🔄 DIFERENTES ENTORNOS

### Desarrollo Local
```bash
NODE_ENV=development
PORT=3000
DEBUG=true
```

### Producción (Railway/Vercel)
```bash
NODE_ENV=production
PORT=3000
DEBUG=false
```

### Staging
```bash
NODE_ENV=staging
PORT=3000
DEBUG=false
```

---

## 🛡️ SEGURIDAD

### ✅ Buenas Prácticas
- ✅ Usar secretos únicos y seguros
- ✅ No subir `.env.local` a Git
- ✅ Usar variables de entorno del servidor en producción
- ✅ Rotar secretos regularmente

### ❌ Malas Prácticas
- ❌ Usar secretos por defecto
- ❌ Subir archivos `.env` a Git
- ❌ Compartir secretos en código
- ❌ Usar el mismo secreto en todos los entornos

---

## 📝 EJEMPLOS DE CONFIGURACIÓN

### Configuración Mínima
```bash
# .env.local (configuración mínima)
NEXT_PUBLIC_SUPABASE_URL=https://fwyxmovfrzauebiqxchz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_jwt_token_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_jwt_token_here
JWT_SECRET=mi_jwt_secreto_unico_y_seguro_2025
SESSION_SECRET=mi_session_secreto_unico_y_seguro_2025
NEXT_PUBLIC_SITE_URL=https://humanosisu.net
DATABASE_URL=postgresql://postgres:password@host:port/database
NODE_ENV=development
PORT=3000
```

### Configuración Completa
```bash
# .env.local (configuración completa)
NEXT_PUBLIC_SUPABASE_URL=https://fwyxmovfrzauebiqxchz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_jwt_token_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_jwt_token_here
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
SESSION_SECRET=f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
NEXT_PUBLIC_SITE_URL=https://humanosisu.net
DATABASE_URL=postgresql://postgres:your_database_password_here@aws-0-us-east-2.pooler.supabase.com:6543/postgres
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
DEBUG=false
```

---

## 🎯 PRÓXIMOS PASOS

### 1. Configurar Variables
```bash
# Opción A: Automático
node scripts/setup-env.js

# Opción B: Manual
# Crear .env.local con el contenido proporcionado
```

### 2. Verificar Configuración
```bash
node scripts/check-env-vars.js
```

### 3. Probar Sistema
```bash
npm run dev
# Ir a http://localhost:3000
```

### 4. Probar Funcionalidades Críticas
- ✅ Login: http://localhost:3000/login
- ✅ Asistencia: http://localhost:3000/registrodeasistencia
- ✅ Nómina: http://localhost:3000/payroll
- ✅ Dashboard: http://localhost:3000/dashboard

---

## 📞 SOPORTE

### Scripts Disponibles
- `scripts/setup-env.js` - Configurador automático
- `scripts/check-env-vars.js` - Verificador de variables
- `scripts/fix-integration-issues.js` - Correcciones de integración
- `scripts/verify-integration-fixes.js` - Verificación de correcciones

### Archivos de Referencia
- `AUDITORIA_INTEGRACION_FRONTEND_BACKEND.md` - Reporte de auditoría
- `AUDITORIA_INTEGRACION_README.md` - Guía de auditoría
- `CONFIGURACION_VARIABLES_ENTORNO.md` - Esta guía

### Comandos Útiles
```bash
# Verificar estado actual
node scripts/check-env-vars.js

# Configurar desde cero
node scripts/setup-env.js

# Ejecutar auditoría completa
node scripts/fix-integration-issues.js
node scripts/verify-integration-fixes.js
```

---

*Última actualización: 2025-01-27*
*Versión: 1.0.0* 