# Diagnóstico: Dispositivos biométricos Destino Honduras (24 Feb 2026)

## Resumen

- **Empresa**: `c4692355-9b0c-4a2c-8283-7c0b872b6831` (Destino Honduras)
- **Dispositivos**:
  - `11d85681-5c74-4df0-b911-4ae1bcf0185a`: nunca registró en Supabase
  - `52e6bea2-241d-404a-8dd4-161f7308c656`: dejó de comunicar/registrar esta mañana
  - `8cde857a-e726-495b-8147-40255ae5281d`: único que actualmente envía y registra

---

## 1. Archivos modificados en el último commit

**Commit**: `5d32f314` - feat(payroll): Séptimo Día, hourly rate, voucher dinámico y columna seventh_day_pay

| Archivo | Impacto en biométricos |
|---------|------------------------|
| components/AddEmployeeForm.tsx | Ninguno |
| components/PayrollConfigEditor.tsx | Ninguno |
| lib/payroll/calculate-period-base-salary.ts | Ninguno |
| lib/payroll/period-dates.ts | Ninguno |
| lib/payroll/receipt.ts | Ninguno |
| lib/payroll/report.ts | Ninguno |
| lib/payroll/septimo-dia.ts | Ninguno |
| pages/api/employees/me/payroll-pdf.ts | Ninguno |
| pages/api/payroll/calculate.ts | Ninguno |
| pages/api/payroll/config.ts | Ninguno |
| pages/api/payroll/generate-pdf-from-run.ts | Ninguno |
| pages/api/payroll/preview.ts | Ninguno |
| pages/api/payroll/receipt-voucher.ts | Ninguno |
| supabase/migrations/20260224000002_add_seventh_day_pay.sql | Ninguno |

**Conclusión**: El último commit solo toca nómina. **No hay impacto en dispositivos biométricos.**

---

## 2. Archivos y configuraciones relacionadas con biométricos

### 2.1 Webhook de asistencia (punto de entrada principal)

| Archivo | Función |
|---------|---------|
| `pages/api/webhooks/attendance.ts` | Recibe eventos POST de dispositivos Hikvision, parsea multipart/JSON, procesa heartbeats y eventos de acceso |

### 2.2 Flujo para Destino Honduras (4 marcas)

- `FOUR_MARKS_COMPANY_ID = 'c4692355-9b0c-4a2c-8283-7c0b872b6831'`
- Función: `handleFourMarksEmployeeEvent` (líneas ~783-913)
- 1ª marca = check_in, 2ª = lunch_start, 3ª = lunch_end, 4ª = check_out

### 2.3 Otras piezas

| Archivo | Uso |
|---------|-----|
| `lib/attendance/best-fit-schedule.ts` | **No se usa** para FOUR_MARKS (solo para fixed/hourly) |
| `lib/timezone.ts` | Parseo de timestamps del dispositivo |
| `services/hikvision-proxy/` | Sincronización de empleados hacia dispositivos (no recepción de eventos) |
| `pages/api/hikvision/provision.ts` | Provisioning de dispositivos |
| `pages/api/admin/devices/status.ts` | Estado de dispositivos |

### 2.4 Tablas Supabase

- `devices`: ip_address, mac_address, webhook_url, last_seen_at, last_event_at
- `attendance_records`: employee_id, date, check_in, lunch_start, lunch_end, check_out, event_uid, metadata

---

## 3. Commits recientes que tocaron el webhook

| Commit | Fecha | Cambios en webhook | ¿Afecta FOUR_MARKS? |
|--------|-------|--------------------|---------------------|
| `2da81fa8` | 20 Feb 2026 | Ventanas 120→60 min (WINDOW_IN_BEFORE, etc.) | **No** – solo `handleFixedEmployeeEvent` |
| `e5d259db` | 18 Feb 2026 | Arquitectura 3 capas, Best Fit, `handleFourMarksEmployeeEvent` | **No** – FOUR_MARKS es flujo independiente |
| `51e72275` | (anterior) | Mejor logging para diagnóstico | No – solo logs |

**Conclusión**: Los cambios recientes en el webhook **no modifican** el flujo de 4 marcas (`handleFourMarksEmployeeEvent`). Las ventanas 60/120 min solo aplican a empleados `fixed` con horario, no a Destino Honduras.

