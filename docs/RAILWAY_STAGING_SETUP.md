# 🚂 Configuración de Environment Staging en Railway

Esta guía te ayudará a configurar un entorno de staging separado en Railway para probar cambios antes de producción.

## 📋 Requisitos Previos

1. Tener una cuenta de Railway activa
2. Tener Railway CLI instalado: `npm install -g @railway/cli`
3. Tener acceso al proyecto actual en Railway

## 🎯 Paso 1: Crear el Environment de Staging

### Opción A: Desde el Dashboard de Railway (Recomendado)

1. Ve a tu proyecto en Railway: https://railway.app/dashboard
2. Haz clic en tu proyecto
3. En la parte superior, verás el environment actual (probablemente "production")
4. Haz clic en el dropdown del environment
5. Haz clic en "**+ New Environment**"
6. Nómbralo `staging`
7. Haz clic en "**Create**"

### Opción B: Desde la CLI

```bash
# Asegúrate de estar vinculado al proyecto
railway link

# Crear nuevo environment
railway environment add staging

# Cambiar al environment de staging
railway environment use staging
```

## 🔧 Paso 2: Crear un Nuevo Servicio en Staging (Opcional)

Si quieres un servicio completamente separado:

1. En el environment `staging`, haz clic en "**+ New Service**"
2. Selecciona "**GitHub Repo**" o "**Empty Service**"
3. Si usas GitHub, conecta el repositorio y selecciona la rama `develop`
4. Si usas Empty Service, sube el código manualmente

## 📝 Paso 3: Configurar Variables de Entorno para Staging

### Variables Públicas (No Sensibles)

Estas pueden ser las mismas o diferentes de producción:

```bash
# Cambiar al environment de staging
railway environment use staging

# Variables públicas/operativas
railway variables set TZ="America/Tegucigalpa"
railway variables set NODE_ENV="production"
railway variables set PORT="8080"
railway variables set HOSTNAME="0.0.0.0"
railway variables set NEXT_TELEMETRY_DISABLED="1"
railway variables set DEFAULT_CURRENCY="HNL"
railway variables set DEFAULT_TIMEZONE="America/Tegucigalpa"
railway variables set SKIP_ENV_VALIDATION="false"
railway variables set RAILWAY_ENVIRONMENT="staging"
```

### Variables Específicas de Staging

**IMPORTANTE:** Para staging, deberías usar:

1. **URL del sitio diferente:**
```bash
railway variables set NEXT_PUBLIC_SITE_URL="https://staging-humanosisu.net"  # O el dominio que uses
```

2. **Supabase separado (Recomendado):**
   - Crea un proyecto de Supabase separado para staging
   - O usa el mismo proyecto pero con diferentes configuraciones
   
```bash
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto-staging.supabase.co"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="tu_anon_key_staging"
railway variables set SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key_staging"
```

3. **Base de datos separada (Recomendado):**
```bash
railway variables set DATABASE_URL="postgresql://user:password@host:port/database_staging"
```

4. **Secrets diferentes:**
```bash
railway variables set JWT_SECRET="tu_jwt_secret_staging_diferente"
railway variables set SUPABASE_JWT_SECRET="tu_supabase_jwt_secret_staging"
railway variables set SESSION_SECRET="tu_session_secret_staging_diferente"
```

5. **PayPal en modo Sandbox:**
```bash
railway variables set PAYPAL_MODE="sandbox"
railway variables set PAYPAL_CLIENT_ID="tu_paypal_client_id_sandbox"
railway variables set PAYPAL_CLIENT_SECRET="tu_paypal_client_secret_sandbox"
```

6. **Otras variables opcionales:**
```bash
railway variables set RESEND_API_KEY="tu_resend_key"
railway variables set CRON_SECRET="tu_cron_secret_staging"
railway variables set EMPLOYEE_LAST5_PEPPER="tu_pepper_staging"
railway variables set EMPLOYEE_PIN_PEPPER="tu_pin_pepper_staging"
```

## 🚀 Paso 4: Desplegar a Staging

### Usando el Script de Deployment

```bash
# Desplegar a staging
./scripts/deploy-railway.sh --staging

# O desde la rama develop (se auto-detecta)
git checkout develop
./scripts/deploy-railway.sh
```

### Usando Railway CLI Directamente

```bash
# Asegúrate de estar en el environment correcto
railway environment use staging

# Vincula el servicio si es necesario
railway link

# Despliega
railway up
```

## ✅ Paso 5: Verificar la Configuración

### Verificar Variables de Entorno

```bash
# Listar todas las variables del environment de staging
railway environment use staging
railway variables
```

### Verificar el Deployment

1. Obtén la URL del deployment:
```bash
railway domain
```

2. Verifica el health check:
```bash
curl https://tu-dominio-staging.railway.app/api/health
```

3. Verifica las variables de entorno:
```bash
curl https://tu-dominio-staging.railway.app/api/railway-env-check
```

4. Página de debug:
```
https://tu-dominio-staging.railway.app/railway-debug
```

## 🔄 Paso 6: Configurar Auto-Deployment (Opcional)

Para que staging se despliegue automáticamente desde la rama `develop`:

1. En Railway Dashboard, ve a tu servicio en el environment `staging`
2. Ve a "**Settings**" → "**Source**"
3. Configura:
   - **Repository:** Tu repositorio GitHub
   - **Branch:** `develop`
   - **Root Directory:** `/` (o la ruta correcta)

## 📊 Comparación: Staging vs Production

| Aspecto | Staging | Production |
|---------|---------|------------|
| **Environment** | `staging` | `production` |
| **Rama Git** | `develop` | `main` |
| **NODE_ENV** | `production` | `production` |
| **Supabase** | Proyecto separado o mismo | Proyecto de producción |
| **Database** | Base de datos separada | Base de datos de producción |
| **PayPal** | Sandbox | Live |
| **Domain** | `staging-humanosisu.net` | `humanosisu.net` |
| **Secrets** | Diferentes de producción | Secrets de producción |

## 🛠️ Script de Ayuda Rápida

Usa el script proporcionado para facilitar la configuración:

```bash
# Configurar variables de staging desde .env.local
./scripts/setup-railway-staging.sh
```

## 🔐 Mejores Prácticas

1. **Nunca uses los mismos secrets en staging y production**
2. **Usa una base de datos separada para staging**
3. **Usa PayPal Sandbox en staging**
4. **Configura un dominio diferente para staging**
5. **Revisa los logs después de cada deployment**
6. **Prueba el health check después de desplegar**

## 🔍 Troubleshooting

### El environment no aparece en Railway

```bash
# Verificar environments disponibles
railway environment list

# Cambiar manualmente
railway environment use staging
```

### Las variables no se aplican

1. Verifica que estás en el environment correcto:
```bash
railway environment use staging
railway variables
```

2. Reinicia el servicio después de cambiar variables:
```bash
railway restart
```

### El deployment falla

1. Revisa los logs:
```bash
railway logs
```

2. Verifica que todas las variables requeridas estén configuradas:
```bash
./scripts/check-railway-env.sh
```

3. Verifica el Dockerfile y railway.toml

## 📚 Recursos Adicionales

- [Railway Environments Documentation](https://docs.railway.app/develop/environments)
- [Railway CLI Reference](https://docs.railway.app/reference/cli)
- [Documentación de Deployment](./DEPLOYMENT.md)




