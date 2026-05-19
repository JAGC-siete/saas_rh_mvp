# Humano SISU - Contexto del Proyecto

## 📌 Descripción General
**Humano SISU** es una plataforma SaaS de gestión de recursos humanos diseñada específicamente para el mercado de Honduras. Automatiza nómina, asistencia, gestión de empleados y gamificación, cumpliendo con las regulaciones locales (IHSS, RAP, ISR, decimotercero y decimocuarto salario).

---

## 🛠️ Stack Tecnológico
- **Framework**: [Next.js 15](https://nextjs.org/) (React 19) con TypeScript.
- **Base de Datos & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Edge Functions, Storage, RLS).
- **Estilos**: Tailwind CSS con diseño Glass Morphism y componentes shadcn/ui.
- **Infraestructura**: Desplegado en Railway, con soporte para Docker.
- **Backend Adicional**: 
  - Node.js (scripts de auditoría, cron jobs).
  - BullMQ con Redis para colas de trabajo.
  - Proxy para integración con dispositivos biométricos (Hikvision).
- **Comunicación**: Resend y SendGrid para correos electrónicos.

---

## 📂 Estructura del Código
- `/pages`: Rutas de Next.js (Dashboard en `/app`, Portal de empleados en `/employee-portal`).
- `/components`: Componentes React organizados por funcionalidad (UI, Asistencia, Nómina, etc.).
- `/lib`: Lógica compartida, hooks personalizados, utilidades de Supabase y servicios.
- `/services`: Lógica de negocio (Cálculo de nómina, procesamiento de asistencia).
- `/sql`: Definiciones de base de datos, políticas RLS y funciones PL/pgSQL.
- `/supabase`: Configuración y tipos generados de Supabase.
- `/docs`: Documentación detallada de arquitectura, diagnósticos y planes de implementación.

---

## 🏗️ Módulos Principales

### 1. Gestión de Nómina (Honduras)
- Cálculo automático siguiendo leyes locales.
- Soporte para frecuencias Semanal, Quincenal y Mensual.
- Gestión de deducciones (IHSS, RAP, ISR) y bonificaciones.
- Generación de comprobantes (Vouchers) en PDF y envío masivo por email.

### 2. Control de Asistencia
- Arquitectura de 3 capas (Eventos Crudos -> Procesamiento -> Registros Consolidados).
- Integración con biométricos Hikvision vía Proxy.
- Cálculo de horas extra, tardanzas y ausencias.

### 3. Gamificación y Portal del Empleado
- Sistema de logros, puntos y tabla de clasificación (Leaderboard).
- Acceso simplificado para empleados (OTP/DNI).
- Visualización de historial de pagos y solicitudes de permisos.

### 4. Administración (Super Admin)
- Gestión de múltiples empresas (Multi-tenant).
- Dashboard de métricas globales y salud del sistema.

---

## 🗄️ Modelo de Datos Clave
- `companies`: Datos de inquilinos (Tenants).
- `employees`: Información central del personal.
- `payroll_runs` & `payroll_run_lines`: Registro de ejecuciones de pago.
- `attendance_records`: Datos procesados de tiempo y asistencia.
- `achievement_types` & `employee_achievements`: Motor de gamificación.

---

## 🚦 Flujo de Desarrollo
- **Comandos Útiles**:
  - `npm run dev`: Inicia servidor de desarrollo.
  - `npm run audit`: Ejecuta auditoría completa del sistema.
  - `npm run staging:deploy`: Despliegue a entorno de pruebas.
- **Variables de Entorno**: Se requieren `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY`.

---

## 📑 Documentación de Referencia
- `DOCUMENTATION.md`: Guía técnica general.
- `README_LOGICA_ASISTENCIA.md`: Detalles del motor de asistencia.
- `IMPLEMENTATION_PLAN_SUPERADMIN.md`: Hoja de ruta para funciones administrativas.
- `docs/ARQUITECTURA_ASISTENCIA_3_CAPAS.md`: Diagrama del flujo de datos de asistencia.

---
**Versión**: 1.5.0 | **Estado**: Activo
