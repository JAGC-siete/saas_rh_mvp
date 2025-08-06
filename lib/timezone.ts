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
