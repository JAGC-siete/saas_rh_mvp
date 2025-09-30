# Humano SISU - Sistema de Recursos Humanos

## Descripción General

Humano SISU es un sistema completo de gestión de recursos humanos diseñado específicamente para empresas hondureñas. Automatiza los procesos de nómina, control de asistencia, gestión de empleados y reportes, cumpliendo con las regulaciones locales (IHSS, RAP, ISR).

### Versión Actual: 1.5.0
### Última Actualización: Enero 2025

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI/UX**: Tailwind CSS, shadcn/ui, Glass Morphism
- **Deployment**: Railway, Docker
- **Monitoreo**: Winston Logger, Health Checks

### Estructura del Proyecto
```
saas-proyecto/
├── components/           # Componentes React reutilizables
│   ├── ui/              # Componentes base UI
│   ├── attendance/      # Componentes de asistencia
│   └── employee-portal/ # Portal de empleados
├── pages/               # Páginas Next.js
│   ├── api/            # API endpoints
│   ├── app/            # Aplicación principal
│   └── trial/          # Sistema de prueba
├── lib/                # Utilidades y servicios
│   ├── auth/           # Autenticación
│   ├── supabase/       # Cliente Supabase
│   ├── hooks/          # React hooks
│   └── services/       # Servicios de negocio
├── sql/                # Scripts SQL
├── supabase/           # Configuración Supabase
└── scripts/            # Scripts de automatización
```

---

## 🗄️ Base de Datos

### Esquema Principal

#### Tablas Core
- **`companies`**: Información de empresas
- **`employees`**: Datos de empleados
- **`departments`**: Departamentos organizacionales
- **`user_profiles`**: Perfiles de usuario y permisos

#### Sistema de Nómina
- **`payroll_runs`**: Ejecuciones de nómina
- **`payroll_run_lines`**: Líneas de nómina por empleado
- **`payroll_records`**: Registros históricos de nómina
- **`payroll_adjustments`**: Ajustes manuales
- **`payroll_snapshots`**: Versionado de cambios

#### Control de Asistencia
- **`attendance_records`**: Registros de asistencia
- **`attendance_events`**: Eventos de entrada/salida
- **`work_schedules`**: Horarios de trabajo

#### Gamificación
- **`achievement_types`**: Tipos de logros
- **`employee_achievements`**: Logros obtenidos
- **`employee_scores`**: Puntuaciones de empleados
- **`point_history`**: Historial de puntos

#### Otros Módulos
- **`leave_requests`**: Solicitudes de permisos
- **`leave_types`**: Tipos de permisos
- **`audit_logs`**: Logs de auditoría
- **`trial_access_users`**: Usuarios de prueba

### Relaciones Principales
```sql
companies (1) → (*) employees
employees (1) → (*) attendance_records
employees (1) → (*) payroll_run_lines
departments (1) → (*) employees
work_schedules (1) → (*) employees
```

---

## 🔐 Sistema de Autenticación

### Tipos de Usuario
1. **Super Admin**: Acceso completo al sistema
2. **Company Admin**: Administrador de empresa
3. **HR Manager**: Gestor de recursos humanos
4. **Employee**: Empleado básico

### Flujos de Autenticación
1. **Admin/HR**: Supabase Auth con email/password
2. **Empleados**: Sistema OTP con últimos 5 dígitos de DNI
3. **Demo**: Sistema PIN temporal
4. **Trial**: Acceso con tenant_id

### Middleware de Seguridad
- Rutas protegidas por rol
- Rate limiting por IP
- Validación de sesiones
- Headers de seguridad

---

## 🌐 API Endpoints

### Autenticación
- `POST /api/auth/login-supabase` - Login admin
- `POST /api/employees/auth/login` - Login empleados
- `POST /api/employees/auth/send-otp` - Enviar OTP
- `POST /api/employees/auth/verify-otp` - Verificar OTP

### Empleados
- `GET /api/employees` - Listar empleados
- `POST /api/employees/create` - Crear empleado
- `PUT /api/employees/[id]` - Actualizar empleado
- `DELETE /api/employees/[id]` - Eliminar empleado

