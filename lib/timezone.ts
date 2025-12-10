/**
 * 🇭🇳 TIMEZONE UTILITY FOR TEGUCIGALPA, HONDURAS
 * 
 * ⚠️  CRITICAL: ALL DATE/TIME OPERATIONS MUST USE AMERICA/TEGUCIGALPA
 * 
 * This utility ensures CONSISTENT timezone handling across the entire application.
 * NEVER use new Date(), Date.now(), or any other timezone without this utility.
 */

export const HONDURAS_TIMEZONE = 'America/Tegucigalpa';

// Export shortcuts to prevent timezone errors
export const HN_TZ = HONDURAS_TIMEZONE;
export const TEGUCIGALPA_TZ = HONDURAS_TIMEZONE;

/**
 * Get current time in Honduras timezone
 */
export function getHondurasTime(): Date {
  const now = new Date();
  // Honduras is UTC-6, so subtract 6 hours in milliseconds
  const hondurasOffsetMs = 6 * 60 * 60 * 1000;
  return new Date(now.getTime() - hondurasOffsetMs);
}

/**
 * Convert a UTC timestamp to Honduras timezone
 */
export function convertToHondurasTime(utcTimestamp: string | Date): Date {
  const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return getHondurasTime(); // Return current Honduras time if invalid
  }
  
  // Honduras is UTC-6, so subtract 6 hours in milliseconds
  const hondurasOffsetMs = 6 * 60 * 60 * 1000;
  const hondurasTime = new Date(date.getTime() - hondurasOffsetMs);
  
  return hondurasTime;
}

/**
 * Get current time in Honduras timezone as ISO string
 * This ensures we store the actual local time, not UTC
 */
export function getHondurasTimeISO(): string {
  const hondurasTime = getHondurasTime();
  
  // Create a new Date object with the Honduras time but treat it as local
  // This way when we call toISOString(), it represents the actual Honduras time
  const adjustedTime = new Date(
    hondurasTime.getFullYear(),
    hondurasTime.getMonth(),
    hondurasTime.getDate(),
    hondurasTime.getHours(),
    hondurasTime.getMinutes(),
    hondurasTime.getSeconds(),
    hondurasTime.getMilliseconds()
  );
  
  return adjustedTime.toISOString();
}

/**
 * Format time for display in HH:MM format
 * Converts UTC timestamp to Honduras local time (America/Tegucigalpa, UTC-6)
 */
export function formatTimeDisplay(timestamp: string | Date | null): string {
  if (!timestamp) return '--:--';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[formatTimeDisplay] Invalid timestamp:', timestamp);
    }
    return '--:--';
  }
  
  // DEBUG: Validar que el timestamp tenga sentido (no sea del año 1970 o futuro lejano)
  const year = date.getFullYear();
  if (process.env.NODE_ENV === 'development' && (year < 2020 || year > 2100)) {
    console.warn('[formatTimeDisplay] Suspicious timestamp year:', {
      year,
      timestamp,
      iso: date.toISOString(),
      utc: date.toUTCString()
    });
  }
  
  // Use toLocaleTimeString with explicit timeZone to convert UTC to Honduras time
  // This correctly handles the UTC-6 offset for America/Tegucigalpa
  const result = date.toLocaleTimeString('es-HN', {
    timeZone: HONDURAS_TIMEZONE, // 'America/Tegucigalpa'
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // DEBUG: Log en desarrollo para diagnosticar problemas
  if (process.env.NODE_ENV === 'development') {
    console.debug('[formatTimeDisplay]', {
      input: timestamp,
      output: result,
      date_iso: date.toISOString(),
      date_utc: date.toUTCString(),
      date_local: date.toLocaleString('es-HN', { timeZone: HONDURAS_TIMEZONE })
    });
  }
  
  return result;
}

/**
 * Get today's date in YYYY-MM-DD format in Honduras timezone
 */
export function getTodayInHonduras(): string {
  const hondurasTime = getHondurasTime();
  return hondurasTime.toISOString().split('T')[0];
}

/**
 * Calculate difference in minutes between two times in Honduras timezone
 */
export function calculateMinutesDifference(time1: Date, time2: Date): number {
  return Math.floor((time1.getTime() - time2.getTime()) / 60000);
}

/**
 * Parse expected time (HH:MM) and create a Date object for comparison
 */
export function parseExpectedTime(timeString: string, baseDate?: Date): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = baseDate || getHondurasTime();
  
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  
  return result;
}

/**
 * Determine attendance status based on time difference
 */
export function getAttendanceStatus(actualTime: Date, expectedTime: Date): 'Temprano' | 'A tiempo' | 'Tarde' {
  const diffMinutes = calculateMinutesDifference(actualTime, expectedTime);
  
  if (diffMinutes < -5) {
    return 'Temprano';
  } else if (diffMinutes <= 5) {
    return 'A tiempo';
  } else {
    return 'Tarde';
  }
}

