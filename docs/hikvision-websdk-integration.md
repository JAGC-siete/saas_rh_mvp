# 🚀 Integración WebSDK Hikvision V3.3.1 - Casos de Uso

## 📋 Resumen

El **WebSDK V3.3.1** permite que tu aplicación SaaS se conecte **directamente** al dispositivo Hikvision (arquitectura B/S), complementando el sistema actual de webhooks HTTP. Esto habilita funcionalidades bidireccionales que no son posibles solo con webhooks.

---

## 🎯 Casos de Uso Prácticos

### 1. **Sincronización Bidireccional de Empleados** ⭐ ALTA PRIORIDAD

**Problema actual**: 
- Los empleados se agregan manualmente en el dispositivo Hikvision
- No hay sincronización automática entre el SaaS y el dispositivo

**Solución con WebSDK**:
- Cuando se agrega un empleado en el SaaS, automáticamente agregarlo al dispositivo
- Cuando se elimina un empleado, eliminarlo del dispositivo
- Sincronizar fotos de perfil del SaaS al dispositivo para reconocimiento facial

**Beneficio**: 
- Reduce errores de configuración manual
- Mantiene consistencia entre sistemas
- Facilita onboarding de nuevos empleados

**Implementación sugerida**:
```typescript
// pages/api/devices/hikvision/sync-employee.ts
// Cuando se crea/actualiza un empleado en el SaaS:
// 1. Conectar al dispositivo vía WebSDK
// 2. Agregar empleado con DNI y foto
// 3. Verificar sincronización exitosa
```

---

### 2. **Configuración Remota del Dispositivo** ⭐ ALTA PRIORIDAD

**Problema actual**:
- Para configurar el webhook, el administrador debe acceder a la interfaz web del dispositivo
- Cambios de configuración requieren acceso físico o VPN

**Solución con WebSDK**:
- Panel en el dashboard del SaaS para configurar el dispositivo
- Configurar URL del webhook directamente desde el SaaS
- Habilitar/deshabilitar eventos específicos (faceAuthentication, etc.)
- Configurar horarios de acceso, zonas, etc.

**Beneficio**:
- Configuración centralizada desde el SaaS
- No requiere acceso a la interfaz del dispositivo
- Facilita gestión multi-dispositivo

**Implementación sugerida**:
```typescript
// components/DeviceConfiguration.tsx
// Panel en /app/settings/devices
// Permite configurar:
// - URL del webhook
// - Eventos a enviar
// - Zonas de acceso
// - Horarios
```

---

### 3. **Recuperación de Eventos Perdidos (Backup)** ⭐ MEDIA PRIORIDAD

**Problema actual**:
- Si el webhook falla o hay problemas de conectividad, se pierden eventos
- No hay forma de recuperar eventos históricos del dispositivo

**Solución con WebSDK**:
- Consultar eventos del dispositivo directamente
- Implementar polling periódico para eventos no recibidos
- Sincronizar eventos perdidos automáticamente

**Beneficio**:
- Mayor confiabilidad en el registro de asistencia
- Recuperación automática de eventos perdidos
- Historial completo de eventos

**Implementación sugerida**:
```typescript
// pages/api/devices/hikvision/sync-events.ts
// Job que corre cada hora:
// 1. Consulta eventos del dispositivo desde última sincronización
// 2. Compara con eventos recibidos vía webhook
// 3. Procesa eventos faltantes
```

---

### 4. **Diagnóstico y Monitoreo en Tiempo Real** ⭐ MEDIA PRIORIDAD

**Problema actual**:
- No hay visibilidad del estado del dispositivo desde el SaaS
- Errores de conectividad solo se detectan cuando no llegan eventos

**Solución con WebSDK**:
- Dashboard que muestra estado del dispositivo (online/offline)
- Verificar conectividad y configuración
- Mostrar eventos recientes del dispositivo
- Alertas cuando el dispositivo está desconectado

**Beneficio**:
- Proactividad en detección de problemas
- Mejor experiencia para el administrador
- Reducción de tiempo de diagnóstico

**Implementación sugerida**:
```typescript
// components/DeviceStatus.tsx
// Muestra:
// - Estado de conexión
// - Último evento recibido
// - Configuración actual
// - Alertas de problemas
```

---

### 5. **Gestión de Usuarios y Permisos en el Dispositivo** ⭐ BAJA PRIORIDAD

**Problema actual**:
- Los usuarios del dispositivo se gestionan manualmente
- No hay sincronización de permisos con el SaaS

**Solución con WebSDK**:
- Sincronizar usuarios del SaaS al dispositivo
- Gestionar permisos de acceso por zona/horario
- Revocar acceso automáticamente cuando se desactiva un empleado

**Beneficio**:
- Control centralizado de accesos
- Seguridad mejorada
- Cumplimiento de políticas

---

### 6. **Consulta de Historial de Eventos** ⭐ BAJA PRIORIDAD

**Problema actual**:
- El SaaS solo tiene eventos recibidos vía webhook
- No hay acceso al historial completo del dispositivo

**Solución con WebSDK**:
- Consultar eventos históricos del dispositivo
- Exportar reportes de eventos
- Análisis de patrones de acceso

**Beneficio**:
- Reportes más completos
- Auditoría mejorada
- Análisis de tendencias

---