### Nómina
- `POST /api/payroll/calculate` - Calcular nómina
- `PUT /api/payroll/edit` - Editar nómina
- `POST /api/payroll/authorize` - Autorizar nómina
- `POST /api/payroll/send-vouchers` - Enviar vouchers
- `GET /api/payroll/export` - Exportar nómina

### Asistencia
- `POST /api/attendance/register` - Registrar asistencia
- `GET /api/attendance/employees` - Reporte empleados
- `GET /api/attendance/export` - Exportar reporte
- `GET /api/attendance/kpis` - KPIs de asistencia

### Reportes
- `GET /api/reports` - Resumen de reportes y estadísticas básicas de la empresa
- `POST /api/reports/export` - Exportar reportes usando cuerpo:
  - `format`: `csv` | `pdf` | `excel` (Excel actualmente soportado para `reportType = attendance`)
  - `dateFilter`: `{ startDate, endDate }`
  - `reportType`: `attendance` | `payroll` | `employees`

### Gamificación
- `GET /api/gamification/leaderboard` - Tabla de clasificación
- `GET /api/gamification/achievements` - Logros disponibles
- `GET /api/gamification/employee-progress` - Progreso empleado

---

## 🎨 Frontend Components

### Layout Components
- **`DashboardLayout`**: Layout principal con navegación
- **`ProtectedRoute`**: Wrapper para rutas protegidas
- **`AuthForm`**: Formulario de autenticación

### Business Components
- **`EmployeeManager`**: Gestión de empleados
- **`PayrollManagerNew`**: Gestión de nómina unificada
- **`AttendanceManager`**: Control de asistencia
- **`DepartmentManager`**: Gestión de departamentos
- **`ReportsAndAnalytics`**: Dashboard de reportes
- **`GamificationLeaderboard`**: Sistema de gamificación

### UI Components (shadcn/ui)
- **`Button`**: Botones reutilizables
- **`Input`**: Campos de entrada
- **`Card`**: Tarjetas de contenido
- **`Dialog`**: Modales y diálogos
- **`Table`**: Tablas de datos

---

## 📱 Páginas y Rutas

### Landing Page
- `/` - Página principal de marketing
- `/demo` - Solicitar demo
- `/activar` - Formulario de activación

### Autenticación
- `/auth/start` - Inicio de autenticación
- `/auth/callback` - Callback OAuth
- `/app/login` - Login con password

### Aplicación Principal (/app/*)
- `/app/dashboard` - Dashboard principal
- `/app/employees` - Gestión de empleados
- `/app/payroll` - Sistema de nómina
- `/app/attendance` - Control de asistencia
- `/app/reports` - Reportes y analytics
- `/app/departments` - Gestión de departamentos
- `/app/gamification` - Sistema de gamificación
- `/app/settings` - Configuración

### Sistema de Prueba (/trial/*)
- `/trial-dashboard` - Dashboard de prueba
- `/trial/attendance` - Asistencia de prueba
- `/trial/payroll` - Nómina de prueba

### Portal de Empleados
- `/attendance/register` - Registro de asistencia
- `/employees/portal` - Portal de empleados

---

## ⚙️ Configuración

### Variables de Entorno Críticas
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Base de Datos
DATABASE_URL=postgresql://postgres:password@host:port/database

# Seguridad
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Aplicación
TZ=America/Tegucigalpa
DEFAULT_TIMEZONE=America/Tegucigalpa
DEFAULT_CURRENCY=HNL
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Email
RESEND_API_KEY=your_resend_api_key_here

# Cron Jobs
CRON_SECRET=your_cron_secret_here
```

### Configuración de Next.js
```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  
  // Redirects para rutas legacy
  async redirects() {
    return [
      { source: '/dashboard', destination: '/app/dashboard', permanent: false },
      { source: '/employees', destination: '/app/employees', permanent: false },
      // ... más redirects
    ]
  }
}
```

### Configuración de Railway
```toml
# railway.toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
numReplicas = 1
```

---

## 🚀 Despliegue

### Railway (Producción)
1. **Preparación**:
   ```bash
   npm run build
   ```

2. **Deploy**:
   ```bash
   railway up
   ```

3. **Variables de entorno**: Configuradas en Railway Dashboard

### Docker
```dockerfile
FROM node:20-alpine AS base
ENV TZ=America/Tegucigalpa