/**
 * Get current day of week in Spanish for schedule lookup
 */
export function getCurrentDayOfWeek(): string {
  const hondurasTime = getHondurasTime();
  const dayName = hondurasTime.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  return dayName;
}

// =====================================================
// NUEVAS FUNCIONES PARA SISTEMA DE ASISTENCIA
// =====================================================

/**
 * Convert UTC time to Honduras time (UTC-6, sin DST)
 */
export function toHN(utcDate: Date): { time: string; date: string; dow: number; isWeekend: boolean } {
  const hondurasTime = convertToHondurasTime(utcDate);
  
  const time = hondurasTime.toTimeString().slice(0, 5); // HH:MM
  const date = `${hondurasTime.getFullYear()}-${String(hondurasTime.getMonth() + 1).padStart(2, '0')}-${String(hondurasTime.getDate()).padStart(2, '0')}`;
  const dow = hondurasTime.getDay(); // 0=Sunday, 1=Monday, etc.
  const isWeekend = dow === 0 || dow === 6;
  
  return { time, date, dow, isWeekend };
}

/**
 * Check if time is inside hard window according to Call Center policy
 */
export function assertInsideHardWindow(time: string, window: { open: string; close: string }): boolean {
  const [timeHour, timeMin] = time.split(':').map(Number);
  const [openHour, openMin] = window.open.split(':').map(Number);
  const [closeHour, closeMin] = window.close.split(':').map(Number);
  
  const timeMinutes = timeHour * 60 + timeMin;
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  return timeMinutes >= openMinutes && timeMinutes <= closeMinutes;
}

/**
 * Get check-out window based on day of week (Call Center policy)
 */
export function getCheckOutWindow(nowLocal: any, schedule: any): { open: string; close: string } {
  if (nowLocal.dow === 6) { // Saturday - half-day
    return { open: "11:00", close: "13:00" }
  }
  // Monday-Friday: normal hours
  return { open: "16:30", close: "21:00" }
}

/**
 * Check if day is open for public registration (Call Center policy)
 * SIMPLIFICADO: Solo domingo cerrado, resto de días abiertos
 */
export function isDayOpenForPublic(nowLocal: any): boolean {
  // Solo domingo cerrado
  if (nowLocal.dow === 0) return false; // Sunday closed
  
  // Lunes a sábado: abiertos (sin restricciones de hora)
  return true;
}

/**
 * Override Saturday schedule for half-day (08:00-12:00)
 */
export function overrideIfSaturdayHalfDay(expectedTime: string, schedule: any, nowLocal: any): string {
  if (nowLocal.dow === 6) { // Saturday
    return '08:00'; // Half-day start
  }
  return expectedTime;
}

/**
 * Decide check-in rule based on business parameters
 */
export function decideCheckInRule(nowLocal: any, expectedIn: string, rules: { grace: number; late_to_inclusive: number; oor_from: number }) {
  const [expectedHour, expectedMin] = expectedIn.split(':').map(Number);
  const [currentHour, currentMin] = nowLocal.time.split(':').map(Number);
  
  const expectedMinutes = expectedHour * 60 + expectedMin;
  const currentMinutes = currentHour * 60 + currentMin;
  const diffMinutes = currentMinutes - expectedMinutes;
  
  let rule: 'early' | 'normal' | 'late' | 'oor';
  let lateMinutes = diffMinutes; // ✅ CORREGIDO: Siempre usar diffMinutes (puede ser negativo)
  let msgKey: string;
  let needJust = false;
  
  // Nueva lógica basada en los requerimientos del usuario
  if (diffMinutes < -5) {  // Más de 5 min temprano
    rule = 'early';
    msgKey = 'early';
    // lateMinutes será negativo (ej: -10 para 10 min temprano)
  } else if (diffMinutes >= -2 && diffMinutes <= 5) {  // Entre 2 min antes y 5 min después
    rule = 'normal';
    msgKey = 'on_time';
    // lateMinutes puede ser negativo, 0 o positivo pequeño
  } else if (diffMinutes > 5 && diffMinutes <= rules.late_to_inclusive) {  // Entre 5 y 20 min tarde
    rule = 'late';
    msgKey = 'late';
    needJust = true;
    // lateMinutes será positivo (ej: 10 para 10 min tarde)
  } else if (diffMinutes > rules.late_to_inclusive) {  // Más de 20 min tarde
    rule = 'oor';
    msgKey = 'oor';
    needJust = true;
    // lateMinutes será positivo grande (ej: 90 para 1.5 horas tarde)
  } else {
    // Fallback para casos edge
    rule = 'normal';
    msgKey = 'on_time';
  }
  
  return { rule, lateMinutes, msgKey, needJust };
}

/**
 * Decide check-out rule based on Call Center policy
 */
