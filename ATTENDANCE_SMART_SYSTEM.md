# Sistema de Asistencia Inteligente

## Descripción General

El sistema de asistencia inteligente proporciona análisis avanzado de patrones de puntualidad, detección de comportamientos y retroalimentación personalizada para empleados.

## Características Principales

### 1. Validación de Identidad
- Identificación mediante los últimos 5 dígitos del DNI
- Validación en tiempo real contra la base de datos de empleados
- Verificación de estado activo del empleado

### 2. Obtención de Horarios
- Consulta automática de horarios de trabajo asignados
- Soporte para horarios personalizados por día de la semana
- Horario por defecto: 8:00 AM - 5:00 PM

### 3. Evaluación de Puntualidad
- **Temprano**: ≥5 minutos antes de la hora esperada
- **A tiempo**: ±5 minutos de la hora esperada
- **Tarde**: >5 minutos después de la hora esperada

### 4. Detección de Patrones Comportamentales
- **Consistentemente temprano**: >70% días temprano
- **Consistentemente puntual**: >70% días a tiempo + temprano
- **Tardanzas repetidas**: >50% días tarde
- **Mejorando**: Tendencia positiva en puntualidad

### 5. Retroalimentación Personalizada
- Mensajes motivacionales para empleados puntuales
- Alertas constructivas para empleados con tardanzas
- Reconocimiento de mejoras en patrones de asistencia
- Sugerencias específicas para mejora

## Archivos del Sistema

### Páginas
- `/pages/attendance-smart.tsx` - Página principal del sistema inteligente
- `/pages/registrodeasistencia.tsx` - Sistema básico de registro (existente)

### APIs
- `/api/attendance/lookup.ts` - Búsqueda de empleados por DNI
- `/api/attendance/register.ts` - Registro de entrada/salida
- `/api/attendance/weekly-pattern.ts` - Análisis de patrones semanales

### Componentes
- Interfaz responsiva con Tailwind CSS
- Reloj en tiempo real
- Formularios de validación
- Sistema de retroalimentación visual

## Uso del Sistema

### Para Empleados
1. Acceder a `/attendance-smart`
2. Ingresar los últimos 5 dígitos del DNI
3. Revisar información de horario y puntualidad
4. Registrar entrada o salida según corresponda
5. Recibir retroalimentación personalizada

### Para Administradores
- Monitoreo de patrones de asistencia
- Análisis de tendencias de puntualidad
- Identificación de empleados que requieren intervención
- Datos para evaluaciones de desempeño

## Base de Datos

### Tablas Principales
- `employees` - Información de empleados
- `work_schedules` - Horarios de trabajo
- `attendance_records` - Registros de asistencia

### Campos de Análisis
- `late_minutes` - Minutos de tardanza
- `early_departure_minutes` - Minutos de salida anticipada
- `status` - Estado de asistencia (present, late, absent)
- `justification` - Justificación de tardanzas

## Métricas de Análisis

### Puntualidad Individual
- Porcentaje de días puntuales
- Promedio de minutos de tardanza
- Consistencia semanal
- Tendencias de mejora

### Patrones Detectados
1. **Consistent Early** - Empleado llega temprano consistentemente
2. **Consistent On-time** - Empleado es muy puntual
3. **Repeated Tardiness** - Patrón de tardanzas frecuentes
4. **Improving** - Mejorando puntualidad gradualmente

## Mensajes de Retroalimentación

### Empleados Puntuales
- "¡Excelente puntualidad! Eres un ejemplo a seguir."
- "Tu consistencia es admirable. ¡Sigue así!"

### Empleados con Tardanzas
- "Hemos notado algunas tardanzas. ¿Podemos ayudarte?"
- "Intenta llegar 10 minutos más temprano para mejorar tu puntualidad."

### Empleados Mejorando
- "¡Notamos tu esfuerzo por mejorar! Sigue así."
- "Tu puntualidad ha mejorado significativamente."

## Configuración Técnica

### Variables de Entorno Requeridas
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_servicio
```

### Dependencias
- Next.js 13+
- React 18+
- Supabase
- Tailwind CSS
- TypeScript

## Próximas Mejoras

1. **Dashboard de Administración**
   - Vista general de asistencia organizacional
   - Reportes de tendencias
   - Alertas automáticas

2. **Notificaciones Push**
   - Recordatorios de horario
   - Alertas de tardanzas
   - Celebración de logros

3. **Integración con Recursos Humanos**
   - Exportación de reportes
   - Integración con sistemas de nómina
   - Evaluaciones de desempeño

4. **Análisis Predictivo**
   - Predicción de tardanzas
   - Identificación de riesgos de ausentismo
   - Recomendaciones proactivas

## Soporte

Para soporte técnico o consultas sobre el sistema:
- Contactar al equipo de desarrollo
- Revisar logs en `/logs/attendance-system.log`
- Verificar configuración de base de datos

---

*Sistema desarrollado para mejorar la gestión de asistencia y promover la puntualidad organizacional.*
