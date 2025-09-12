/**
 * 🕐 TIME SERVICE - Centralized Time Management
 * 
 * ⚠️ CRITICAL: ALL TIME OPERATIONS MUST USE THIS SERVICE
 * 
 * This service provides a single source of truth for all time-related operations
 * in the attendance system, ensuring consistency across the entire application.
 */

import { HONDURAS_TIMEZONE } from '../timezone'

export interface TimeInfo {
  utc: Date
  local: Date
  time: string // HH:MM format
  date: string // YYYY-MM-DD format
  dow: number // Day of week (0=Sunday, 6=Saturday)
  timestamp: string // ISO string
}

export interface WorkTimeValidation {
  isWorkDay: boolean
  isWithinWorkHours: boolean
  isCheckInTime: boolean
  isCheckOutTime: boolean
  expectedCheckIn: string
  expectedCheckOut: string
  lateMinutes: number
  earlyMinutes: number
}

export class TimeService {
  /**
   * Get current time in Honduras timezone with all relevant info
   */
  static getCurrentHondurasTime(): TimeInfo {
    const nowUtc = new Date()
    const local = new Date(nowUtc.toLocaleString("en-US", { timeZone: HONDURAS_TIMEZONE }))
    
    const time = local.toTimeString().slice(0, 5) // HH:MM
    const date = local.toISOString().split('T')[0] // YYYY-MM-DD
    const dow = local.getDay() // 0=Sunday, 6=Saturday
    
    return {
      utc: nowUtc,
      local,
      time,
      date,
      dow,
      timestamp: local.toISOString()
    }
  }

  /**
   * Get current time in Honduras timezone as Date object
   */
  static getHondurasTime(): Date {
    return this.getCurrentHondurasTime().local
  }

  /**
   * Get today's date in Honduras timezone
   */
  static getTodayInHonduras(): string {
    return this.getCurrentHondurasTime().date
  }

  /**
   * Convert UTC timestamp to Honduras timezone
   */
  static convertToHondurasTime(utcTimestamp: string | Date): Date {
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp
    
    if (isNaN(date.getTime())) {
      return new Date()
    }
    
    return new Date(date.toLocaleString("en-US", { timeZone: HONDURAS_TIMEZONE }))
  }

  /**
   * Calculate late minutes based on expected and actual time
   */
  static calculateLateMinutes(actualTime: string, expectedTime: string): number {
    const [actualHour, actualMin] = actualTime.split(':').map(Number)
    const [expectedHour, expectedMin] = expectedTime.split(':').map(Number)
    
    const actualMinutes = actualHour * 60 + actualMin
    const expectedMinutes = expectedHour * 60 + expectedMin
    
    return Math.max(0, actualMinutes - expectedMinutes)
  }

  /**
   * Calculate early minutes for checkout
   */
  static calculateEarlyMinutes(actualTime: string, expectedTime: string): number {
    const [actualHour, actualMin] = actualTime.split(':').map(Number)
    const [expectedHour, expectedMin] = expectedTime.split(':').map(Number)
    
    const actualMinutes = actualHour * 60 + actualMin
    const expectedMinutes = expectedHour * 60 + expectedMin
    
    return Math.max(0, expectedMinutes - actualMinutes)
  }

  /**
   * Check if current time is within work hours
   */
  static isWithinWorkHours(
    currentTime: string, 
    expectedStart: string, 
    expectedEnd: string
  ): boolean {
    const [currentHour, currentMin] = currentTime.split(':').map(Number)
    const [startHour, startMin] = expectedStart.split(':').map(Number)
    const [endHour, endMin] = expectedEnd.split(':').map(Number)
    
    const currentMinutes = currentHour * 60 + currentMin
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }

  /**
   * Check if it's a work day (Monday to Saturday)
   */
  static isWorkDay(dayOfWeek: number): boolean {
    return dayOfWeek >= 1 && dayOfWeek <= 6 // Monday=1, Saturday=6
  }

  /**
   * Check if it's check-in time (7:00 AM to 11:00 AM)
   */
  static isCheckInTime(currentTime: string): boolean {
    const [hour] = currentTime.split(':').map(Number)
    return hour >= 7 && hour < 11
  }

  /**
   * Check if it's check-out time (4:30 PM to 9:00 PM)
   */
  static isCheckOutTime(currentTime: string): boolean {
    const [hour, min] = currentTime.split(':').map(Number)
    const minutes = hour * 60 + min
    
    // 4:30 PM = 16:30 = 990 minutes
    // 9:00 PM = 21:00 = 1260 minutes
    return minutes >= 990 && minutes <= 1260
  }

  /**
   * Get expected work hours for a specific day
   */
  static getExpectedWorkHours(
    dayOfWeek: number, 
    schedule: any
  ): { start: string; end: string } {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayName = dayNames[dayOfWeek]
    
    const start = schedule[`${todayName}_start`] || schedule.monday_start || '08:00'
    const end = schedule[`${todayName}_end`] || schedule.monday_end || '17:00'
    
    // Saturday half day override
    if (dayOfWeek === 6) {
      return { start, end: '12:00' }
    }
    
    return { start, end }
  }

  /**
   * Validate work time with comprehensive rules
   */
  static validateWorkTime(
    currentTime: TimeInfo,
    schedule: any
  ): WorkTimeValidation {
    const { start, end } = this.getExpectedWorkHours(currentTime.dow, schedule)
    
    const isWorkDay = this.isWorkDay(currentTime.dow)
    const isWithinWorkHours = this.isWithinWorkHours(currentTime.time, start, end)
    const isCheckInTime = this.isCheckInTime(currentTime.time)
    const isCheckOutTime = this.isCheckOutTime(currentTime.time)
    
    const lateMinutes = this.calculateLateMinutes(currentTime.time, start)
    const earlyMinutes = this.calculateEarlyMinutes(currentTime.time, end)
    
    return {
      isWorkDay,
      isWithinWorkHours,
      isCheckInTime,
      isCheckOutTime,
      expectedCheckIn: start,
      expectedCheckOut: end,
      lateMinutes,
      earlyMinutes
    }
  }

  /**
   * Format time for display
   */
  static formatTimeForDisplay(date: Date): string {
    return date.toLocaleTimeString('es-HN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  /**
   * Get timezone info for debugging
   */
  static getTimezoneInfo(): {
    timezone: string
    offset: string
    isDST: boolean
  } {
    const now = new Date()
    const hondurasTime = new Date(now.toLocaleString("en-US", { timeZone: HONDURAS_TIMEZONE }))
    
    return {
      timezone: HONDURAS_TIMEZONE,
      offset: hondurasTime.getTimezoneOffset().toString(),
      isDST: hondurasTime.getTimezoneOffset() !== -360 // Honduras is UTC-6, DST would be UTC-5
    }
  }
}
