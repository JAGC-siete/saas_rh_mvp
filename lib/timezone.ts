/**
 * Timezone utility functions for HR SaaS System
 * Handles timezone conversion for attendance registration in Honduras timezone
 */

export const HONDURAS_TIMEZONE = 'America/Tegucigalpa';

/**
 * Get current time in Honduras timezone
 */
export function getHondurasTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: HONDURAS_TIMEZONE }));
}

/**
 * Convert a UTC timestamp to Honduras timezone
 */
export function convertToHondurasTime(utcTimestamp: string | Date): Date {
  const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
  return new Date(date.toLocaleString("en-US", { timeZone: HONDURAS_TIMEZONE }));
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
 */
export function formatTimeDisplay(timestamp: string | Date | null): string {
  if (!timestamp) return '--:--';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  // Convert to Honduras time for display
  const hondurasTime = convertToHondurasTime(date);
  
  return hondurasTime.toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
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
  const hondurasTime = new Date(utcDate.toLocaleString("en-US", { timeZone: HONDURAS_TIMEZONE }));
  
  const time = hondurasTime.toTimeString().slice(0, 5); // HH:MM
  const date = hondurasTime.toISOString().split('T')[0]; // YYYY-MM-DD
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
  let lateMinutes = 0;
  let msgKey: string;
  let needJust = false;
  
  if (diffMinutes < -rules.grace) {
    rule = 'early';
    msgKey = 'early';
  } else if (diffMinutes <= rules.grace) {
    rule = 'normal';
    msgKey = 'on_time';
  } else if (diffMinutes <= rules.late_to_inclusive) {
    rule = 'late';
    lateMinutes = diffMinutes;
    msgKey = 'late';
    needJust = true;
  } else {
    rule = 'oor';
    lateMinutes = diffMinutes;
    msgKey = 'oor';
    needJust = true;
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
