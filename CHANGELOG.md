# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-09

### 🎉 MVP 100% Funcional - Release Completo

**Highlights:**
- ✅ **Integración Biométrica Completa**: Sistema integrado con dispositivos Hikvision DS-K1T344MBWX-QRE1
- ✅ **Ecosistema Completo**: Biométrico, sincronización, generación de planilla, control de asistencia y constancias de trabajo
- ✅ **Cumplimiento Legal**: Sistema en cumplimiento con la legislación hondureña

### Añadido
- **Integración Biométrica Hikvision**
  - Webhook para recibir eventos desde dispositivos Hikvision DS-K1T344MBWX-QRE1
  - SDK completo para comunicación bidireccional con dispositivos biométricos
  - Sistema de provisionamiento automático de dispositivos
  - Soporte para eventos AccessControllerEvent según manual ISAPI
  - Parser multipart/form-data para eventos del dispositivo
  - Sistema de idempotencia con event_uid para evitar duplicados
  - Metadata de dispositivo almacenada en registros de asistencia
  - Health checks y monitoreo de estado de dispositivos
  - Configuración automática de notificaciones en dispositivos

- **Sistema de Asistencia Mejorado**
  - Cálculo automático de tardanzas (late_minutes)
  - Lógica diferenciada por tipo de pago (fixed/hourly)
  - Visualización de todos los presentes en tiempo real
  - Normalización centralizada de datos de empleados
  - Manejo resiliente de sync_status column
  - Conversión correcta de zonas horarias (Honduras UTC-6)
  - Registro de asistencia con validación de ubicación (opcional)

- **Sistema de Nómina Avanzado**
  - Separación de nómina por tipo de empleado (fixed/hourly)
  - Paginación independiente para tablas fixed y hourly
  - Mejora en cálculos de total_earnings para empleados hourly
  - Filtrado por company_id en todas las consultas
  - Mejor manejo de errores y validaciones
  - Retorno de datos vacíos en lugar de errores 400 cuando no hay datos

- **Mejoras de Seguridad y RLS**
  - Restauración de consulta directa desde cliente respetando RLS (patrón recomendado Supabase)
  - Eliminación de bypass RLS innecesario
  - Mejora en políticas de seguridad Row Level Security
  - Validación de autenticación mejorada
  - Logging detallado para diagnóstico de problemas de seguridad

- **Mejoras de UX**
  - Experiencia mejorada al editar empleados
  - Exposición y edición de pay_type en frontend
  - Mejor manejo de errores con mensajes descriptivos
  - Logging detallado para diagnóstico de problemas

- **Infraestructura**
  - Migración completa a @supabase/ssr
  - Eliminación de dependencias deprecadas
  - Optimización de Dockerfile
  - Refactorización de inicialización de Supabase
  - Mejoras en manejo de errores del servidor

### Cambiado
- Refactorización de consultas para respetar RLS en lugar de usar admin client
- Mejora en el manejo de timezone para Honduras (America/Tegucigalpa)
- Optimización de triggers para usar company_id en payroll_snapshots
- Mejora en formato de hora en check-ins
- Actualización de textos y optimización responsive mobile/desktop
- Unificación de MainHeader y fondo bg-app en todas las páginas principales

### Corregido
- Error 'Sin Empresa Asignada' con mejor logging y diagnóstico
- Errores 500 en check-ins
- Formato de hora incorrecto en formatTimeDisplay
- Comparación de DNIs en TypeScript
- Errores de build relacionados con iconos (RobotIcon → BoltIcon/CpuChipIcon)
- Problemas de sincronización de package-lock.json
- Errores de inicialización de Supabase en build
- Problemas de compilación de dependencias nativas (bcrypt) en Docker

### Seguridad
- Implementación de patrón RLS recomendado por Supabase
- Eliminación de bypass RLS innecesario
- Mejora en validación de datos de entrada
- Sanitización mejorada de identificadores de empleados

## [1.5.0] - 2024-12-XX

### Añadido
- Sistema completo de gestión de empleados
- Módulo de nómina con cálculos automáticos (IHSS, RAP, ISR)
- Sistema de control de asistencia
- Gamificación con logros y puntos
- Dashboard ejecutivo con KPIs
- Generación de vouchers individuales
- Exportación a PDF y Excel
- Envío de nóminas por email
- Sistema de roles y permisos
- Logs de auditoría
- Interfaz con Glass Morphism
- Responsive design
- Multi-tenant architecture

### Cambiado
- Migración de PayrollManager a PayrollManagerNew
- Unificación de tablas de nómina y detalle de empleados
- Mejora en la legibilidad del glass effect
- Optimización de consultas de base de datos
- Consolidación de utilidades de formato de moneda

### Corregido
- Errores de TypeScript en componentes
- Problemas de contraste en tema oscuro
- Cálculos incorrectos en nómina
- Bugs en la generación de PDFs
- Problemas de autenticación

### Eliminado
- Código duplicado en PayrollManager
- Componentes no utilizados (VoucherGenerator, CertificateModal)
- Documentación redundante (1,200+ archivos .md)
- Scripts de migración obsoletos
- Archivos temporales y logs de desarrollo

### Seguridad
- Implementación de validación de datos
- Sanitización de inputs
- Headers de seguridad
- Rate limiting en APIs
- Encriptación de datos sensibles

## [1.0.0] - 2024-12-XX

### Añadido
- Sistema completo de gestión de empleados
- Módulo de nómina con cálculos automáticos (IHSS, RAP, ISR)
- Sistema de control de asistencia
- Gamificación con logros y puntos
- Dashboard ejecutivo con KPIs
- Generación de vouchers individuales
- Exportación a PDF y Excel
- Envío de nóminas por email
- Sistema de roles y permisos
- Logs de auditoría
- Interfaz con Glass Morphism
- Responsive design
- Multi-tenant architecture

### Cambiado
- Migración de PayrollManager a PayrollManagerNew
- Unificación de tablas de nómina y detalle de empleados
- Mejora en la legibilidad del glass effect
- Optimización de consultas de base de datos
- Consolidación de utilidades de formato de moneda

### Corregido
- Errores de TypeScript en componentes
- Problemas de contraste en tema oscuro
- Cálculos incorrectos en nómina
- Bugs en la generación de PDFs
- Problemas de autenticación

### Eliminado
- Código duplicado en PayrollManager
- Componentes no utilizados (VoucherGenerator, CertificateModal)
- Documentación redundante (1,200+ archivos .md)
- Scripts de migración obsoletos
- Archivos temporales y logs de desarrollo

### Seguridad
- Implementación de validación de datos
- Sanitización de inputs
- Headers de seguridad
- Rate limiting en APIs
- Encriptación de datos sensibles

## [0.9.0] - 2024-11-XX

### Añadido
- Sistema básico de nómina
- Control de asistencia inicial
- Autenticación con Supabase
- Interfaz de usuario básica

### Cambiado
- Migración de Firebase a Supabase
- Refactorización de componentes

## [0.8.0] - 2024-10-XX

### Añadido
- Estructura inicial del proyecto
- Configuración de Next.js
- Setup de Tailwind CSS
- Integración con Supabase

---

## Tipos de Cambios

- **Añadido** para nuevas funcionalidades
- **Cambiado** para cambios en funcionalidades existentes
- **Deprecado** para funcionalidades que serán eliminadas
- **Eliminado** para funcionalidades eliminadas
- **Corregido** para corrección de bugs
- **Seguridad** para vulnerabilidades de seguridad