# Build stages: deps → builder → runner
# Standalone output optimizado para Railway
```

### Health Checks
- Endpoint: `/api/health`
- Verifica: Base de datos, servicios externos
- Timeout: 300 segundos

---

## 📊 Funcionalidades Principales

### 1. Gestión de Empleados
- CRUD completo de empleados
- Organización por departamentos
- Horarios de trabajo personalizados
- Búsqueda y filtrado avanzado
- Importación masiva de datos

### 2. Sistema de Nómina
- **Cálculos automáticos**:
  - IHSS (3.5% empleado)
  - RAP (1.5% empleado)  
  - ISR (progresivo según tabla)
- **Procesos**:
  - Cálculo por quincenas (1-15, 16-fin)
  - Edición manual de líneas
  - Autorización por administrador
  - Generación de vouchers PDF
  - Envío masivo por email
- **Política de Deducciones**:
  - Las deducciones (IHSS, RAP, ISR) se aplican **completas** en la quincena seleccionada
  - No se prorratean: si se genera nómina para quincena 1, se deducen los montos mensuales completos
  - Esto significa que en quincena 1 se descuenta el IHSS/RAP/ISR del mes completo
  - En quincena 2 se vuelven a aplicar las mismas deducciones mensuales completas
  - Esta política está diseñada para cumplir con regulaciones hondureñas donde las deducciones se calculan sobre el salario mensual completo

### 3. Control de Asistencia
- **Registro público** sin autenticación
- Validación por últimos 5 dígitos DNI
- Detección automática de tardanzas
- Geolocalización opcional
- Justificaciones categorizadas
- Integración con cálculo de nómina

### 4. Sistema de Gamificación
- Logros por puntualidad
- Tabla de clasificación
- Puntos por comportamiento
- Motivación de empleados
- Reportes de progreso

### 5. Reportes y Analytics
- Dashboard ejecutivo con KPIs
- Exportación a Excel/PDF
- Tendencias de asistencia
- Análisis de costos de nómina
- Certificados laborales

---

## 🔒 Seguridad

### Medidas Implementadas
1. **Autenticación robusta**:
   - JWT tokens seguros
   - Sesiones con expiración
   - Rate limiting por IP

2. **Autorización granular**:
   - Roles y permisos
   - Middleware de protección
   - Validación en cada endpoint

3. **Protección de datos**:
   - Headers de seguridad
   - Sanitización de inputs
   - Logs de auditoría
   - Encriptación de datos sensibles

4. **Monitoreo**:
   - Logs estructurados
   - Alertas de seguridad
   - Tracking de accesos

---

## 🧪 Sistema de Pruebas (Trial)

### Características
- Acceso temporal sin registro
- Datos de demostración
- Funcionalidades limitadas
- PIN de acceso: configurado en admin

### Flujo de Trial
1. Usuario solicita demo
2. Admin genera PIN
3. Usuario accede con PIN
4. Explora funcionalidades
5. Conversión a cliente

---

## 📈 Monitoreo y Logs

### Winston Logger
```javascript
// Niveles de log
logger.error('Error crítico', error)
logger.warn('Advertencia', context)
logger.info('Información general', data)
logger.debug('Debug detallado', details)
```

### Métricas Principales
- Tiempo de respuesta API
- Errores de autenticación
- Uso de funcionalidades
- Performance de base de datos

### Health Checks
- `/api/health` - Estado general
- Verificación de Supabase
- Verificación de servicios externos

---

## 🛠️ Scripts de Mantenimiento

### Auditoría del Sistema
```bash
npm run audit              # Auditoría completa
npm run audit:system       # Solo sistema
npm run audit:supabase     # Solo base de datos
npm run audit:fix          # Aplicar correcciones
```

### Logs y Debugging
```bash
npm run logs:dev           # Logs desarrollo
npm run logs:prod          # Logs producción
npm run test:cookies       # Test cookies Supabase
```

### Cron Jobs
- `/api/cron/daily` - Tareas diarias
- `/api/cron/cleanup-old-logs` - Limpieza de logs
- `/api/cron/backup-critical-data` - Respaldo de datos

---

## 🤝 Integración con Servicios Externos

### Email (Resend)
- Envío de vouchers de nómina
- Notificaciones del sistema
- Reportes automáticos

### SMS (Twilio)
- OTP para empleados
- Notificaciones críticas

### PayPal
- Procesamiento de pagos
- Suscripciones empresariales
- Webhooks de transacciones

---

## 📋 Casos de Uso Principales

### Para Administradores
1. **Setup inicial**:
   - Crear empresa
   - Configurar departamentos
   - Importar empleados
   - Definir horarios

2. **Operación mensual**:
   - Revisar asistencias
   - Calcular nómina
   - Autorizar pagos
   - Enviar vouchers
   - Generar reportes

### Para Empleados
1. **Uso diario**:
   - Registrar entrada/salida
   - Ver progreso gamificación
   - Consultar asistencias

2. **Uso mensual**:
   - Recibir voucher por email
   - Revisar historial de pagos

### Para RH
1. **Gestión de personal**:
   - Altas/bajas de empleados
   - Gestión de permisos
   - Reportes de asistencia
   - Análisis de tendencias

---

## 🔄 Flujos de Trabajo

### Proceso de Nómina
```mermaid
graph TD
    A[Calcular Nómina] --> B[Revisar Cálculos]
    B --> C[Editar si necesario]
    C --> D[Autorizar Nómina]
    D --> E[Generar Vouchers]
    E --> F[Enviar por Email]
    F --> G[Marcar como Distribuida]