## 🏗️ Arquitectura Propuesta

### Flujo Actual (Solo Webhooks)
```
Dispositivo Hikvision → HTTP POST → Webhook API → PostgreSQL
```

### Flujo Propuesto (Webhooks + WebSDK)
```
┌─────────────────────────────────────────────────────────┐
│                    SaaS Application                     │
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   Webhooks   │         │   WebSDK     │             │
│  │   (Push)     │         │   (Pull)     │             │
│  └──────┬───────┘         └──────┬───────┘             │
│         │                        │                      │
│         │                        │                      │
│         ▼                        ▼                      │
│  ┌──────────────────────────────────────┐              │
│  │      Business Logic Layer            │              │
│  │  (Employee sync, Event processing)   │              │
│  └──────────────────┬───────────────────┘              │
│                     │                                   │
│                     ▼                                   │
│              ┌──────────────┐                          │
│              │  PostgreSQL  │                          │
│              └──────────────┘                          │
└─────────────────────────────────────────────────────────┘
         ▲                              │
         │                              │
         │                              │
    ┌────┴────┐                    ┌────┴────┐
    │ Webhook │                    │ WebSDK  │
    │  (Push) │                    │  (Pull) │
    └────┬────┘                    └────┬────┘
         │                              │
         │                              │
    ┌────▼──────────────────────────────▼────┐
    │      Dispositivo Hikvision            │
    └───────────────────────────────────────┘
```

---

## 🔧 Implementación Técnica

### Paso 1: Crear Tabla de Dispositivos

```sql
-- supabase/migrations/XXXXXX_create_devices_table.sql
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_type TEXT DEFAULT 'hikvision',
  ip_address TEXT NOT NULL,
  port INTEGER DEFAULT 80,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL, -- Encriptar con Supabase Vault
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  status TEXT DEFAULT 'unknown', -- 'online', 'offline', 'error'
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_company_id ON devices(company_id);
CREATE INDEX idx_devices_status ON devices(status);
```

### Paso 2: Instalar WebSDK en el Frontend

```bash
# El WebSDK de Hikvision generalmente se incluye como archivos JS
# Descargar desde: https://www.hikvision.com/en/support/download/sdk/
# Colocar en: public/libs/hikvision-websdk/
```

### Paso 3: Crear API Route para Operaciones WebSDK

```typescript
// pages/api/devices/hikvision/[deviceId]/connect.ts
// Conectar al dispositivo y realizar operaciones
```

### Paso 4: Crear Componente de Configuración

```typescript
// components/DeviceManager.tsx
// Gestión de dispositivos desde el dashboard
```

---

## 📊 Comparación: Webhooks vs WebSDK

| Característica | Webhooks (Actual) | WebSDK (Propuesto) |
|----------------|-------------------|-------------------|
| **Dirección** | Push (Dispositivo → SaaS) | Pull (SaaS → Dispositivo) |
| **Tiempo Real** | ✅ Sí (eventos inmediatos) | ⚠️ Depende de polling |
| **Configuración** | ❌ Manual en dispositivo | ✅ Desde el SaaS |
| **Sincronización** | ❌ Solo recepción | ✅ Bidireccional |
| **Recuperación** | ❌ No hay backup | ✅ Consulta histórica |
| **Monitoreo** | ❌ Pasivo | ✅ Activo |
| **Complejidad** | ✅ Baja | ⚠️ Media |

---

## 🎯 Recomendación de Implementación

### Fase 1: Configuración Remota (Alta Prioridad)
- Implementar panel de configuración de dispositivos
- Permitir configurar webhook URL desde el SaaS
- **Tiempo estimado**: 2-3 días

### Fase 2: Sincronización de Empleados (Alta Prioridad)
- Sincronizar empleados del SaaS al dispositivo
- Agregar/eliminar empleados automáticamente
- **Tiempo estimado**: 3-4 días

### Fase 3: Monitoreo y Diagnóstico (Media Prioridad)
- Dashboard de estado de dispositivos
- Alertas de desconexión
- **Tiempo estimado**: 2 días

### Fase 4: Recuperación de Eventos (Media Prioridad)
- Polling periódico de eventos
- Sincronización de eventos perdidos
- **Tiempo estimado**: 2-3 días

---

## ⚠️ Consideraciones de Seguridad

1. **Credenciales del Dispositivo**:
   - Almacenar en Supabase Vault (encriptado)
   - Nunca exponer en el frontend
   - Rotar credenciales periódicamente

2. **Autenticación**:
   - Validar que solo usuarios autorizados puedan configurar dispositivos
   - Usar RLS en la tabla `devices`

3. **Comunicación**:
   - Preferir HTTPS para comunicación con dispositivos
   - Validar certificados SSL

---

## 📚 Recursos

- [Hikvision WebSDK Documentation](https://www.hikvision.com/en/support/download/sdk/)
- [ISAPI Protocol Reference](https://www.hikvision.com/en/support/download/sdk/)
- Documentación actual: `docs/hikvision-webhook-analysis.md`

---

## 🚀 Próximos Pasos

1. **Revisar documentación WebSDK** para entender APIs disponibles
2. **Crear tabla `devices`** en Supabase
3. **Implementar Fase 1** (Configuración Remota)
4. **Probar con dispositivo real** de PROHALCA
5. **Iterar** según feedback

