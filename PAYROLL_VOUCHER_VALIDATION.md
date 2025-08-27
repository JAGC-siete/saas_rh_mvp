# 🎯 Payroll & Voucher Validation Guide

## 📋 Overview

Este documento describe cómo validar y verificar que todas las funcionalidades de nómina y vouchers del SaaS HR multi-tenant estén funcionando correctamente.

## 🎯 Definition of Done

### 1. Payroll (Nómina General)
- [x] **UI**: Sección "Generar Nómina" con dropdowns: Año, Mes, Quincena (Q1/Q2), Tipo (CON/SIN deducciones)
- [x] **Flow**: Botones: [Generar Preview] → [Ver/Editar] → [Autorizar/Generar] → [Enviar por Mail] / [Enviar por WhatsApp]
- [x] **Tenancy**: Preview y generación incluyen SOLO empleados `active=true` de `company_uuid` del user
- [x] **Output**: Genera archivo consolidado (PDF/ZIP según diseño actual) listo para envío
- [x] **Auth**: Envío por mail y WhatsApp usa credenciales válidas del usuario; no cruza empresas
- [x] **Errors**: Sin "send failed" ni "no se pudo verificar la autenticación"; errores se registran con logs estructurados

### 2. Voucher (Comprobante Individual)
- [x] **UI**: Sección "Generar Voucher" con los mismos dropdowns (Año, Mes, Q, CON/SIN)
- [x] **Flow**: [Generar Preview] → [Ver/Editar] → [Autorizar/Generar] → [Enviar por Mail] / [Enviar por WhatsApp]
- [x] **Tenancy**: El PDF es EXCLUSIVO del empleado seleccionado de la misma `company_uuid`
- [x] **Output**: PDF individual firmado/datable (incluye totales: bruto, deducciones, neto)
- [x] **Auth**: Mismo criterio de envío y permisos

### 3. Multi-tenant & Seguridad
- [x] **TODAS** las queries usan `company_uuid` del session token
- [x] **PROHIBIDO** incluir empleados de la "empresa demo" salvo que coincida el `company_uuid`
- [x] **No hay fugas** entre tenants en endpoints, colas, storage o URLs firmadas

### 4. Observabilidad
- [x] **Logging estructurado** (JSON) con: `feature`, `action`, `company_uuid`, `user_id`, `result`, `error_code`
- [x] **Mensajes de error útiles** para soporte; nada de stack traces crudos al cliente

## 🧪 Validation Tests

### A. Unit Tests (Filtering & Calc)
```bash
npm test
```

**Tests incluidos:**
- ✅ `employeesService`: retorna SOLO `active=true` de `company_uuid` actual
- ✅ `payrollCalc`: totales por CON/SIN deducciones para casos base
- ✅ `voucherCalc`: mismo que payroll pero por empleado
- ✅ `TenantValidation`: seguridad y validación de empresa
- ✅ `EmailSending`: validación de credenciales y respuestas
- ✅ `WhatsAppSending`: validación de formato y enlaces

### B. Integration Tests (API/Server Actions)
```bash
npm test tests/api-integration.test.js
```

**Tests incluidos:**
- ✅ `POST /payroll/preview`: con session de Company A devuelve count == número de activos de Company A
- ✅ `POST /payroll/generate`: bloquea, persiste "run" y produce archivo consolidado; no mezcla Company B
- ✅ `POST /voucher/generate`: requiere employee_id perteneciente a Company A; rechaza si no coincide tenant
- ✅ `POST /send/email` y `/send/whatsapp`: responden 200 con `message_id` cuando creds están correctas; retornan 401/403 con JSON consistente si token inválido

### C. E2E Tests (Playwright)
```bash
npx playwright test tests/e2e-payroll.spec.js
```

**Tests incluidos:**
- ✅ **"Payroll happy path"**: login Company A → select Año/Mes/Q/Tipo → Preview → Edit → Autorizar → Enviar Mail → ver toast "Enviado"
- ✅ **"Voucher happy path"**: login Company A → elegir empleado propio → Preview → Autorizar → Enviar WhatsApp → ver toast "Enviado"
- ✅ **"Cross-tenant guard"**: login Company A intenta generar con employee_id de Company B → debe fallar con 403 y log con `error_code=TENANT_MISMATCH`

## 🚀 Quick Validation Script

Para ejecutar todas las validaciones de una vez:

```bash
./scripts/run-validation-tests.sh
```

Este script ejecuta:
1. ✅ Tests unitarios
2. ✅ Linting
3. ✅ TypeScript compilation
4. ✅ Verificación de estructura de archivos
5. ✅ Verificación de APIs implementadas

## 🔧 Manual Validation Steps

### 1. Verificar Filtrado de Empleados
```bash
# Ejecutar test específico
npm test tests/payroll.test.js -- --grep "should return only active employees"
```

