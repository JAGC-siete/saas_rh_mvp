# Guía de Despliegue - Humano SISU

Esta guía cubre el despliegue del sistema Humano SISU en diferentes plataformas.

## 🚀 Despliegue en Railway (Recomendado)

### Prerrequisitos
- Cuenta de Railway
- Railway CLI instalado
- Variables de entorno configuradas

### Pasos

1. **Instalar Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login en Railway**
```bash
railway login
```

3. **Inicializar proyecto**
```bash
railway init
```

4. **Configurar variables de entorno**
```bash
railway variables set NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
railway variables set RESEND_API_KEY=your_resend_key
```

5. **Desplegar**
```bash
railway up
```

### Configuración de Railway

El archivo `railway.toml` contiene la configuración:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
```

## 🌐 Despliegue en Vercel

### Prerrequisitos
- Cuenta de Vercel
- Vercel CLI instalado
- Proyecto conectado a GitHub

### Pasos

1. **Instalar Vercel CLI**
```bash
npm install -g vercel
```

2. **Login en Vercel**
```bash
vercel login
```

3. **Configurar proyecto**
```bash
vercel
```

4. **Configurar variables de entorno en Vercel Dashboard**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

5. **Desplegar**
```bash
vercel --prod
```

## 🐳 Despliegue con Docker

### Construir imagen
```bash
docker build -t humano-sisu .
```

### Ejecutar contenedor
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_key \
  -e RESEND_API_KEY=your_resend_key \
  humano-sisu
```

### Docker Compose
```bash
docker-compose up -d
```

## 🔧 Configuración de Base de Datos

### Supabase Setup

1. **Crear proyecto en Supabase**
2. **Ejecutar migraciones**
```sql
-- Ver archivos en /sql/ para las migraciones completas
```

3. **Configurar RLS (Row Level Security)**
4. **Crear políticas de seguridad**
5. **Configurar autenticación**

### Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (Resend)
RESEND_API_KEY=re_your_api_key

# Opcional
NODE_ENV=production
```

## 📊 Monitoreo y Logs

### Health Check
El sistema incluye un endpoint de salud:
```
GET /api/health
```

### Logs
- Logs estructurados con Winston
- Niveles: error, warn, info, debug
- Rotación automática de logs
- Integración con servicios de monitoreo

### Métricas
- Tiempo de respuesta de APIs
- Uso de memoria y CPU
- Errores por endpoint
- Usuarios activos

## 🔒 Seguridad en Producción

### Headers de Seguridad
```javascript
// middleware.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
]
```

### Rate Limiting
- Límite de 100 requests por minuto por IP
- Límite de 10 requests por minuto para endpoints de autenticación
- Límite de 5 requests por minuto para generación de PDFs

### Validación de Datos
- Sanitización de inputs
- Validación de tipos con TypeScript
- Validación de esquemas con Zod
- Escape de caracteres especiales

## 🚨 Troubleshooting

### Problemas Comunes

#### Error de Conexión a Supabase
```bash
# Verificar variables de entorno
railway variables
# o
vercel env ls
```

#### Error de Build
```bash
# Limpiar cache
rm -rf .next
npm run build
```

#### Error de Base de Datos
```bash
# Verificar conexión
npm run check-database
```

### Logs de Debug
```bash
# Railway
railway logs

# Vercel
vercel logs

# Docker
docker logs container_name
```

## 📈 Escalabilidad

### Optimizaciones
- Lazy loading de componentes
- Caching de consultas frecuentes
- Compresión de assets
- CDN para archivos estáticos

### Recursos Recomendados
- **Railway**: Hobby plan (1GB RAM, 1 CPU)
- **Vercel**: Pro plan (100GB bandwidth)
- **Supabase**: Pro plan (8GB database)

## 🔄 CI/CD

### GitHub Actions
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: railway up
```

## 📞 Soporte

Para problemas de despliegue:
- Revisar logs de la plataforma
- Verificar variables de entorno
- Consultar documentación de la plataforma
- Contactar soporte técnico

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0.0
