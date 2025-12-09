# 🚀 Guía Rápida: Configurar Staging

Esta guía te ayudará a configurar un entorno de staging en Railway rápidamente.

## ⚡ Inicio Rápido (5 minutos)

### 1. Crear el Environment de Staging

```bash
# Instalar Railway CLI (si no lo tienes)
npm install -g @railway/cli

# Login a Railway
railway login

# Crear environment de staging
railway environment add staging
railway environment use staging
```

### 2. Configurar Variables de Entorno

**Opción A: Script Automático (Recomendado)**
```bash
npm run staging:setup
# O directamente:
./scripts/setup-railway-staging.sh
```

**Opción B: Manualmente**
```bash
# Cambiar a staging
railway environment use staging

# Variables públicas
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=staging
railway variables set TZ=America/Tegucigalpa
railway variables set PORT=8080
railway variables set HOSTNAME=0.0.0.0
railway variables set NEXT_TELEMETRY_DISABLED=1
railway variables set DEFAULT_CURRENCY=HNL
railway variables set DEFAULT_TIMEZONE=America/Tegucigalpa
railway variables set SKIP_ENV_VALIDATION=false

# Variables de Supabase (STAGING - usar proyecto separado)
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-staging.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_staging
railway variables set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_staging

# Base de datos (STAGING - usar base separada)
railway variables set DATABASE_URL=postgresql://user:password@host:port/database_staging

# Secrets (DIFERENTES de producción)
railway variables set JWT_SECRET=tu_jwt_secret_staging
railway variables set SUPABASE_JWT_SECRET=tu_supabase_jwt_secret_staging
railway variables set SESSION_SECRET=tu_session_secret_staging

# URL del sitio (STAGING)
railway variables set NEXT_PUBLIC_SITE_URL=https://staging-humanosisu.net

# PayPal (SANDBOX para staging)
railway variables set PAYPAL_MODE=sandbox
railway variables set PAYPAL_CLIENT_ID=tu_paypal_sandbox_client_id
railway variables set PAYPAL_CLIENT_SECRET=tu_paypal_sandbox_client_secret
```

### 3. Verificar Configuración

```bash
npm run staging:check
# O directamente:
./scripts/check-staging-env.sh
```

### 4. Desplegar a Staging

```bash
npm run staging:deploy
# O directamente:
railway environment use staging
railway up
```

## 📋 Checklist de Configuración

Antes de desplegar, asegúrate de:

- [ ] Environment `staging` creado en Railway
- [ ] Variables públicas configuradas
- [ ] Supabase de staging configurado (proyecto separado)
- [ ] Base de datos de staging configurada (separada)
- [ ] Secrets diferentes de producción
- [ ] PayPal en modo sandbox
- [ ] URL del sitio configurada (diferente de producción)
- [ ] Verificación exitosa con `npm run staging:check`

## 🔐 Variables Críticas

### ⚠️ IMPORTANTE: Deben ser DIFERENTES de producción

1. **JWT_SECRET** - Debe ser diferente
2. **SUPABASE_JWT_SECRET** - Debe ser diferente
3. **SESSION_SECRET** - Debe ser diferente
4. **CRON_SECRET** - Debe ser diferente
5. **EMPLOYEE_LAST5_PEPPER** - Debe ser diferente
6. **EMPLOYEE_PIN_PEPPER** - Debe ser diferente

### ⚠️ RECOMENDADO: Usar recursos separados

1. **Supabase Project** - Proyecto separado para staging
2. **Database** - Base de datos separada
3. **Domain** - Dominio/subdominio diferente
4. **PayPal** - Modo sandbox

## 🛠️ Comandos Útiles

```bash
# Ver todas las variables de staging
railway environment use staging
railway variables

# Ver logs de staging
railway logs

# Verificar health check
railway domain
curl https://tu-dominio-staging.railway.app/api/health

# Reiniciar servicio de staging
railway restart

# Ver estado del deployment
railway status
```

## 📚 Documentación Completa

Para más detalles, consulta:
- [Guía Completa de Staging](./docs/RAILWAY_STAGING_SETUP.md)
- [Guía de Deployment](./DEPLOYMENT.md)

## 🆘 Troubleshooting

### El environment no existe
```bash
railway environment add staging
railway environment use staging
```

### Variables no se aplican
```bash
# Verificar que estás en el environment correcto
railway environment use staging
railway variables

# Reiniciar el servicio
railway restart
```

### Deployment falla
```bash
# Ver logs
railway logs

# Verificar variables
npm run staging:check

# Verificar configuración
railway status
```

## 🔄 Flujo de Trabajo Recomendado

1. **Desarrollo** → Trabaja en rama `develop`
2. **Staging** → Despliega `develop` a staging para pruebas
3. **Production** → Despliega `main` a producción después de validar en staging

```bash
# Desarrollo
git checkout develop
# ... hacer cambios ...
git push origin develop

# Staging (auto-deploy desde develop si está configurado)
# O manualmente:
railway environment use staging
railway up

# Production (después de validar en staging)
git checkout main
git merge develop
git push origin main
railway environment use production
railway up
```

## ✅ Listo!

Una vez configurado, puedes:
- Desplegar cambios a staging para pruebas
- Validar funcionalidades antes de producción
- Probar integraciones con servicios externos
- Verificar que todo funcione correctamente

¡Happy staging! 🎉

