// Test timezone functions to debug the date issue
const HONDURAS_TIMEZONE = 'America/Tegucigalpa';

function getHondurasTime() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: HONDURAS_TIMEZONE }));
}

function getTodayInHonduras() {
  const hondurasTime = getHondurasTime();
  return hondurasTime.toISOString().split('T')[0];
}

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
  const hondurasTime = new Date(time.toLocaleString("en-US", { timeZone: HONDURAS_TIMEZONE }));
  const hondurasDate = hondurasTime.toISOString().split('T')[0];
  console.log(`UTC: ${time.toISOString()}`);
  console.log(`Honduras: ${hondurasTime.toISOString()}`);
  console.log(`Date: ${hondurasDate}`);
  console.log('---');
}); 