```

### Registro de Asistencia
```mermaid
graph TD
    A[Empleado ingresa DNI] --> B[Validar últimos 5 dígitos]
    B --> C[Verificar horario]
    C --> D[Registrar evento]
    D --> E[Calcular tardanza]
    E --> F[Actualizar puntos]
    F --> G[Confirmar registro]
```

---

## 🚨 Troubleshooting

### Problemas Comunes

#### Error de Conexión Supabase
```bash
# Verificar variables de entorno
npm run test:cookies

# Revisar logs
npm run logs:prod
```

#### Problemas de Nómina
```sql
-- Verificar datos de empleados
SELECT * FROM employees WHERE company_id = 'uuid';

-- Revisar cálculos
SELECT * FROM payroll_run_lines WHERE run_id = 'uuid';
```

#### Errores de Asistencia
```bash
# Verificar endpoint público
curl -X POST /api/attendance/register \
  -H "Content-Type: application/json" \
  -d '{"dni":"12345", "last5":"12345"}'
```

### Logs de Error
- Ubicación: `/tmp/hr-saas-logs/`
- Rotación: Diaria
- Retención: 30 días

---

## 📞 Soporte y Contacto

### Información de Contacto
- **Email**: soporte@humanosisu.com
- **Sitio web**: https://humanosisu.net
- **Documentación**: Este archivo

### Escalación de Problemas
1. **Nivel 1**: Problemas de usuario
2. **Nivel 2**: Problemas técnicos
3. **Nivel 3**: Problemas de infraestructura

---

## 📝 Notas de Desarrollo

### Próximas Funcionalidades
- [ ] Módulo de evaluaciones de desempeño
- [ ] Integración con sistemas contables
- [ ] App móvil nativa
- [ ] API pública para integraciones
- [ ] Reportes avanzados con BI

### Limitaciones Conocidas
- Máximo 1000 empleados por empresa
- Exportación limitada a 10,000 registros
- Sesiones de empleados: 24 horas

### Consideraciones Técnicas
- Base de datos: PostgreSQL 15+
- Node.js: 20+ requerido
- Memoria: 512MB mínimo
- Almacenamiento: 10GB recomendado

---

## 📚 Referencias

### Documentación Técnica
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway Documentation](https://docs.railway.app)

### Regulaciones Hondureñas
- [IHSS - Cálculos de Aportaciones](https://www.ihss.hn)
- [RAP - Régimen de Aportaciones Privadas](https://www.cnbs.gob.hn)
- [SAR - Impuesto Sobre la Renta](https://www.sar.gob.hn)

---

**Documento actualizado**: Enero 2025  
**Versión del sistema**: 1.5.0  
**Mantenido por**: Equipo Humano SISU
