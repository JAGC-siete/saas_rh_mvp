# Implementación de Seguridad para Leave Management

## Resumen Ejecutivo

Se ha implementado una arquitectura de seguridad completa para la ruta `/app/leave` que elimina el acceso directo a la base de datos desde el frontend y establece un control granular de permisos basado en roles. **La implementación ahora incluye el registro de permisos previamente autorizados usando DNI del empleado y soporte para archivos adjuntos (PDF/JPG).**

## Arquitectura Implementada

### 1. Endpoints Backend Seguros

#### `/api/leave` (GET, POST)
- **Autenticación**: Requiere token válido de Supabase
- **Autorización**: Permisos `can_manage_employees`
- **Funcionalidad**: 
  - GET: Obtener solicitudes de permisos (filtradas por empresa)
  - POST: Crear nueva solicitud de permiso con **DNI y archivos adjuntos**
- **Características Especiales**:
  - Búsqueda de empleado por DNI
  - Validación de archivos (PDF, JPG, PNG hasta 10MB)
  - Almacenamiento seguro de archivos en `/public/uploads`

#### `/api/leave/[id]` (PUT, DELETE)
- **Autenticación**: Requiere token válido de Supabase
- **Autorización**: Permisos `can_manage_employees`
- **Funcionalidad**:
  - PUT: Actualizar estado de solicitud (aprobar/rechazar)
  - DELETE: Eliminar solicitud (solo super_admin y company_admin)

#### `/api/leave/types` (GET, POST)
- **Autenticación**: Requiere token válido de Supabase
- **Autorización**: Permisos `can_manage_employees`
- **Funcionalidad**:
  - GET: Obtener tipos de permisos **dinámicos desde la base de datos**
  - POST: Crear nuevo tipo de permiso

### 2. Schema de Base de Datos Actualizado

#### leave_requests (Tabla Principal)
```sql
-- Campos principales
id UUID PRIMARY KEY
employee_id UUID REFERENCES employees(id)
leave_type_id UUID REFERENCES leave_types(id) -- ✅ Usa ID en lugar de string
employee_dni VARCHAR(20) -- ✅ Nuevo campo para identificación por DNI
start_date DATE NOT NULL
end_date DATE NOT NULL
days_requested INTEGER NOT NULL
reason TEXT
status TEXT DEFAULT 'pending'

-- ✅ Nuevos campos para archivos adjuntos
attachment_url TEXT
attachment_type VARCHAR(10) -- 'pdf' o 'jpg'
attachment_name VARCHAR(255)

-- Campos de auditoría
approved_by UUID REFERENCES employees(id)
approved_at TIMESTAMPTZ
rejection_reason TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

#### leave_types (Tipos de Permisos)
```sql
-- Campos del schema
id UUID PRIMARY KEY
company_id UUID REFERENCES companies(id) -- ✅ Filtrado por empresa
name TEXT NOT NULL
max_days_per_year INTEGER
is_paid BOOLEAN DEFAULT TRUE
requires_approval BOOLEAN DEFAULT TRUE
color TEXT DEFAULT '#3498db'
created_at TIMESTAMPTZ DEFAULT NOW()
```

### 3. Políticas RLS Mejoradas

#### leave_requests
```sql
-- Super admin: Acceso completo
CREATE POLICY "super_admin_can_access_all_leave_requests" ON leave_requests
    FOR ALL USING (role = 'super_admin');

-- Company admins y HR managers: Gestión completa en su empresa
CREATE POLICY "company_admins_hr_managers_can_manage_company_leave_requests" ON leave_requests
    FOR ALL USING (employee.company_id = user.company_id AND role IN ('company_admin', 'hr_manager'));

-- Managers: Aprobación en su departamento
CREATE POLICY "managers_can_update_department_leave_requests" ON leave_requests
    FOR UPDATE USING (employee.department_id = user.department_id AND role = 'manager');

-- Employees: Gestión de sus propias solicitudes
CREATE POLICY "employees_can_manage_own_leave_requests" ON leave_requests
    FOR ALL USING (employee_id = user.employee_id);
```

#### leave_types
```sql
-- Super admin: Acceso completo
CREATE POLICY "super_admin_can_access_all_leave_types" ON leave_types
    FOR ALL USING (role = 'super_admin');

-- Company admins y HR managers: Gestión en su empresa
CREATE POLICY "company_admins_hr_managers_can_manage_company_leave_types" ON leave_types
    FOR ALL USING (company_id = user.company_id AND role IN ('company_admin', 'hr_manager'));
