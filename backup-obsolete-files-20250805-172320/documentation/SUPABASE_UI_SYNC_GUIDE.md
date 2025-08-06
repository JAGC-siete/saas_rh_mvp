# 🔄 Guía de Sincronización Supabase-UI

## 📋 Resumen

Esta guía te ayuda a asegurar que **Supabase esté completamente sincronizado con la UI** de tu SaaS de RRHH. Incluye scripts de verificación, diagnóstico y corrección automática.

## 🎯 Objetivos

1. **Verificar estructura de base de datos** - Confirmar que las tablas y campos coinciden con el esquema esperado
2. **Validar datos** - Asegurar que los datos están presentes y correctos
3. **Comprobar conectividad** - Verificar que la UI puede acceder a Supabase
4. **Diagnosticar problemas** - Identificar y resolver inconsistencias

## 🛠️ Scripts Disponibles

### 1. **Verificación Completa** (`verify-supabase-ui-sync.js`)
```bash
node verify-supabase-ui-sync.js
```
**Qué hace:**
- Verifica estructura de tablas
- Comprueba políticas RLS
- Valida conectividad de API
- Genera reporte detallado

### 2. **Verificación de Datos** (`verify-data-sync.js`)
```bash
node verify-data-sync.js
```
**Qué hace:**
- Verifica empleados en Supabase
- Comprueba horarios de trabajo
- Valida registros de asistencia
- Prueba acceso desde UI

### 3. **Sincronización Automática** (`sync-supabase-with-ui.sh`)
```bash
./sync-supabase-with-ui.sh
```
**Qué hace:**
- Aplica migraciones automáticamente
- Genera tipos TypeScript
- Ejecuta todas las verificaciones
- Proporciona reporte final

## 📊 Estructura Esperada

### **Tablas Principales**
```sql
companies          -- Empresas (multi-tenant)
employees          -- Empleados
departments        -- Departamentos
work_schedules     -- Horarios de trabajo
attendance_records -- Registros de asistencia
user_profiles      -- Perfiles de usuario
```

### **Campos Críticos**
```sql
-- employees
id, company_id, dni, name, status, work_schedule_id

-- work_schedules  
id, company_id, name, monday_start, monday_end

-- attendance_records
id, employee_id, date, check_in, status
```

## 🔍 Verificación Manual

### **1. Verificar Estructura en Supabase Dashboard**

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto
3. Ir a **Table Editor**
4. Verificar que todas las tablas existen:
   - ✅ `companies`
   - ✅ `employees` 
   - ✅ `departments`
   - ✅ `work_schedules`
   - ✅ `attendance_records`
   - ✅ `user_profiles`

### **2. Verificar Datos**

```sql
-- Verificar empleados
SELECT COUNT(*) FROM employees WHERE status = 'active';

-- Verificar horarios
SELECT COUNT(*) FROM work_schedules;

-- Verificar empresas
SELECT COUNT(*) FROM companies WHERE is_active = true;
```

### **3. Verificar Políticas RLS**

```sql
-- Verificar RLS habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'employees', 'work_schedules');
```

## 🚨 Problemas Comunes y Soluciones

### **Problema 1: Tablas Faltantes**
```bash
# Solución: Aplicar migraciones
supabase db reset
```

### **Problema 2: Datos Faltantes**
```bash
# Solución: Ejecutar migración de empleados
psql $SUPABASE_DB_URL -f supabase/migrations/20250727162447_complete_employee_migration.sql
```

### **Problema 3: RLS No Habilitado**
```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
```

### **Problema 4: Tipos TypeScript Desactualizados**
```bash
# Regenerar tipos
npx supabase gen types typescript --local > lib/database.types.ts
```

## 📈 Métricas de Sincronización

### **Indicadores de Éxito**
- ✅ **100% de tablas presentes**
- ✅ **Empleados activos > 0**
- ✅ **Horarios de trabajo configurados**
- ✅ **API endpoints responden**
- ✅ **RLS habilitado en tablas críticas**

### **Indicadores de Problema**
- ❌ **Tablas faltantes**
- ❌ **0 empleados activos**
- ❌ **API endpoints devuelven 404**
- ❌ **RLS deshabilitado**

## 🔧 Comandos de Diagnóstico

### **Verificar Estado de Supabase**
```bash
supabase status
```

### **Ver Logs de Supabase**
```bash
supabase logs
```

### **Resetear Base de Datos**
```bash
supabase db reset
```

### **Aplicar Migraciones Específicas**
```bash
supabase db push
```

## 📋 Checklist de Verificación

### **Antes de Deploy**
- [ ] Ejecutar `./sync-supabase-with-ui.sh`
- [ ] Verificar que todos los tests pasen
- [ ] Confirmar que la UI puede acceder a Supabase
- [ ] Probar registro de asistencia

### **Después de Deploy**
- [ ] Verificar variables de entorno en Railway
- [ ] Probar endpoints de API
- [ ] Confirmar que `/registrodeasistencia` funciona
- [ ] Validar login y dashboard

## 🎯 Flujo de Trabajo Recomendado

### **Desarrollo Local**
1. `./sync-supabase-with-ui.sh`
2. `npm run dev`
3. Probar funcionalidades
4. Hacer cambios
5. Repetir desde paso 1

### **Deploy a Producción**
1. `./sync-supabase-with-ui.sh`
2. `git add . && git commit -m "sync"`
3. `git push`
4. Verificar deploy en Railway
5. Probar en producción

## 🆘 Troubleshooting

### **Error: "Table not found"**
```bash
# Solución: Aplicar migraciones
supabase db reset
```

### **Error: "RLS policy error"**
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### **Error: "API 404"**
```bash
# Verificar Railway
railway logs
railway variables
```

### **Error: "TypeScript types"**
```bash
# Regenerar tipos
npx supabase gen types typescript --local > lib/database.types.ts
```

## 📞 Soporte

Si encuentras problemas:

1. **Ejecutar diagnóstico completo:**
   ```bash
   node verify-supabase-ui-sync.js
   node verify-data-sync.js
   ```

2. **Revisar logs:**
   ```bash
   supabase logs
   railway logs
   ```

3. **Resetear completamente:**
   ```bash
   supabase db reset
   ./sync-supabase-with-ui.sh
   ```

## 🎉 Conclusión

Con estos scripts y guías, puedes mantener **Supabase perfectamente sincronizado con tu UI**. La clave es ejecutar las verificaciones regularmente y actuar rápidamente si se detectan inconsistencias.

**¡Mantén tu sistema sincronizado y funcionando perfectamente!** 🚀 