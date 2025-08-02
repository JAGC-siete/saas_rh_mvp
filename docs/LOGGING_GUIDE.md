# 📝 Sistema de Logging Estructurado

## Descripción General

Hemos implementado un sistema de logging simple pero efectivo que sigue los principios de la metodología 12-Factor App. El sistema está diseñado para ser:

- **Simple**: Sin sobreconfiguraciones innecesarias
- **Estructurado**: Logs en formato JSON en producción
- **Contextual**: Incluye metadata relevante
- **Performante**: Mínimo impacto en rendimiento

## Arquitectura

### 1. Logger del Servidor (`lib/logger.ts`)

Logger principal para uso en el servidor (API routes, middleware, etc.)

```typescript
import { logger } from '../lib/logger'

// Uso básico
logger.info('Usuario autenticado', { userId: user.id })
logger.error('Error en base de datos', error, { table: 'employees' })
logger.debug('Operación completada', { duration: '123ms' })
logger.warn('Límite de rate alcanzado', { ip: request.ip })
```

**Características:**
- Niveles: `debug`, `info`, `warn`, `error`
- Formato JSON en producción
- Formato legible en desarrollo
- Metadata automática (timestamp, servicio, entorno)

### 2. Logger del Cliente (`lib/logger-client.ts`)

Logger optimizado para el navegador

```typescript
import { clientLogger } from '../lib/logger-client'

// Uso en componentes React
clientLogger.track('button_clicked', { button: 'submit' })
clientLogger.performance('api_call', 250, { endpoint: '/api/users' })
clientLogger.error('Form validation failed', error)
```

**Características:**
- Logs con colores en desarrollo
- Mínimo ruido en producción (solo warn/error)
- Métodos helper para tracking y performance

## Configuración

### Variables de Entorno

```env
# Nivel de logging (debug, info, warn, error)
LOG_LEVEL=info

# Entorno (development, production)
NODE_ENV=production
```

### Niveles de Log

| Nivel | Uso | Producción |
|-------|-----|------------|
| `debug` | Información detallada para debugging | ❌ No se muestra |
| `info` | Eventos importantes del sistema | ✅ Se muestra |
| `warn` | Situaciones potencialmente problemáticas | ✅ Se muestra |
| `error` | Errores que requieren atención | ✅ Se muestra |

## Mejores Prácticas

### 1. Usa el Nivel Apropiado

```typescript
// ❌ Mal
logger.error('Usuario no encontrado') // No es un error del sistema

// ✅ Bien
logger.info('Usuario no encontrado', { dni: '12345' })
```

### 2. Incluye Contexto Relevante

```typescript
// ❌ Mal
logger.error('Error en la operación')

// ✅ Bien
logger.error('Error al calcular nómina', error, {
  periodo: '2024-01',
  quincena: 1,
  employeeId: emp.id
})
```

### 3. Evita Información Sensible

```typescript
// ❌ Mal
logger.info('Login exitoso', { password: user.password })

// ✅ Bien
logger.info('Login exitoso', { 
  userId: user.id, 
  email: user.email,
  ip: request.ip 
})
```

### 4. Usa Helpers Específicos

```typescript
// Para APIs
logger.api('POST', '/api/attendance/register', 200, 145)

// Para base de datos
logger.db('SELECT', 'employees', 23, { count: 150 })

// Para tracking en cliente
clientLogger.track('form_submitted', { formId: 'payroll' })
```

## Ejemplos de Uso

### En Middleware

```typescript
export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  logger.debug('Middleware request', {
    method: request.method,
    path: pathname,
    userAgent: request.headers.get('user-agent')
  })
  
  // ... lógica del middleware
  
  const duration = Date.now() - startTime
  logger.api(request.method, pathname, 200, duration)
}
```

### En API Routes

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    logger.info('Processing payroll calculation', {
      periodo: req.body.periodo,
      quincena: req.body.quincena
    })
    
    // ... lógica de negocio
    
    logger.info('Payroll calculated successfully', {
      employeeCount: results.length,
      totalAmount: totalAmount
    })
    
  } catch (error) {
    logger.error('Payroll calculation failed', error, {
      periodo: req.body.periodo
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

### En Componentes React

```typescript
const PayrollManager = () => {
  const handleSubmit = async () => {
    const startTime = Date.now()
    clientLogger.track('payroll_generation_started', { periodo })
    
    try {
      const result = await generatePayroll(data)
      
      const duration = Date.now() - startTime
      clientLogger.performance('payroll_generation', duration)
      clientLogger.track('payroll_generation_success', { 
        recordCount: result.length 
      })
      
    } catch (error) {
      clientLogger.error('Failed to generate payroll', error)
    }
  }
}
```

## Monitoreo y Análisis

### Desarrollo Local

Los logs se muestran en la consola con formato legible:

```
[14:23:45] INFO: User authenticated { userId: '123', email: 'user@example.com' }
[14:23:46] DEBUG: Database query { table: 'employees', duration: '23ms' }
```

### Producción

Los logs se emiten como JSON para fácil parsing:

```json
{
  "timestamp": "2024-01-15T14:23:45.123Z",
  "level": "info",
  "message": "User authenticated",
  "userId": "123",
  "email": "user@example.com",
  "env": "production",
  "service": "hr-saas"
}
```

### Integración con Servicios

El formato JSON permite fácil integración con:
- **Railway Logs**: Automáticamente capturados
- **Datadog/New Relic**: Parse directo del JSON
- **ELK Stack**: Ingesta sin transformación
- **CloudWatch**: Filtros y métricas automáticas

## Troubleshooting

### No veo logs en desarrollo

Verifica el nivel de log:
```typescript
// El logger usa 'debug' por defecto en desarrollo
// Pero puedes forzarlo:
process.env.LOG_LEVEL = 'debug'
```

### Demasiados logs en producción

Ajusta el nivel en las variables de entorno:
```env
LOG_LEVEL=warn  # Solo warnings y errores
```

### Logs no estructurados en producción

Asegúrate de que `NODE_ENV` esté configurado:
```env
NODE_ENV=production
```

## Próximas Mejoras (Opcionales)

1. **Log Rotation**: Implementar rotación de archivos
2. **Sampling**: Reducir logs en alta carga
3. **Correlation IDs**: Rastrear requests end-to-end
4. **Métricas**: Exportar métricas desde logs

## Conclusión

Este sistema de logging proporciona:
- ✅ Visibilidad completa del sistema
- ✅ Debugging efectivo
- ✅ Monitoreo en producción
- ✅ Sin sobreconfiguraciones
- ✅ Listo para escalar

El logging estructurado es fundamental para mantener y operar un SaaS en producción.