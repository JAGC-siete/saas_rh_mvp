/**
 * Configuración centralizada para la política de asistencia del Call Center
 * Basada en la política v1 documentada
 */

export const CALL_CENTER_CONFIG = {
  // Zona horaria
  tz: "America/Tegucigalpa",
  
  // Ventanas globales (duras)
  windows: {
    check_in_open: "07:00",
    check_in_close: "11:00",
    check_out_open: "16:30", 
    check_out_close: "21:00",
    saturday_checkout_open: "11:00",
    saturday_checkout_close: "13:00"
  },
  
  // Reglas de entrada
  entry_rules: { 
    grace: 5, 
    late_from: 6, 
    late_to_inclusive: 20, 
    oor_from: 21 
  },
  
  // Reglas de salida
  exit_rules: { 
    early_from: "13:00", 
    on_time_to: 5, 
    overtime_to_minutes: 120, 
    oor_out_from_minutes: 121 
  },
  
  // Días laborales
  workdays: {
    monday: { open: true, start: "08:00", end: "17:00" },
    tuesday: { open: true, start: "08:00", end: "17:00" },
    wednesday: { open: true, start: "08:00", end: "17:00" },
    thursday: { open: true, start: "08:00", end: "17:00" },
    friday: { open: true, start: "08:00", end: "17:00" },
    saturday: { open: true, half_day: true, start: "08:00", end: "12:00", end_override: "12:00" },
    sunday: { open: false }
  },
  
  // Sistema de puntos
  points: { 
    early: 3, 
    on_time: 2, 
    overtime: 3 
  },
  
  // Rachas y tolerancias
  streaks: { 
    tolerated_lates_per_week: 1 
  },
  
  // Políticas
  policies: {
    oor_time: "allow_with_warning",
    geofence_public: "block",
    geofence_admin: "allow_with_flag"
  }
}

// Mensajes estandarizados según política
export const CALL_CENTER_MESSAGES = {
  ejemplar_in: "Llegaste antes. ¡Ejemplar! 😎",
  on_time_in: "Registro ok.",
  late_in: "ESTÁS LLEGANDO TARDE. Justificá: _______",
  oor_in: "Entrada fuera del rango autorizado.",
  early_out: "Salida anticipada. Motivo: _______",
  on_time_out: "Registro ok.",
  overtime_out: "Tiempo extra. Detallá tareas: _______",
  oor_out: "Salida fuera del rango autorizado.",
  closed_day: "Día no laboral.",
  closed_window: "La ventana de registro está cerrada.",
  three_lates_notice: "3+ tardanzas esta semana. Se notificará a RR.HH."
}

// Categorías de justificación estandarizadas
export const JUSTIFICATION_CATEGORIES = [
  'tráfico', 'salud', 'transporte', 'permisos', 'clima', 'otros'
]

// Estados del sistema según política
export const ATTENDANCE_STATUSES = {
  // Entrada
  present: 'present',
  late_in: 'late_in', 
  oor_in: 'oor_in',
  
  // Salida
  on_time_out: 'on_time_out',
  early_out: 'early_out',
  overtime_out: 'overtime_out',
  oor_out: 'oor_out',
  
  // Flags especiales
  three_lates_notice: 'three_lates_notice',
  orphan_checkout: 'orphan_checkout',
  geofence_ok: 'geofence_ok',
  nudge: 'nudge',
  suspicious_device: 'suspicious_device'
}
