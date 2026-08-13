# Arquitectura de Ingesta y Sincronización de Asistencia — Humano SISU

## 1. Modelo de Comunicación Híbrido
El sistema de asistencia no depende de un único flujo, sino de dos direcciones de comunicación distintas y complementarias.

### A. Flujo Inbound: Ingesta de Marcajes (Push)
Es el camino crítico para que el empleado sea registrado como "presente". El dispositivo actúa como cliente y empuja los datos al SaaS.

**Camino del Dato:**
`Dispositivo Hikvision` $\rightarrow$ `HTTP POST /api/webhooks/attendance` $\rightarrow$ `attendance_events` $\rightarrow$ `generateDailyCloseReport (Cálculo de Horas en RPC)` $\rightarrow$ `attendance_records (Estados y Minutos)`

- **Mecanismo:** Webhook configurado en el dispositivo.
- **Identificador:** El `company_id` se pasa como parámetro en la URL del webhook para asegurar el aislamiento del tenant.
- **Procesamiento:** Cada evento raw se inserta en la tabla de eventos. El proceso `generateDailyCloseReport` es el responsable de transformar esos marcajes en horas efectivas y determinar los estados de cumplimiento (tardanzas, salidas tempranas) en la crónica.

### B. Flujo Outbound: Gestión y Configuración (Pull/Push)
Es el camino para que el SaaS controle el dispositivo. No hay un servidor proxy intermedio; el SDK reside dentro de las rutas de Next.js.

**Camino del Dato:**
`Next.js API` $\rightarrow$ `lib/hikvision/sdk.ts (HikvisionSDK)` $\rightarrow$ `ISAPI (Digest Auth)` $\rightarrow$ `Dispositivo`

- **Provisionamiento:** El endpoint `/api/admin/devices/provision` utiliza el SDK para ejecutar `setNotificationServer`, indicándole al dispositivo a qué URL de webhook debe enviar las marcas.
- **Sincronización de Usuarios:** El SDK ejecuta `userInfoSetUp` para asegurar que el DNI y Nombre del empleado en la base de datos coincidan con los del dispositivo.

---

## 2. El Sistema de Colas (Sincronización Asíncrona)
Para evitar que la lentitud de los dispositivos físicos bloquee la interfaz de usuario, el sistema utiliza una arquitectura de cola para la sincronización de empleados.

**Flujo de Sincronización:**
`SaaS (Trigger)` $\rightarrow$ `lib/queues/employeeSyncQueue.ts` $\rightarrow$ `Redis` $\rightarrow$ `Worker (Hikvision Proxy)` $\rightarrow$ `Dispositivo`

- **Independencia:** La ingesta de marcas (webhook) **no depende** de esta cola. Si el worker de sincronización cae, las marcas siguen entrando; lo que falla es la actualización automática de nuevos empleados en el dispositivo.
- **Resiliencia:** El Worker implementa Circuit Breakers y Rate Limiting para no saturar los dispositivos.

---

## 3. Matriz de Responsabilidades Técnica

| Función | Método | Responsable | Frecuencia |
| :--- | :--- | :--- | :--- |
| **Marcar Asistencia** | Webhook Push | Dispositivo $\to$ SaaS | Tiempo Real |
| **Provisionar Dispositivo** | SDK Local (ISAPI) | SaaS $\to$ Dispositivo | Una vez por dispositivo |
| **Sincronizar Empleados** | BullMQ $\to$ Worker | SaaS $\to$ Dispositivo | Eventual / Programada |
| **Cálculo de Horas** | RPC Supabase | Base de Datos | Post-Marcaje / Batch |

---

## 4. Resumen de Seguridad y Autenticación
- **Hacia el Dispositivo:** Autenticación **Digest** (MD5 hash con nonce y realm) implementada en el SDK local.
- **Hacia el SaaS:** El webhook utiliza el `company_id` en la URL y validaciones internas para prevenir la inyección de marcas ajenas.