**Resultado esperado:**
- Company A: 2 empleados activos
- No incluir empleados de "empresa demo"
- No incluir empleados inactivos

### 2. Verificar Cálculos de Nómina
```bash
# Ejecutar test específico
npm test tests/payroll.test.js -- --grep "should calculate ISR correctly"
```

**Resultado esperado:**
- ISR calculado correctamente según tabla 2025
- IHSS con techo L 11,903.13
- RAP sobre excedente del salario mínimo

### 3. Verificar Seguridad Multi-tenant
```bash
# Ejecutar test específico
npm test tests/api-integration.test.js -- --grep "should block cross-tenant access"
```

**Resultado esperado:**
- Error 403 con `error_code=TENANT_MISMATCH`
- No acceso a datos de otras empresas

### 4. Verificar Envío de Emails
```bash
# Ejecutar test específico
npm test tests/api-integration.test.js -- --grep "should return 200 with message_id when credentials are valid"
```

**Resultado esperado:**
- 200 con `message_id` cuando credenciales válidas
- 401/403 con JSON consistente cuando inválidas

## 📊 Expected Test Results

### Unit Tests
```
ℹ tests 22
ℹ suites 6
ℹ pass 22
ℹ fail 0
```

### Integration Tests
```
ℹ tests 8
ℹ suites 1
ℹ pass 8
ℹ fail 0
```

### E2E Tests (Playwright)
```
ℹ tests 6
ℹ suites 1
ℹ pass 6
ℹ fail 0
```

## ⚠️ Common Issues & Fixes

### 1. Filtrado Incorrecto de Empleados (46 vs 36)
**Síntoma**: Se incluyen empleados de la empresa demo
**Solución**: Verificar que todas las queries incluyan `WHERE company_uuid = session.company_uuid AND active = true`

### 2. Envío por Mail "send failed"
**Síntoma**: Error de credenciales SMTP
**Solución**: Verificar `RESEND_API_KEY` en variables de entorno por tenant

### 3. Envío por WhatsApp "no se pudo verificar la autenticación"
**Síntoma**: Error de token/sesión del proveedor
**Solución**: Validar credenciales de WhatsApp y refresh si expiran

### 4. Tests Failing
**Síntoma**: Tests no pasan
**Solución**: Ejecutar `npm test` y revisar errores específicos

## 🔒 Security Checklist

- [x] **Multi-tenant isolation**: Cada usuario solo ve datos de su empresa
- [x] **Authentication required**: Todas las APIs requieren usuario autenticado
- [x] **Authorization checks**: Verificación de permisos antes de operaciones
- [x] **Input validation**: Validación de parámetros de entrada
- [x] **Error handling**: Manejo seguro de errores sin exponer información sensible
- [x] **Logging**: Auditoría completa de todas las operaciones

## 📈 Monitoring & Observability

### Logs Estructurados
```json
{
  "feature": "payroll",
  "action": "generate_preview",
  "company_uuid": "company-a-123",
  "user_id": "user-1",
  "result": "success",
  "employee_count": 2,
  "timestamp": "2025-01-27T10:00:00Z"
}
```

### Error Codes
- `TENANT_MISMATCH`: Intento de acceso a empresa no autorizada
- `MAIL_CONFIG_MISSING`: Credenciales de email no configuradas
- `WHATSAPP_AUTH_FAILED`: Credenciales de WhatsApp inválidas
- `EMPLOYEE_TENANT_MISMATCH`: Empleado no pertenece a la empresa actual

## 🎉 Success Criteria

El sistema está **VALIDADO** cuando:

1. ✅ **Todos los tests pasan** (Unit + Integration + E2E)
2. ✅ **Payroll preview/generate** no incluye empleados de otro tenant
3. ✅ **Envíos por Mail y WhatsApp** retornan 200 con IDs cuando hay creds; 401/403 con JSON consistente cuando no
4. ✅ **Logs estructurados** visibles con `company_uuid` y `error_code`
5. ✅ **Multi-tenancy** funciona correctamente sin fugas de datos
6. ✅ **Seguridad** implementada en todas las capas

## 🚀 Deployment Ready

Una vez que todas las validaciones pasen:

```bash
# Build de producción
npm run build

# Verificar que no hay errores
npm run lint
npx tsc --noEmit

# Deploy
npm run deploy
```

## 📞 Support

Si encuentras problemas durante la validación:

1. **Revisar logs** para identificar errores específicos
2. **Ejecutar tests individuales** para aislar problemas
3. **Verificar configuración** de entorno y credenciales
4. **Consultar documentación** de APIs y componentes

---

**Última validación**: 27 de Enero, 2025  
**Estado**: ✅ VALIDADO Y LISTO PARA PRODUCCIÓN  
**Branch**: `develop`
