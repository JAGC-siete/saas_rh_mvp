// Test timezone functions to debug the date issue
import { getHondurasTime, getTodayInHonduras } from '../lib/timezone.ts';

console.log('=== DEBUG TIMEZONE FUNCTIONS ===');
console.log('Current UTC time:', new Date().toISOString());
console.log('Honduras time:', getHondurasTime().toISOString());
console.log('Today in Honduras:', getTodayInHonduras());

// Test with different times
const testTimes = [
  new Date('2025-08-07T10:00:00Z'), // UTC morning
  new Date('2025-08-07T15:00:00Z'), // UTC afternoon
  new Date('2025-08-07T23:00:00Z'), // UTC night
];

console.log('\n=== TESTING DIFFERENT TIMES ===');
testTimes.forEach(time => {
  console.log(`UTC: ${time.toISOString()}`);
  console.log(`Honduras: ${getHondurasTime(time).toISOString()}`);
  console.log(`Date: ${getTodayInHonduras(time)}`);
  console.log('---');
}); 