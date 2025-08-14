# 📊 ESTRUCTURA COMPLETA DE SUPABASE - SISTEMA HR

## 🏢 INFORMACIÓN REQUERIDA PARA UN NUEVO CLIENTE

### **1. COMPANY (Empresa Principal)**
```sql
TABLE: companies
```
**Campos Requeridos:**
- ✅ **name**: TEXT - Nombre de la empresa
- ✅ **subdomain**: TEXT - Subdominio único (opcional)
- ✅ **plan_type**: TEXT - Tipo de plan ('basic', 'premium', 'enterprise')
- ✅ **settings**: JSONB - Configuraciones específicas
- ✅ **is_active**: BOOLEAN - Estado activo

**Ejemplo:**
```json
{
  "name": "Distribuidora La Ceiba S.A.",
  "subdomain": "la-ceiba",
  "plan_type": "basic",
  "settings": {
    "timezone": "America/Tegucigalpa",
    "currency": "HNL",
    "language": "es"
  },
  "is_active": true
}
```

---

### **2. WORK_SCHEDULES (Horarios de Trabajo)**
```sql
TABLE: work_schedules
```
**Campos Requeridos:**
- ✅ **company_id**: UUID - ID de la empresa
- ✅ **name**: TEXT - Nombre del horario ("Horario Regular", "Medio Tiempo")
- ✅ **[day]_start/[day]_end**: TIME - Horarios por día
- ✅ **break_duration**: INTEGER - Duración de almuerzo en minutos
- ✅ **timezone**: TEXT - Zona horaria

**Ejemplo:**
```json
{
  "name": "Horario Regular",
  "monday_start": "08:00:00",
  "monday_end": "17:00:00",
  "tuesday_start": "08:00:00", 
  "tuesday_end": "17:00:00",
  "wednesday_start": "08:00:00",
  "wednesday_end": "17:00:00", 
  "thursday_start": "08:00:00",
  "thursday_end": "17:00:00",
  "friday_start": "08:00:00",
  "friday_end": "17:00:00",
  "saturday_start": null,
  "saturday_end": null,
  "sunday_start": null,
  "sunday_end": null,
  "break_duration": 60,
  "timezone": "America/Tegucigalpa"
}
```

---

### **3. DEPARTMENTS (Departamentos)**
```sql
TABLE: departments
```
**Campos Requeridos:**
- ✅ **company_id**: UUID - ID de la empresa
- ✅ **name**: TEXT - Nombre del departamento
- ✅ **description**: TEXT - Descripción (opcional)
- ✅ **manager_id**: UUID - ID del gerente (se asigna después)

**Ejemplos:**
```json
[
  {"name": "Real Madrid", "description": "Departamento administrativo"},
  {"name": "Barcelona", "description": "Departamento de ventas"},
  {"name": "Bayern Munich", "description": "Departamento de operaciones"}
]
```

---

### **4. EMPLOYEES (Empleados)**
```sql
TABLE: employees
```
**Campos Requeridos:**
- ✅ **company_id**: UUID - ID de la empresa
- ✅ **department_id**: UUID - ID del departamento
- ✅ **work_schedule_id**: UUID - ID del horario de trabajo
- ✅ **employee_code**: TEXT - Código único del empleado
- ✅ **dni**: TEXT - DNI/Cédula de identidad
- ✅ **name**: TEXT - Nombre completo
- ✅ **email**: TEXT - Correo electrónico
- ✅ **phone**: TEXT - Teléfono
- ✅ **role**: TEXT - Rol ('admin', 'manager', 'employee')
- ✅ **position**: TEXT - Puesto de trabajo
- ✅ **base_salary**: DECIMAL - Salario base
- ✅ **hire_date**: DATE - Fecha de contratación
- ✅ **status**: TEXT - Estado ('active', 'inactive', 'terminated')
- ✅ **bank_name**: TEXT - Nombre del banco
- ✅ **bank_account**: TEXT - Número de cuenta bancaria

**Ejemplo:**
```json
{
  "employee_code": "EMP001",
  "dni": "0801-1990-12345",
  "name": "David González", 
  "email": "david.gonzalez@laceiba.com",
  "phone": "+504 9999-1234",
  "role": "manager",
  "position": "Gerente de Ventas",
  "base_salary": 25000.00,
  "hire_date": "2024-01-15",
  "status": "active",
  "bank_name": "Banco Atlántida",
  "bank_account": "123456789"
}
```

---

### **5. USER_PROFILES (Perfiles de Usuario)**
```sql
TABLE: user_profiles
```
**Campos Requeridos:**
- ✅ **id**: UUID - ID del usuario de Supabase Auth
- ✅ **company_id**: UUID - ID de la empresa
- ✅ **employee_id**: UUID - ID del empleado (opcional)
- ✅ **role**: TEXT - Rol del sistema
- ✅ **permissions**: JSONB - Permisos específicos
- ✅ **is_active**: BOOLEAN - Estado activo

