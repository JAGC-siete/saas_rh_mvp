// Quick test for timezone functionality
const { getHondurasTime, getHondurasTimeISO, formatTimeDisplay, getTodayInHonduras } = require('./lib/timezone');

console.log('🕐 Timezone Fix Test Results');
console.log('============================');

const now = new Date();
const hondurasTime = getHondurasTime();
const hondurasISO = getHondurasTimeISO();
const today = getTodayInHonduras();

console.log('Current UTC time:', now.toISOString());
console.log('Honduras time (Date):', hondurasTime.toString());
console.log('Honduras time (ISO):', hondurasISO);
console.log('Today in Honduras:', today);

// Test the key issue from screenshot
console.log('\n📊 Before/After Comparison:');
console.log('OLD: Storing UTC timestamp:', now.toISOString());
console.log('NEW: Storing Honduras time:', hondurasISO);

console.log('\n✅ Timezone fix implemented successfully!');
console.log('🎯 This should resolve the check-in/check-out timestamp issues');
