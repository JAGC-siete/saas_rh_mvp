# HR SaaS System Audit Suite

Este conjunto de scripts de auditoría valida que tu sistema HR SaaS cumpla con todos los requisitos de arquitectura, seguridad y funcionalidad descritos en la documentación del proyecto.

## 📋 Scripts Disponibles

### 1. `audit-system.js` - Auditoría de Arquitectura del Sistema
Valida la estructura del proyecto, configuración, protección de rutas y APIs, y patrones de seguridad.

**Verificaciones incluidas:**
- ✅ Estructura de archivos y directorios
- ✅ Variables de entorno requeridas
- ✅ Dependencias en package.json
- ✅ Protección de APIs (autenticación)
- ✅ Protección de rutas (ProtectedRoute)
- ✅ Configuración de Supabase
- ✅ Migraciones de base de datos
- ✅ Arquitectura multi-tenant
- ✅ Patrones de seguridad
- ✅ Configuración de TypeScript

### 2. `audit-supabase.js` - Auditoría de Base de Datos
Valida la conectividad, políticas RLS, estructura de tablas y configuración multi-tenant en Supabase.

**Verificaciones incluidas:**
- ✅ Conectividad con Supabase
- ✅ Estructura de tablas requeridas
- ✅ Políticas RLS activas
- ✅ Configuración multi-tenant (company_id)
- ✅ Configuración de autenticación
- ✅ Roles de usuario
- ✅ Integridad de datos

### 3. `run-complete-audit.sh` - Auditoría Completa
Ejecuta ambos scripts de auditoría y genera un reporte consolidado.

## 🚀 Uso

### Auditoría Completa (Recomendado)
```bash
# Desde la raíz del proyecto
./scripts/run-complete-audit.sh
```

### Auditorías Individuales
```bash
# Solo auditoría del sistema
node scripts/audit-system.js

# Solo auditoría de Supabase
node scripts/audit-supabase.js
```

## 📊 Reportes Generados

Los scripts generan reportes detallados en formato JSON y Markdown:

### Archivos de Salida
- `audit-reports/system-audit-report.json` - Reporte detallado de auditoría del sistema
- `audit-reports/supabase-audit-report.json` - Reporte detallado de auditoría de Supabase
- `audit-reports/consolidated-audit-report.md` - Reporte consolidado en Markdown

### Formato de Reporte
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "total": 25,
    "passed": 20,
    "failed": 3,
    "warnings": 2,
    "info": 0
  },
  "results": {
    "passed": [...],
    "failed": [...],
    "warnings": [...],
    "info": [...]
  }
}
```

## 🔍 Categorías de Verificación

### File Structure
- Verifica que existan todos los directorios y archivos requeridos
- Valida la estructura del proyecto Next.js

### Environment
- Verifica variables de entorno de Supabase
- Valida configuración de autenticación

### Dependencies
- Verifica dependencias requeridas en package.json
- Valida scripts de npm necesarios

### API Protection
- Verifica que todas las APIs privadas tengan autenticación
- Identifica APIs públicas (solo `/api/attendance/register` y `/api/attendance/debug`)

### Route Protection
- Verifica que todas las páginas privadas usen `<ProtectedRoute>`
- Identifica páginas públicas (solo `/registrodeasistencia`)

### Supabase Config
- Valida configuración de cliente y servidor de Supabase
- Verifica archivos de configuración

### Database Migrations
- Verifica existencia de migraciones
- Valida políticas RLS en migraciones

### Multi-tenant
- Verifica uso de `company_id` en componentes y APIs
- Valida filtrado por compañía

### Security
- Busca credenciales hardcodeadas
- Valida patrones de seguridad

### TypeScript
- Verifica configuración de TypeScript
- Valida modo estricto y otras configuraciones

### Connectivity
- Prueba conectividad con Supabase
- Valida acceso a la base de datos

### Table Structure
- Verifica existencia de tablas requeridas
- Valida estructura de columnas

### RLS Policies
- Verifica que las políticas RLS estén activas
- Valida protección de datos por compañía

### Authentication
- Verifica configuración de autenticación
- Valida sistema de usuarios

### User Roles
- Verifica columna de roles en user_profiles
- Valida sistema de permisos

### Data Integrity
- Verifica integridad referencial
- Busca registros huérfanos

## ⚠️ Códigos de Salida

- **0**: Todas las verificaciones pasaron
- **1**: Se encontraron errores o advertencias

## 🔧 Configuración Requerida

### Variables de Entorno
Asegúrate de tener configuradas las siguientes variables en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Dependencias
El script requiere las siguientes dependencias:
- `@supabase/supabase-js`
- Node.js 16+

## 🛠️ Integración con CI/CD

Puedes integrar estos scripts en tu pipeline de CI/CD:

```yaml
# Ejemplo para GitHub Actions
- name: Run System Audit
  run: |
    npm install
    ./scripts/run-complete-audit.sh
```

## 📝 Interpretación de Resultados

### ✅ Passed
- La verificación pasó correctamente
- El sistema cumple con el requisito

### ❌ Failed
- **CRÍTICO**: La verificación falló
- Debe ser corregido antes de continuar
- Indica un problema de seguridad o arquitectura

### ⚠️ Warning
- **IMPORTANTE**: Problema menor detectado
- Debe ser revisado y corregido
- No bloquea el funcionamiento pero puede causar problemas

### ℹ️ Info
- Información adicional
- No es un problema, solo información

## 🎯 Casos de Uso

### Desarrollo Local
```bash
# Antes de hacer commit
./scripts/run-complete-audit.sh
```

### Revisión de Código
```bash
# Para revisar cambios específicos
node scripts/audit-system.js
```

### Verificación de Producción
```bash
# Antes de deploy
./scripts/run-complete-audit.sh
```

### Debugging
```bash
# Para diagnosticar problemas específicos
node scripts/audit-supabase.js
```

## 🔄 Mantenimiento

### Actualizar Verificaciones
Para agregar nuevas verificaciones, edita los archivos correspondientes:

1. **audit-system.js**: Para verificaciones de arquitectura
2. **audit-supabase.js**: Para verificaciones de base de datos

### Agregar Nuevas Categorías
```javascript
// En el método runAudit()
this.checkNewCategory();
```

### Personalizar Reportes
Modifica el método `generateReport()` para cambiar el formato de salida.

## 📞 Soporte

Si encuentras problemas con los scripts de auditoría:

1. Verifica que estés en la raíz del proyecto
2. Asegúrate de que las variables de entorno estén configuradas
3. Revisa los logs de error en la consola
4. Consulta los reportes generados para más detalles

## 🚨 Problemas Comunes

### "Missing Supabase URL or Anon Key"
- Verifica que `.env.local` exista y contenga las variables correctas
- Asegúrate de que las variables no tengan espacios extra

### "Database connection failed"
- Verifica que Supabase esté funcionando
- Revisa las credenciales de conexión
- Asegúrate de que las tablas existan

### "No ProtectedRoute in private page"
- Agrega `<ProtectedRoute>` a la página
- Verifica que la importación sea correcta

### "No authentication check in private API"
- Agrega validación de autenticación a la API
- Usa `supabase.auth.getUser()` para verificar sesión 