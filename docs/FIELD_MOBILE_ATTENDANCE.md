# Asistencia de campo (móvil) — WebAuthn + georreferencia

Extiende el registro público por DNI para personal **sin terminal biométrica fija**.
Ruta: `/attendance/field` · APIs: `/api/attendance/field/*`.

Pipeline distinto del webhook Hikvision (`raw_punch`). El punch de campo escribe
`attendance_records` + `attendance_events` con `source: field_mobile` (mismo patrón
que `/api/attendance/register`).

**Amenaza honestamente:** WebAuthn prueba el **dispositivo vinculado**, no “esta persona
conoce el DNI”. El enroll exige **token de RR.HH.** (one-shot). Sin token, DNI solo no enrolla.

---

## Flujo UX (check-in / check-out)

1. Empleado abre `/attendance/field` (HTTPS).
2. Capacidad: WebAuthn + platform authenticator.
3. DNI (13) o last5 → si ambiguo, **409** con selector de empresa (no exige `company_id` a ciegas).
4. GPS → lat, lon, accuracy, timestamp.
5. **Primera vez:** RR.HH. emite token (`POST /api/attendance/field/enroll-token`) → empleado lo pega → enroll WebAuthn (máx **1** credencial activa; passkeys sincronizadas rechazadas).
6. Assert biométrico → `POST .../punch`.
7. Acción: `decideFieldPunchAction` — shell `absent` sin marcas = **check_in** (no check_out).
8. Sin ventana call-center 11:00; solo horario efectivo + reglas de tarde.

```
DNI → GPS → [token RRHH + enroll si falta] → Face/Touch ID → punch
```

---

## Pareto harden (vs daily-close / identidad)

| Riesgo | Mitigación |
|--------|------------|
| Daily-close crea `absent` mid-day → primer punch = checkout | Punch trata shell sin marcas como check_in. Daily-close **no** fuerza absent si el empleado tiene credencial de campo activa. Records con `flags.field_protected` / `channel: field_mobile` están locked para daily-close. |
| Enroll = quien conoce el DNI | Token one-shot HR + 1 credencial activa + reject `backed_up` / multiDevice |
| Ventana 11:00 kiosk | Eliminada en campo |
| last5 + company_id a priori | Lookup primero; 409 con suggestions |
| Rate limit 6/2min | Bucket `attendance_field` 24/2min |
| Evento fantasma / sin idempotencia | `event_uid`, `local_date`, `tz`; fallo si insert de evento falla |
| Challenge race | RPC `consume_webauthn_challenge` atómico |
| Host-header RP | Prod: solo `WEBAUTHN_RP_ID` + `NEXT_PUBLIC_SITE_URL` |

---

## Modelo de datos / qué se persiste

### Tablas

| Tabla | Contenido |
|-------|-----------|
| `employee_device_credentials` | public key + credential_id (máx 1 activa). Sin plantillas biométricas. |
| `webauthn_challenges` | Challenge one-time, TTL 5 min, consume atómico. |
| `field_enroll_tokens` | Hash de token HR (30 min); consume en enroll exitoso. |

### `attendance_records.flags` (campo)

```json
{
  "channel": "field_mobile",
  "field_protected": true,
  "daily_close_absent": false
}
```

### `attendance_events`

- `source`: `field_mobile`
- `event_uid`: `field:{employeeId}:{localDate}:{action}:{nonce}`
- `local_date`, `tz`, `tz_offset_minutes`
- `flags`: accuracy, geo_ts, webauthn_verified, credential prefix, `biometric_template_stored: false`

### Política empresa

```json
{
  "field_attendance": {
    "enforce_geofence": false,
    "max_accuracy_m": 150,
    "max_geo_age_ms": 90000
  }
}
```

`require_webauthn` siempre **true** en código (no desactivable por JSON).

---

## APIs

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| POST | `/api/attendance/field/options` | público + rate field | enroll (con token) / assert |
| POST | `/api/attendance/field/enroll` | público + token | Verificar attestation |
| POST | `/api/attendance/field/punch` | público + WebAuthn | Marca |
| GET/POST | `/api/attendance/field/enroll-token` | HR sesión | Emitir token / revocar device |

Revoke: `POST enroll-token { employee_id, action: "revoke" }`.

---

## Env producción (obligatorio)

```
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
WEBAUTHN_RP_ID=tu-dominio.com
WEBAUTHN_RP_NAME=Humano SISU
```

---

## Códigos de error (extra)

| Código | Caso |
|--------|------|
| `ENROLL_TOKEN_*` | Falta / inválido / expirado |
| `CREDENTIAL_LIMIT` | Ya hay 1 device; revocar antes |
| `WEBAUTHN_SYNCED_PASSKEY` | Passkey iCloud/Google rechazada |
| `WEBAUTHN_CLONE_SUSPECTED` | Counter no avanzó |
| `EVENT_WRITE_FAILED` | Record ok, evento falló → 500 |
| `AMBIGUOUS_EMPLOYEE` | last5 multi-match → selector |

---

## Criterios de aceptación (actualizados)

1. Check-in/out de campo sin Hikvision, con token HR en el **primer** enroll.
2. Sin biometría aceptada → no write.
3. Empresa mixta: daily-close Hikvision no convierte el primer punch de campo en checkout.
4. Tras las 11:00 HN un empleado de campo **puede** hacer check-in.
5. last5 sin `company_id` → 409 con empresas, no 400 ciego.
6. 1 credencial activa; HR puede revocar e emitir token nuevo.
7. `event_uid` + `local_date` en cada evento de campo.

## Lo que aún no es (cola 20 %)

- UI HR visual para tokens (API lista).
- Geocercas por obra/ruta.
- AHC al punch.
- Tests e2e de punch/enroll.
- Allowlist `attendance_required` / rol “solo campo”.