**Roles Disponibles:**
- `super_admin`: Administrador del sistema
- `company_admin`: Administrador de empresa
- `hr_manager`: Gerente de RH
- `manager`: Gerente de departamento
- `employee`: Empleado regular

---

### **6. LEAVE_TYPES (Tipos de Permisos)**
```sql
TABLE: leave_types
```
**Campos Requeridos:**
- ✅ **company_id**: UUID - ID de la empresa
- ✅ **name**: TEXT - Nombre del tipo de permiso
- ✅ **max_days_per_year**: INTEGER - Días máximos por año
- ✅ **is_paid**: BOOLEAN - Si es pagado o no
- ✅ **requires_approval**: BOOLEAN - Si requiere aprobación
- ✅ **color**: TEXT - Color para la interfaz

**Ejemplos:**
```json
[
  {
    "name": "Vacaciones",
    "max_days_per_year": 15,
    "is_paid": true,
    "requires_approval": true,
    "color": "#3498db"
  },
  {
    "name": "Enfermedad",
    "max_days_per_year": 10,
    "is_paid": true,
    "requires_approval": false,
    "color": "#e74c3c"
  },
  {
    "name": "Personal",
    "max_days_per_year": 5,
    "is_paid": false,
    "requires_approval": true,
    "color": "#f39c12"
  }
]
```

---

## 🎮 SISTEMA DE GAMIFICACIÓN

### **7. EMPLOYEE_SCORES (Puntajes de Empleados)**
```sql
TABLE: employee_scores
```
**Auto-inicializado al crear empleado:**
```json
{
  "total_points": 0,
  "weekly_points": 0,
  "monthly_points": 0,
  "punctuality_streak": 0,
  "early_arrival_count": 0,
  "perfect_week_count": 0
}
```

### **8. ACHIEVEMENT_TYPES (Tipos de Logros)**
**Ya incluye datos por defecto:**
- 🏆 Perfect Week (50 puntos)
- 🌅 Early Bird (30 puntos) 
- ⭐ Punctuality Champion (75 puntos)
- 📅 Month Master (100 puntos)
- 📈 Improvement Star (40 puntos)
- 👑 Consistency King (60 puntos)
- 🎯 Zero Tardiness (80 puntos)

---

## 📋 TABLAS ADMINISTRATIVAS (AUTO-CREADAS)

### **9. LOGGING SYSTEM**
- **system_logs**: Logs del sistema
- **audit_logs**: Logs de auditoría
- **data_backups**: Respaldos de datos
- **generated_reports**: Reportes generados
- **user_sessions**: Sesiones de usuario
- **job_executions**: Ejecución de trabajos

### **10. TABLAS DE OPERACIÓN**
- **attendance_records**: Registros de asistencia (se crean al usar)
- **leave_requests**: Solicitudes de permisos (se crean al usar)
- **payroll_records**: Registros de nómina (se crean al usar)
- **employee_achievements**: Logros obtenidos (se crean automáticamente)
- **point_history**: Historial de puntos (se crea automáticamente)

---

## ✅ ACTIVACIONES (Tabla de Solicitudes)

### **11. ACTIVACIONES**
```sql
TABLE: activaciones
```
**Campos:**
- ✅ **empleados**: INTEGER - Número de empleados
- ✅ **empresa**: TEXT - Nombre de la empresa
- ✅ **contacto_nombre**: TEXT - Nombre del contacto
- ✅ **contacto_whatsapp**: TEXT - WhatsApp del contacto
- ✅ **contacto_email**: TEXT - Email del contacto
- ✅ **departamentos**: JSONB - Información de departamentos
- ✅ **monto**: DECIMAL - Monto total
- ✅ **status**: TEXT - Estado ('pending', 'verified', 'active', 'rejected')

---

## 🚀 RESUMEN: DATOS MÍNIMOS PARA NUEVO CLIENTE

### **Datos de Entrada Necesarios:**
1. **Nombre de la empresa**
2. **Número de empleados** 
3. **Número de departamentos**
4. **Email y contraseña del administrador**
5. **Nombres de departamentos** (o usar nombres de equipos de fútbol)
6. **Horario de trabajo** (o usar horario estándar)

### **Lo que se genera automáticamente:**
- ✅ Company record
- ✅ Work schedules por defecto
- ✅ Departments con nombres de equipos de fútbol
- ✅ Employees con nombres bíblicos y salarios aleatorios
- ✅ User profile del administrador
- ✅ Leave types estándar
- ✅ Employee scores inicializados
- ✅ Achievement types (ya existen)

### **Datos que se crean durante operación:**
- Attendance records (al registrar asistencia)
- Leave requests (al solicitar permisos)
- Payroll records (al calcular nómina)  
- Employee achievements (al obtener logros)
- Point history (al ganar puntos)
- Audit logs (automáticamente)

**Total de tablas: 20+ tablas interconectadas**
**Relaciones: Multi-tenant con company_id + RLS policies**
