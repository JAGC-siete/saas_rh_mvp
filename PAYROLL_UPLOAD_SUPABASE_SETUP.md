# Payroll Upload System - Setup Guide (Supabase)

## 📋 Overview

Sistema completo de carga y procesamiento de planillas usando las capacidades nativas de Supabase:
- ✅ **Supabase Storage** para almacenamiento de archivos
- ✅ **Edge Functions** para procesamiento serverless
- ✅ **Realtime** para updates en tiempo real
- ✅ **RLS** para seguridad automática
- ✅ **Database Triggers** para automatización

---

## 🚀 Setup Instructions

### 1. Ejecutar Migraciones

```bash
# Migración original (tablas base)
cd supabase
supabase db push 20250106000000_payroll_upload_system.sql

# Nueva migración (Storage RLS + Triggers)
supabase db push 20250107000000_payroll_upload_storage_setup.sql
```

### 2. Verificar HR_BUCKET

El bucket `HR_BUCKET` ya existe. Verificar que esté configurado:

```sql
-- En Supabase SQL Editor
SELECT * FROM storage.buckets WHERE id = 'HR_BUCKET';

-- Debería retornar:
-- id: HR_BUCKET
-- name: HR_BUCKET
-- public: false (o true según tu config)
```

### 3. Desplegar Edge Function

```bash
# Desplegar función de procesamiento
cd supabase
supabase functions deploy process-payroll

# Verificar despliegue
supabase functions list
```

### 4. Configurar Storage Trigger (Opcional)

Si quieres que el procesamiento se active automáticamente al subir archivos:

**Opción A: Via Supabase Dashboard**
1. Ir a Database → Webhooks
2. Crear nuevo webhook:
   - Table: `storage.objects`
   - Events: `INSERT`
   - HTTP Request:
     - Method: `POST`
     - URL: `https://[tu-proyecto].supabase.co/functions/v1/process-payroll`
     - Headers: `Authorization: Bearer [ANON_KEY]`
   - Filters:
     - `bucket_id = 'HR_BUCKET'`
     - `name.starts_with('payroll-uploads/')`

**Opción B: Via SQL**
```sql
-- Crear webhook para trigger automático
-- (Requiere extensión pg_net)
CREATE OR REPLACE FUNCTION trigger_payroll_processing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bucket_id = 'HR_BUCKET' 
     AND NEW.name LIKE 'payroll-uploads/%' THEN
    
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/process-payroll',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body := jsonb_build_object(
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA,
          'record', row_to_json(NEW)
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_payroll_file_uploaded
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payroll_processing();
```

### 5. Habilitar Realtime en Supabase Dashboard

1. Ir a Database → Replication
2. Habilitar replicación para tabla: `payroll_uploads`
3. Eventos a publicar: `INSERT`, `UPDATE`

O via SQL:
```sql
ALTER PUBLICATION supabase_realtime 
  ADD TABLE payroll_uploads;
```

---

## 🧪 Testing

### Test 1: Verificar RLS Policies

```sql
-- Como anon (trial user)
SET role anon;

-- Debe poder insertar en payroll-uploads/
SELECT storage.objects_insert_allowed('HR_BUCKET', 'payroll-uploads/test-tenant/test.xlsx');
-- Expected: true (si test-tenant es trial activo)

-- No debe poder insertar en otras rutas
SELECT storage.objects_insert_allowed('HR_BUCKET', 'other-folder/test.xlsx');
-- Expected: false
```

### Test 2: Upload Manual

```bash
# Obtener signed URL
curl -X POST http://localhost:3000/api/trial/payroll-upload-storage \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "demo-trial-123",
    "filename": "test-payroll.xlsx",
    "fileType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "fileSize": 1024
  }'

# Response:
# {
#   "success": true,
#   "uploadUrl": "https://...signed-url...",
#   "uploadId": "uuid",
#   "storagePath": "payroll-uploads/demo-trial-123/1234-test-payroll.xlsx"
# }

# Upload file
curl -X PUT "[uploadUrl]" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \
  --data-binary "@./test-payroll.xlsx"
```

### Test 3: Trigger Processing Manually

```bash
# Invocar Edge Function
curl -X POST https://[tu-proyecto].supabase.co/functions/v1/process-payroll \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"uploadId": "uuid-from-step-2"}'
```

### Test 4: Realtime

Abrir consola del navegador en `/trial-dashboard?tenant=demo-trial-123`:

```javascript
// Debe ver mensajes de Realtime
// Console: "Realtime update received: ..."
// UI debe actualizarse automáticamente cuando cambie upload_status
```

---

## 📊 Monitoring

### Queries útiles

