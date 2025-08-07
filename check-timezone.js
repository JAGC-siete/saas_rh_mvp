// Quick check: Verificar zona horaria actual
console.log('🕐 VERIFICACIÓN DE ZONA HORARIA');
console.log('================================');

// Hora actual en diferentes zonas
const now = new Date();
console.log('🌍 UTC:', now.toISOString());
console.log('🇭🇳 Tegucigalpa:', now.toLocaleString("en-US", {timeZone: "America/Tegucigalpa"}));
console.log('🖥️  Local:', now.toString());

// Verificar si es 4 de agosto
const hondurasDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Tegucigalpa"}));
console.log('📅 Fecha en Honduras:', hondurasDate.toDateString());
console.log('⏰ Hora en Honduras:', hondurasDate.toTimeString());

// Verificar si son las 8 AM
const hondurasHour = hondurasDate.getHours();
console.log('🕐 Hora actual en Honduras:', hondurasHour + ':00');

if (hondurasHour === 8) {
    console.log('✅ ¡Son las 8 AM en Tegucigalpa!');
} else {
    console.log('⚠️  No son las 8 AM en Tegucigalpa');
}

console.log('================================'); 