---

## 4. ¿Por qué el dispositivo 52e6bea2 dejó de funcionar?

El webhook **no filtra por device_id**. Todos los dispositivos de la empresa envían al mismo endpoint:

```
POST /api/webhooks/attendance?company_id=c4692355-9b0c-4a2c-8283-7c0b872b6831
```

La lógica de procesamiento es idéntica para todos. Si 8cde857a registra y 52e6bea2 no, las causas probables están **fuera del código**:

### 4.1 Hipótesis más probables

1. **El dispositivo 52e6bea2 ya no envía eventos**
   - Problema de red (IP, firewall, DNS)
   - Webhook URL mal configurada o cambiada en el dispositivo
   - Dispositivo apagado o desconectado

2. **El dispositivo envía un payload distinto**
   - Sin `AccessControllerEvent` / `AcsEvent` → se trata como heartbeat
   - Sin `employeeNoString`, `cardNo`, `employeeNoHex`, etc. → no se encuentra empleado
   - Formato de JSON distinto (nesting, nombres de campos)

3. **Problema de infraestructura**
   - Cambio de IP/DNS del servidor
   - Rate limiting o bloqueo por IP
   - Timeout o error 5xx que hace que el dispositivo deje de reintentar

### 4.2 Qué revisar en logs (Railway/producción)

Buscar por `companyId: c4692355-9b0c-4a2c-8283-7c0b872b6831`:

| Log | Interpretación |
|-----|-----------------|
| `[WEBHOOK] Event classification` con `hasAcsEvent: false` | El payload no tiene AccessControllerEvent |
| `[ACCESS EVENT] No employee identifier found` | Falta DNI/employeeNo en el payload |
| `[ACCESS EVENT] Employee not found` | DNI no coincide con empleados en BD |
| `[FOUR_MARKS] 1ª marca: entrada registrada` | Evento procesado correctamente |
| `[HEARTBEAT] Device not found` | Dispositivo no está en `devices` por MAC/IP |

Si **no aparecen logs** para eventos del dispositivo 52e6bea2, el request no está llegando al servidor.

---

## 5. Checklist de diagnóstico

### 5.1 En Supabase

```sql
-- Estado de los 3 dispositivos
SELECT id, name, ip_address, mac_address, webhook_url, 
       last_seen_at, last_event_at, status, is_active
FROM devices
WHERE company_id = 'c4692355-9b0c-4a2c-8283-7c0b872b6831'
ORDER BY last_event_at DESC NULLS LAST;

-- Registros recientes por dispositivo (via metadata si existe device_id)
-- Nota: el webhook no guarda device_id en attendance_records, solo metadata (doorNo, readerNo, etc.)
SELECT ar.date, ar.check_in, ar.metadata, e.name
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
WHERE e.company_id = 'c4692355-9b0c-4a2c-8283-7c0b872b6831'
  AND ar.date >= CURRENT_DATE - 3
ORDER BY ar.check_in DESC
LIMIT 50;
```

### 5.2 En el dispositivo 52e6bea2

- [ ] Verificar que la URL del webhook sea la correcta (misma que 8cde857a)
- [ ] Comprobar conectividad (ping, DNS)
- [ ] Revisar en la interfaz del dispositivo: Event → HTTP Notification
- [ ] Confirmar que los usuarios tengan **Employee No** = DNI configurado

### 5.3 En el servidor

- [ ] Confirmar que `SUPABASE_SERVICE_ROLE_KEY` esté configurado (evita bloqueos RLS)
- [ ] Revisar logs para ver si llegan requests del dispositivo 52e6bea2 (por IP si es fija)

---

## 6. Conclusión

**No hay evidencia de que los cambios recientes en el código hayan afectado al dispositivo 52e6bea2.** El flujo de 4 marcas para Destino Honduras no fue modificado en los últimos commits.

El problema apunta a:

1. **Configuración o conectividad del dispositivo** (webhook URL, red, dispositivo apagado)
2. **Formato del payload** distinto al del dispositivo que sí funciona
3. **Infraestructura** (DNS, firewall, rate limiting)

**Siguiente paso recomendado**: Revisar logs de producción para comprobar si llegan eventos del dispositivo 52e6bea2. Si no hay logs, el fallo está antes del servidor (dispositivo o red).