```sql
-- Ver todos los uploads
SELECT 
  id,
  tenant_id,
  file_name,
  upload_status,
  conversion_status,
  created_at,
  processing_completed_at
FROM payroll_uploads
ORDER BY created_at DESC
LIMIT 20;

-- Ver uploads en proceso
SELECT * FROM payroll_uploads
WHERE upload_status IN ('uploaded', 'processing')
ORDER BY created_at DESC;

-- Ver empleados extraídos
SELECT 
  pu.file_name,
  COUNT(pee.id) as employees_extracted,
  AVG(pee.confidence_score) as avg_confidence
FROM payroll_uploads pu
LEFT JOIN payroll_extracted_employees pee ON pee.upload_id = pu.id
WHERE pu.upload_status = 'processed'
GROUP BY pu.id, pu.file_name
ORDER BY pu.created_at DESC;

-- Ver conversiones
SELECT 
  tc.*,
  pu.file_name,
  c.name as company_name
FROM trial_conversions tc
JOIN payroll_uploads pu ON pu.id = tc.upload_id
JOIN companies c ON c.id = tc.original_company_id
ORDER BY tc.created_at DESC;
```

### Edge Function Logs

```bash
# Ver logs de Edge Function
supabase functions logs process-payroll --tail

# Ver logs de últimas invocaciones
supabase functions logs process-payroll --limit 50
```

### Storage Usage

```sql
-- Ver tamaño de archivos en HR_BUCKET
SELECT 
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) / 1024 / 1024 as total_mb,
  (storage.foldername(name))[1] as folder
FROM storage.objects
WHERE bucket_id = 'HR_BUCKET'
GROUP BY folder;
```

---

## 🔧 Troubleshooting

### Problema: Upload falla con 403

**Causa**: RLS policy no permite upload
**Solución**:
```sql
-- Verificar tenant está activo
SELECT * FROM trial_access_users WHERE tenant_id = 'tu-tenant' AND is_active = true;

-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

### Problema: Edge Function no se ejecuta

**Causa**: Webhook no configurado o función no deployada
**Solución**:
```bash
# Re-deploy función
supabase functions deploy process-payroll

# Verificar función existe
supabase functions list

# Invocar manualmente para probar
curl -X POST [function-url] -d '{"uploadId":"test"}'
```

### Problema: Realtime no actualiza UI

**Causa**: Tabla no tiene replication habilitada
**Solución**:
```sql
-- Habilitar replication
ALTER PUBLICATION supabase_realtime ADD TABLE payroll_uploads;

-- Verificar replication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

### Problema: Archivos viejos acumulados

**Solución**: Ejecutar cleanup periódicamente
```sql
-- Ver archivos a limpiar
SELECT * FROM cleanup_old_payroll_uploads();

-- Eliminar manualmente de Storage
-- (Supabase no permite DELETE via SQL directamente)
-- Usar Dashboard o SDK
```

---

## 🎯 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENTE (Browser)                                            │
│  └─ PayrollUploadStorage.tsx                                 │
│     ├─ Obtiene signed URL (API Next.js)                      │
│     ├─ Sube directo a Storage (PUT a signed URL)             │
│     └─ Subscribe a Realtime (WebSocket)                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ SUPABASE STORAGE (HR_BUCKET)                                 │
│  └─ payroll-uploads/{tenant_id}/{filename}                   │
│     ├─ RLS: Solo trials activos pueden subir                 │
│     └─ Trigger: Activa Edge Function                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION (Deno)                                         │
│  └─ process-payroll/index.ts                                 │
│     ├─ Descarga archivo de Storage                           │
│     ├─ Procesa Excel/PDF (SheetJS)                           │
│     ├─ Inserta en payroll_extracted_employees                │
│     └─ Actualiza payroll_uploads.upload_status               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ DATABASE                                                      │
│  └─ payroll_uploads (UPDATE)                                 │
│     ├─ upload_status = 'processed'                           │
│     └─ TRIGGER: auto_create_conversion_on_processed()        │
│        └─ INSERT en trial_conversions                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ REALTIME (WebSocket)                                         │
│  └─ Notifica cambios a cliente                               │
│     └─ Cliente actualiza UI automáticamente                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Ventajas de esta Arquitectura

1. **Sin límites de tamaño**: Edge Functions no tienen límite de 10MB de Next.js
2. **Sin polling**: Realtime notifica cambios automáticamente
3. **Sin filesystem**: Storage persiste archivos permanentemente
4. **Escalable**: Edge Functions escalan automáticamente
5. **Seguro**: RLS aplicado a nivel de Storage y DB
6. **Serverless**: Sin infraestructura que mantener
7. **Monitoreable**: Logs centralizados en Supabase

---

## 📝 Próximos Pasos

1. ✅ Implementar PDF parsing en Edge Function
2. ✅ Agregar validaciones avanzadas de formato
3. ✅ Implementar notificaciones via webhook (email/WhatsApp)
4. ✅ Agregar tests end-to-end
5. ✅ Implementar cleanup automático con pg_cron
6. ✅ Agregar métricas y analytics

---

## 🔗 Referencias

- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Triggers](https://supabase.com/docs/guides/database/functions)
