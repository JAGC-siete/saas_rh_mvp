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

// Mensajes personalizados y amigables para mejor experiencia de usuario
export const CALL_CENTER_MESSAGES = {
  // === CHECK-IN MESSAGES ===
  ejemplar_in: "Excelente. Llegaste antes de tu horario. Eres un ejemplo de puntualidad.",
  on_time_in: "Perfecto. Registro de entrada a tiempo. ¡Que tengas un excelente día!",
  late_in: "Llegaste tarde. Por favor, justifica el motivo de tu tardanza:",
  oor_in: "Llegaste fuera del horario autorizado. Se requiere justificación obligatoria:",
  
  // === CHECK-OUT MESSAGES ===
  early_out: "Salida anticipada detectada. Por favor, indica el motivo:",
  on_time_out: "Excelente. Registro de salida a tiempo. Descansa bien.",
  overtime_out: "Gracias por tu dedicación. Registrando horas extra. Por favor, describe las tareas realizadas:",
  oor_out: "Salida fuera del horario autorizado. Se requiere justificación obligatoria:",
  
  // === SYSTEM MESSAGES ===
  closed_window: "La ventana de registro está cerrada. Intenta en el horario correspondiente.",
  three_lates_notice: "Atención: Esta es tu 3ra tardanza de la semana. Se notificará a RR.HH.",
  
  // === VALIDATION MESSAGES ===
  geofence_failed: "Estás fuera de la zona autorizada. Por favor, acércate a la oficina para registrar tu asistencia.",
  invalid_time: "Horario no válido para esta acción. Verifica tu horario asignado.",
  duplicate_record: "Ya tienes un registro para hoy. Verifica tu estado actual.",
  
  // === SUCCESS MESSAGES ===
  check_in_success: "Entrada registrada exitosamente.",
  check_out_success: "Salida registrada exitosamente.",
  
  // === JUSTIFICATION REQUESTS ===
  justification_required: "Se requiere justificación para completar este registro:",
  justification_categories: "Categorías disponibles: tráfico, salud, transporte, permisos, clima, otros"
}

// Categorías de justificación estandarizadas
export const JUSTIFICATION_CATEGORIES = [
  'tráfico', 'salud', 'transporte', 'permisos', 'clima', 'otros'
]

// Mensajes contextuales según la hora y situación
export const CONTEXTUAL_MESSAGES = {
  // === MORNING MESSAGES ===
  morning_early: "Buenos días. Llegaste temprano, excelente actitud.",
  morning_on_time: "Buenos días. Perfecta puntualidad para comenzar el día.",
  morning_late: "Buenos días. Llegaste tarde, necesitamos justificación.",
  
  // === AFTERNOON MESSAGES ===
  afternoon_early: "Buenas tardes. Salida anticipada, por favor justifica.",
  afternoon_on_time: "Buenas tardes. Salida a tiempo, excelente día.",
  afternoon_overtime: "Buenas tardes. Gracias por tu dedicación con las horas extra.",
  
  // === EVENING MESSAGES ===
  evening_overtime: "Buenas noches. Trabajando hasta tarde, eres un profesional.",
  evening_late: "Buenas noches. Salida muy tarde, se requiere justificación.",
  
  // === WEEKEND MESSAGES ===
  saturday_morning: "Buenos días. Es sábado, horario reducido hasta las 12:00.",
  saturday_afternoon: "Buenas tardes. Los sábados por la tarde no hay registro.",
  sunday_closed: "Buenos días. Los domingos el sistema está cerrado."
}

// Mensajes de ayuda y sugerencias
export const HELPFUL_TIPS = {
  check_in_tip: "💡 Tip: Para check-in, usa tu DNI entre 7:00 AM y 11:00 AM",
  check_out_tip: "💡 Tip: Para check-out, usa tu DNI entre 4:30 PM y 9:00 PM",
  saturday_tip: "💡 Tip: Los sábados solo hay registro de 8:00 AM a 12:00 PM",
  justification_tip: "💡 Tip: Las justificaciones ayudan a mantener tu historial limpio",
  geofence_tip: "💡 Tip: Asegúrate de estar en la oficina para registrar asistencia"
}

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

/**
 * Genera mensajes contextuales personalizados según la hora y situación
 */
export function generateContextualMessage(
  action: 'check_in' | 'check_out',
  rule: string,
  currentTime: string,
  dayOfWeek: number,
  requireJustification: boolean = false
): {
  mainMessage: string;
  contextualMessage: string;
  helpfulTip: string;
  emoji: string;
} {
  const hour = parseInt(currentTime.split(':')[0]);
  const isMorning = hour >= 6 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 18;
  const isEvening = hour >= 18;
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  let contextualMessage = '';
  let helpfulTip = '';
  let emoji = '';

  // Mensajes contextuales según la hora del día
  if (action === 'check_in') {
    if (isMorning) {
      if (rule === 'early') {
        contextualMessage = CONTEXTUAL_MESSAGES.morning_early;
        emoji = '';
      } else if (rule === 'on_time') {
        contextualMessage = CONTEXTUAL_MESSAGES.morning_on_time;
        emoji = '';
      } else if (rule === 'late' || rule === 'oor') {
        contextualMessage = CONTEXTUAL_MESSAGES.morning_late;
        emoji = '';
      }
      helpfulTip = HELPFUL_TIPS.check_in_tip;
    }
  } else if (action === 'check_out') {
    if (isAfternoon) {
      if (rule === 'early_out') {
        contextualMessage = CONTEXTUAL_MESSAGES.afternoon_early;
        emoji = '';
      } else if (rule === 'on_time_out') {
        contextualMessage = CONTEXTUAL_MESSAGES.afternoon_on_time;
        emoji = '';
      } else if (rule === 'overtime') {
        contextualMessage = CONTEXTUAL_MESSAGES.afternoon_overtime;
        emoji = '';
      }
      helpfulTip = HELPFUL_TIPS.check_out_tip;
    } else if (isEvening) {
      if (rule === 'overtime') {
        contextualMessage = CONTEXTUAL_MESSAGES.evening_overtime;
        emoji = '';
      } else if (rule === 'oor_out') {
        contextualMessage = CONTEXTUAL_MESSAGES.evening_late;
        emoji = '';
      }
      helpfulTip = HELPFUL_TIPS.check_out_tip;
    }
  }

  // Mensajes especiales para fines de semana
  if (isSaturday) {
    if (hour < 12) {
      contextualMessage = CONTEXTUAL_MESSAGES.saturday_morning;
      emoji = '';
    } else {
      contextualMessage = CONTEXTUAL_MESSAGES.saturday_afternoon;
      emoji = '';
    }
    helpfulTip = HELPFUL_TIPS.saturday_tip;
  } else if (isSunday) {
    contextualMessage = CONTEXTUAL_MESSAGES.sunday_closed;
    emoji = '';
    helpfulTip = 'Consejo: Los domingos no hay registro de asistencia';
  }

  // Mensaje principal según la regla
  const mainMessage = CALL_CENTER_MESSAGES[`${rule}` as keyof typeof CALL_CENTER_MESSAGES] || 
                     CALL_CENTER_MESSAGES.on_time_in;

  return {
    mainMessage,
    contextualMessage,
    helpfulTip,
    emoji
  };
}
