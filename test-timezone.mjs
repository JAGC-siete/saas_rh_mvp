#!/usr/bin/env node

// Test script to verify timezone fixes
import { 
  getHondurasTime, 
  getHondurasTimeISO, 
  getTodayInHonduras,
  formatTimeDisplay,
  getCurrentDayOfWeek,
  parseExpectedTime,
  getAttendanceStatus,
  calculateMinutesDifference,
  convertToHondurasTime
} from './lib/timezone.js'

console.log('🕐 Testing Timezone Utilities for Honduras')
console.log('==========================================')

// Test current time
const now = new Date()
const hondurasTime = getHondurasTime()
const hondurasISO = getHondurasTimeISO()
const today = getTodayInHonduras()

console.log('Current UTC time:', now.toISOString())
console.log('Honduras time:', hondurasTime.toString())
console.log('Honduras ISO:', hondurasISO)
console.log('Today in Honduras:', today)
console.log('Day of week:', getCurrentDayOfWeek())

// Test time formatting
console.log('\n📝 Time Formatting Tests')
console.log('------------------------')
console.log('Current time formatted:', formatTimeDisplay(hondurasTime))
console.log('Null time formatted:', formatTimeDisplay(null))
console.log('UTC time formatted:', formatTimeDisplay(now.toISOString()))

// Test attendance status calculation
console.log('\n⏰ Attendance Status Tests')
console.log('-------------------------')
const expectedCheckIn = parseExpectedTime('08:00', hondurasTime)
const lateCheckIn = parseExpectedTime('08:15', hondurasTime)
const earlyCheckIn = parseExpectedTime('07:50', hondurasTime)

console.log('Expected check-in:', expectedCheckIn.toLocaleTimeString())
console.log('Status for on-time:', getAttendanceStatus(expectedCheckIn, expectedCheckIn))
console.log('Status for late (15 min):', getAttendanceStatus(lateCheckIn, expectedCheckIn))
console.log('Status for early (10 min):', getAttendanceStatus(earlyCheckIn, expectedCheckIn))

// Test time differences
console.log('\n🔢 Time Difference Tests')
console.log('------------------------')
console.log('Late minutes:', calculateMinutesDifference(lateCheckIn, expectedCheckIn))
console.log('Early minutes:', calculateMinutesDifference(earlyCheckIn, expectedCheckIn))

// Test timezone conversion
console.log('\n🌍 Timezone Conversion Tests')
console.log('----------------------------')
const utcTimestamp = '2025-08-05T14:30:00.000Z'
const convertedTime = convertToHondurasTime(utcTimestamp)
console.log('UTC timestamp:', utcTimestamp)
console.log('Converted to Honduras:', convertedTime.toString())
console.log('Formatted for display:', formatTimeDisplay(utcTimestamp))

console.log('\n✅ All timezone utility tests completed!')
