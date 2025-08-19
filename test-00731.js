// Test script para diagnosticar el error de 00731 a las 7:11 AM
const { toHN } = require('./lib/timezone.ts');

console.log('🔍 DIAGNÓSTICO DE ERROR - Empleado 00731 a las 7:11 AM');

// Simular la hora actual (7:11 AM Honduras)
const now = new Date();
const nowLocal = toHN(now);

console.log('⏰ Tiempo actual:');
console.log('UTC:', now.toISOString());
console.log('Local (Honduras):', nowLocal.time);
console.log('Fecha:', nowLocal.date);
console.log('Día de semana:', nowLocal.dow);

// Simular la validación problemática
const currentHour = nowLocal.time.split(':')[0];
const currentHourNum = parseInt(currentHour);

console.log('\n🧮 VALIDACIÓN:');
console.log('Hora extraída:', currentHour);
console.log('Hora como número:', currentHourNum);
console.log('¿Es mayor que 11?:', currentHourNum > 11);

if (currentHourNum > 11) {
  console.log('❌ ERROR: Bloquearía check-in porque:', currentHourNum, '> 11');
} else {
  console.log('✅ OK: Permitiría check-in porque:', currentHourNum, '<= 11');
}

// También verificar si es fin de semana
console.log('\n📅 CONTEXTO:');
console.log('¿Es fin de semana?:', nowLocal.isWeekend);

// Simular horario de entrada típico
console.log('\n🎯 HORARIO ESPERADO:');
console.log('Entrada típica: 08:00');
console.log('Hora actual:', nowLocal.time);

// Calcular diferencia
const [actualHour, actualMin] = nowLocal.time.split(':').map(Number);
const actualMinutes = actualHour * 60 + actualMin;
const expectedMinutes = 8 * 60; // 08:00

const diffMinutes = actualMinutes - expectedMinutes;
console.log('Diferencia en minutos:', diffMinutes);

if (diffMinutes < 0) {
  console.log('📍 TEMPRANO por', Math.abs(diffMinutes), 'minutos');
} else if (diffMinutes <= 5) {
  console.log('📍 A TIEMPO (dentro de 5 min de gracia)');
} else {
  console.log('📍 TARDE por', diffMinutes, 'minutos');
}