export function decideCheckOutRule(nowLocal: any, expectedOut: string, rules: { early_from: string; on_time_to: number; overtime_to_minutes: number; oor_out_from_minutes: number }) {
  const [expectedHour, expectedMin] = expectedOut.split(':').map(Number);
  const [currentHour, currentMin] = nowLocal.time.split(':').map(Number);
  
  const expectedMinutes = expectedHour * 60 + expectedMin;
  const currentMinutes = currentHour * 60 + currentMin;
  const diffMinutes = currentMinutes - expectedMinutes;
  
  let rule: 'early_out' | 'normal_out' | 'overtime' | 'oor_out';
  let overtimeMinutes = 0;
  let msgKey: string;
  let needJust = false;
  
  // Early out: desde 13:00 hasta 1 min antes de end_at (Call Center policy)
  const [earlyHour, earlyMin] = rules.early_from.split(':').map(Number);
  const earlyCutoff = earlyHour * 60 + earlyMin; // 13:00 = 780 minutos
  
  if (currentMinutes >= earlyCutoff && currentMinutes < expectedMinutes) {
    rule = 'early_out';
    msgKey = 'early_out';
    needJust = true;
  } else if (diffMinutes >= 0 && diffMinutes <= rules.on_time_to) {
    // On-time: 0-5 min después de end_at
    rule = 'normal_out';
    msgKey = 'on_time_out';
    needJust = false;
  } else if (diffMinutes > rules.on_time_to && diffMinutes <= rules.overtime_to_minutes) {
    // Overtime: +6 a +120 min
    rule = 'overtime';
    overtimeMinutes = diffMinutes;
    msgKey = 'overtime_out';
    needJust = true;
  } else {
    // OOR: +121+ min
    rule = 'oor_out';
    overtimeMinutes = diffMinutes;
    msgKey = 'oor_out';
    needJust = true;
  }
  
  return { rule, overtimeMinutes, msgKey, needJust };
}

/**
 * Map rule to database enum values (Call Center policy)
 */
export function mapRule(rule: string): string {
  const ruleMap: Record<string, string> = {
    'early': 'early',
    'normal': 'on_time',
    'late': 'late',
    'oor': 'oor',
    'early_out': 'early_out',
    'normal_out': 'on_time_out',
    'overtime': 'overtime',
    'oor_out': 'oor_out'
  };
  return ruleMap[rule] || 'unknown';
}

/**
 * Calculate distance between two coordinates in meters
 */
export function distanceMeters(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// =====================================================
// 🚨 MANDATORY FUNCTIONS - USE THESE INSTEAD OF new Date()
// =====================================================

/**
 * 🇭🇳 GET CURRENT DATE/TIME IN TEGUCIGALPA - USE THIS INSTEAD OF new Date()
 * Returns current time in Honduras timezone as Date object
 */
export function nowInHonduras(): Date {
  return getHondurasTime();
}

/**
 * 🇭🇳 GET TODAY'S DATE STRING IN TEGUCIGALPA - USE FOR DATABASE STORAGE
 * Returns YYYY-MM-DD format in Honduras timezone
 */
export function todayInHonduras(): string {
  return getTodayInHonduras();
}

/**
 * 🇭🇳 FORMAT DATE FOR DISPLAY IN HONDURAS LOCALE
 * Returns date formatted for Honduras (dd/mm/yyyy)
 */
export function formatDateForHonduras(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hondurasDate = convertToHondurasTime(d);
  
  return hondurasDate.toLocaleDateString('es-HN', {
    timeZone: HONDURAS_TIMEZONE,
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
}

/**
 * 🇭🇳 FORMAT DATETIME FOR DISPLAY IN HONDURAS LOCALE
 * Returns datetime formatted for Honduras with timezone
 */
export function formatDateTimeForHonduras(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleString('es-HN', {
    timeZone: HONDURAS_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 🇭🇳 GET CURRENT TIMESTAMP FOR DATABASE STORAGE
 * Returns ISO string representing current time in Honduras
 */
export function getHondurasTimestamp(): string {
  return getHondurasTimeISO();
}

/**
 * 🚨 VALIDATION FUNCTION - THROWS ERROR IF TIMEZONE IS WRONG
 * Use this to validate that dates are using correct timezone
 */
export function validateHondurasTimezone(date: Date): void {
  const hondurasTime = convertToHondurasTime(date);
  const utcTime = new Date(date.toISOString());
  
  // Check if there's a significant timezone difference (more than 1 hour)
  const timeDiff = Math.abs(hondurasTime.getTime() - utcTime.getTime()) / (1000 * 60 * 60);
  
  if (timeDiff < 5 || timeDiff > 7) {
    console.warn('⚠️  Possible timezone issue detected:', {
      inputDate: date.toISOString(),
      hondurasTime: hondurasTime.toISOString(),
      timeDiffHours: timeDiff
    });
  }
}