```

### 4. Middleware Reforzado

#### Validación de Endpoints Críticos
- Identificación de endpoints críticos (`/api/leave`, `/api/payroll`, etc.)
- Logging exhaustivo de accesos
- Headers de seguridad adicionales
- Validación de CORS mejorada

#### Headers de Seguridad
```typescript
response.headers.set('X-Content-Type-Options', 'nosniff')
response.headers.set('X-Frame-Options', 'DENY')
response.headers.set('X-XSS-Protection', '1; mode=block')
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
```

### 5. Hook Personalizado (useLeave)

#### Funcionalidades
- Gestión centralizada del estado
- Manejo de errores unificado
- Operaciones CRUD completas
- **Soporte para archivos adjuntos**
- Logging automático de operaciones

#### Uso
```typescript
const {
  leaveRequests,
  leaveTypes,
  isLoading,
  isSubmitting,
  error,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  clearError
} = useLeave()
```

## Funcionalidades de Negocio Implementadas

### 1. **Registro por DNI**
- ✅ **Campo DNI**: Identificación del empleado por número de documento
- ✅ **Validación**: Verificación automática de existencia en base de datos
- ✅ **Feedback**: Muestra nombre del empleado cuando se encuentra el DNI
- ✅ **Seguridad**: Solo empleados de la empresa pueden ser registrados

### 2. **Tipos de Permisos Dinámicos**
- ✅ **Base de Datos**: Los tipos se obtienen desde `leave_types`
- ✅ **Filtrado por Empresa**: Cada empresa ve solo sus tipos configurados
- ✅ **Configuración**: Admins pueden crear tipos personalizados
- ✅ **Metadatos**: Incluye días máximos, si es pagado, requiere aprobación

### 3. **Archivos Adjuntos**
- ✅ **Formatos Soportados**: PDF, JPG, JPEG, PNG
- ✅ **Límite de Tamaño**: Máximo 10MB por archivo
- ✅ **Validación**: Verificación de tipo y tamaño
- ✅ **Preview**: Vista previa de imágenes
- ✅ **Almacenamiento**: Archivos guardados en `/public/uploads`
- ✅ **Seguridad**: Solo archivos autorizados son procesados

### 4. **Flujo de Trabajo**
- ✅ **Registro**: Permisos previamente autorizados verbalmente
- ✅ **Documentación**: Adjuntar comprobantes/respaldo
- ✅ **Aprobación**: Workflow de aprobación/rechazo
- ✅ **Auditoría**: Log completo de todas las operaciones

## Flujo de Seguridad

### 1. Autenticación
1. Usuario accede a `/app/leave`
2. Middleware verifica token de Supabase
3. Si no hay token → redirige a `/app/login`

### 2. Autorización
1. Endpoint verifica permisos del usuario
2. Valida rol y empresa
3. Aplica políticas RLS correspondientes

### 3. Operaciones
1. Frontend usa hook personalizado
2. Hook llama a endpoints backend
3. Backend valida y ejecuta operación
4. **Archivos se procesan y almacenan de forma segura**
5. Base de datos aplica políticas RLS

## Beneficios de Seguridad

### 1. Eliminación de Acceso Directo
- ❌ **Antes**: Frontend accedía directamente a Supabase
- ✅ **Ahora**: Solo endpoints backend autorizados

### 2. Control Granular de Permisos
- **super_admin**: Acceso completo a todas las empresas
- **company_admin**: Gestión completa en su empresa
- **hr_manager**: Gestión de permisos en su empresa
- **manager**: Aprobación en su departamento
- **employee**: Solo sus propias solicitudes

### 3. **Seguridad de Archivos**
- ✅ **Validación de Tipo**: Solo PDF e imágenes permitidos
- ✅ **Límite de Tamaño**: Prevención de ataques DoS
- ✅ **Almacenamiento Seguro**: Directorio controlado
- ✅ **Nombres Únicos**: Prevención de conflictos
- ✅ **Filtrado**: Solo archivos autorizados procesados

### 4. Logging Exhaustivo
- Todas las operaciones se registran
- Información de usuario y contexto
- **Logs de archivos adjuntos**
- Monitoreo de accesos sospechosos

### 5. Validación Centralizada
- Middleware valida todas las rutas
- Headers de seguridad automáticos
- CORS configurado apropiadamente
- **Validación de archivos en backend**

## Monitoreo y Auditoría

### 1. Logs de Seguridad
```typescript
logger.info('Leave management route accessed', { 
  path: pathname, 
  userId: user?.id,
  email: user?.email 
})
```

### 2. Logs de Operaciones
```typescript
logger.info('Leave request created successfully', {
  leaveRequestId: data.id,
  employeeDni: employee_dni,
  userId: userProfile.id
})
```

### 3. **Logs de Archivos**
```typescript
logger.info('File uploaded successfully', {
  filename: attachment.originalFilename,
  size: attachment.size,
  type: attachmentType,
  userId: userProfile.id
})
```

### 4. Logs de Acceso Denegado
```typescript
logger.warn('Permission denied for leave request update', {
  userId: userProfile.id,
  userRole: userProfile.role,
  leaveRequestId
})
```

## Próximos Pasos

### 1. Implementación de Rate Limiting
- Limitar número de solicitudes por IP
- Implementar backoff exponencial
- Monitorear patrones sospechosos

### 2. **Mejoras de Archivos**
- ✅ **Compresión**: Reducir tamaño de archivos grandes
- ✅ **Virus Scan**: Escaneo de archivos subidos
- ✅ **Backup**: Respaldo automático de archivos
- ✅ **CDN**: Distribución de archivos para mejor rendimiento

### 3. Auditoría de Accesos
- Dashboard de seguridad
- Alertas automáticas
- Reportes de cumplimiento

### 4. Testing de Seguridad
- Pruebas de penetración
- Validación de políticas RLS
- Testing de roles y permisos
- **Testing de upload de archivos**

## Conclusión

La implementación establece una arquitectura de seguridad robusta que:
- ✅ Elimina vulnerabilidades de acceso directo a la base de datos
- ✅ Implementa control granular de permisos basado en roles
- ✅ **Proporciona registro de permisos por DNI del empleado**
- ✅ **Soporta archivos adjuntos de forma segura**
- ✅ **Usa tipos de permisos dinámicos desde la base de datos**
- ✅ Proporciona logging exhaustivo para auditoría
- ✅ Mantiene la funcionalidad mientras mejora la seguridad

Esta arquitectura sirve como modelo para otras rutas críticas del sistema y establece las bases para un sistema de seguridad empresarial robusto con **soporte completo para gestión de permisos y documentación digital**.
