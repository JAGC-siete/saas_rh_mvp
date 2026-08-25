# 🚀 INSTRUCCIONES DE DEPLOYMENT - Sistema de Carga de Planillas

## ⚠️ IMPORTANTE: Orden de Ejecución

El error que recibiste fue porque intentaste ejecutar el archivo TypeScript de la Edge Function como si fuera SQL.

**Las Edge Functions NO se ejecutan con `db push`, se despliegan con `functions deploy`**

---

## 📝 PASO A PASO

### **PASO 1: Aplicar Migración SQL** ✅

**Opción A: Via Supabase Dashboard (RECOMENDADO)**

1. Ir a: https://supabase.com/dashboard/project/fwyxmovfrzauebiqxchz/sql/new
2. Copiar TODO el contenido de: `APPLY_VIA_DASHBOARD.sql`
3. Pegar en el editor
4. Click en "Run" (esquina inferior derecha)
5. Verificar que diga "Success. No rows returned"

**Opción B: Via CLI (si tienes password configurado)**

```bash
cd /Users/jorgearturo/saas-proyecto
supabase db push
```

### **PASO 2: Desplegar Edge Function** 🔥

**Importante**: Este archivo NO es SQL, es TypeScript que corre en Deno

```bash
cd /Users/jorgearturo/saas-proyecto
supabase functions deploy process-payroll
```

**Si sale error de login:**
```bash
supabase login
# Seguir instrucciones para login
supabase link --project-ref fwyxmovfrzauebiqxchz
# Luego retry deploy
supabase functions deploy process-payroll
```

### **PASO 3: Verificar Deployment** ✅

```bash
# Ver lista de funciones deployadas
supabase functions list

# Debería mostrar:
# - process-payroll (status: active)
```

### **PASO 4: Habilitar Realtime en Dashboard** 📡

1. Ir a: https://supabase.com/dashboard/project/fwyxmovfrzauebiqxchz/database/replication
2. Buscar tabla: `payroll_uploads`
3. Click en el switch para habilitarla
4. Verificar que esté en la lista de "Tables enabled for Realtime"

**O via SQL (ya incluido en APPLY_VIA_DASHBOARD.sql):**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE payroll_uploads;
```

### **PASO 5: Testing** 🧪

#### Test 1: Verificar que la migración se aplicó

```sql
-- En SQL Editor de Supabase Dashboard

-- 1. Verificar columnas nuevas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payroll_uploads' 
  AND column_name IN ('storage_path', 'storage_bucket');
-- Expected: 2 rows

-- 2. Verificar trigger existe
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_conversion';
-- Expected: 1 row

-- 3. Verificar policies de Storage
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%payroll%';
-- Expected: 4 rows (upload, read super_admin, read trial, delete)

-- 4. Verificar Realtime habilitado
SELECT * 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'payroll_uploads';
-- Expected: 1 row
```

#### Test 2: Probar Edge Function manualmente

```bash
# Invocar función directamente (esto NO procesará un archivo real, pero verifica que esté deployada)
curl -X POST https://fwyxmovfrzauebiqxchz.supabase.co/functions/v1/process-payroll \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected: Error (porque no tiene uploadId válido), pero confirma que función existe
```

#### Test 3: E2E desde UI

1. Ir a: http://localhost:3000/trial-dashboard?tenant=demo-trial-123 (o tu tenant de trial)
2. Click en "📄 Subir Planilla"
3. Arrastrar un archivo Excel de prueba
4. Observar:
   - ✅ "Solicitando permiso de carga..."
   - ✅ "Subiendo a Supabase Storage..."
   - ✅ "Procesando planilla en Edge Function..."
   - ✅ "✅ Procesado exitosamente! Se encontraron X empleados."

5. Verificar en DB:
```sql
SELECT 
  id,
  tenant_id,
  file_name,
  upload_status,
  storage_path,
  created_at
FROM payroll_uploads
ORDER BY created_at DESC
LIMIT 5;

-- Ver empleados extraídos
SELECT 
  extracted_name,
  extracted_salary,
  confidence_score
FROM payroll_extracted_employees
WHERE upload_id = 'UPLOAD_ID_FROM_ABOVE'
ORDER BY row_number;
```

---

## 🔍 TROUBLESHOOTING

### Error: "SSL connection is required"
**Solución**: Usar Dashboard para aplicar migración en vez de CLI

### Error: "Forgot your password?"
**Solución**: 
```bash
supabase login
# O aplicar via Dashboard
```

### Error: "syntax error at or near '//' " 
**Causa**: Intentaste ejecutar TypeScript como SQL
**Solución**: 
- SQL va a `db push` o Dashboard SQL Editor
- TypeScript va a `functions deploy`

### Edge Function no se ejecuta
**Verificar**:
```bash
# Ver logs en tiempo real
supabase functions logs process-payroll --tail

# O en Dashboard
# Functions → process-payroll → Logs
```

### Realtime no actualiza UI
**Verificar**:
```sql
-- Confirmar tabla en replication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'payroll_uploads';
```

**Si no está**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE payroll_uploads;
```

### Upload falla con 403
**Verificar tenant es trial activo**:
```sql
SELECT * FROM trial_access_users 
WHERE tenant_id = 'TU_TENANT' 
  AND is_active = true;
```

---

## 📋 CHECKLIST FINAL

- [ ] Migración SQL aplicada (via Dashboard o CLI)
- [ ] Edge Function deployada (`supabase functions deploy`)
- [ ] Realtime habilitado para `payroll_uploads`
- [ ] Verificación queries corridas (todas retornan datos esperados)
- [ ] Test E2E desde UI completado
- [ ] Logs de Edge Function sin errores

---

## 🎯 URLs IMPORTANTES

- **Supabase Dashboard**: https://supabase.com/dashboard/project/fwyxmovfrzauebiqxchz
- **SQL Editor**: https://supabase.com/dashboard/project/fwyxmovfrzauebiqxchz/sql/new
- **Storage Browser**: https://supabase.com/dashboard/project/fwyxmovfrzauebiqxchz/storage/buckets/HR_BUCKET
- **Functions**: https://supabase.com/dashboard/project/fwyxmovfrzauebiqxchz/functions
- **Realtime**: https://supabase.com/dashboard/project/fwyxmovfrzauebiqxchz/database/replication

---

## 🚨 SI TODO FALLA

Puedes aplicar manualmente cada parte:

1. **Storage RLS** - Copiar policies de APPLY_VIA_DASHBOARD.sql, ejecutar una por una
2. **Columnas** - `ALTER TABLE payroll_uploads ADD COLUMN storage_path text;`
3. **Trigger** - Copiar función y trigger del archivo
4. **Edge Function** - Verificar que carpeta existe, luego deploy
5. **Realtime** - `ALTER PUBLICATION supabase_realtime ADD TABLE payroll_uploads;`

---

¿Preguntas? Revisar PAYROLL_UPLOAD_SUPABASE_SETUP.md para documentación completa.
