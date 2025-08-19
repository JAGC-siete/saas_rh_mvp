#!/usr/bin/env node

/**
 * Test script for attendance validation logic
 * Simulates different check-in/check-out scenarios
 */

// Mock data for testing
const mockEmployee = {
  id: 'test-emp-001',
  dni: 'TEST001',
  name: 'Empleado de Prueba',
  work_schedule_id: 'test-schedule-001'
};

const mockSchedule = {
  id: 'test-schedule-001',
  monday_start: '08:00',
  monday_end: '17:00',
  tuesday_start: '08:00',
  tuesday_end: '17:00',
  wednesday_start: '08:00',
  wednesday_end: '17:00',
  thursday_start: '08:00',
  thursday_end: '17:00',
  friday_start: '08:00',
  friday_end: '17:00'
};

// Helper functions (copied from the API)
function getHondurasTime() {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Tegucigalpa"}));
}

function getCurrentDayOfWeek() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function parseExpectedTime(timeString, currentTime) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const expectedTime = new Date(currentTime);
  expectedTime.setHours(hours, minutes, 0, 0);
  return expectedTime;
}

function calculateMinutesDifference(currentTime, expectedTime) {
  return Math.round((currentTime - expectedTime) / (1000 * 60));
}

// Attendance validation logic (copied from the API)
function validateCheckIn(currentTime, expectedStartTime) {
  const diffMinutes = calculateMinutesDifference(currentTime, expectedStartTime);
  const lateMinutes = Math.max(0, diffMinutes);
  const earlyMinutes = Math.max(0, -diffMinutes);
  
  console.log(`\n🔍 Validando CHECK-IN:`);
  console.log(`   Hora actual: ${currentTime.toLocaleTimeString()}`);
  console.log(`   Hora esperada: ${expectedStartTime.toLocaleTimeString()}`);
  console.log(`   Diferencia: ${diffMinutes} minutos (${diffMinutes >= 0 ? 'tarde' : 'temprano'})`);
  console.log(`   Minutos tarde: ${lateMinutes}`);
  console.log(`   Minutos temprano: ${earlyMinutes}`);
  
  let checkInStatus = 'normal';
  let checkInMessage = '';
  let requiresJustification = false;
  let requiresAuthorization = false;
  
  if (earlyMinutes >= 120 && earlyMinutes <= 300) {
    // ⏳ Entrada temprana (⭐): Desde 2 horas antes hasta 5 minutos antes (120-300 min)
    checkInStatus = 'early';
    checkInMessage = 'Entrada temprana ⭐';
  } else if ((earlyMinutes >= 5 && earlyMinutes < 120) || (lateMinutes >= 0 && lateMinutes <= 5)) {
    // 🌅 Entrada normal: Desde 5 minutos antes hasta 5 minutos después
    checkInStatus = 'normal';
    checkInMessage = 'Entrada registrada normalmente 🌅';
  } else if (lateMinutes >= 6 && lateMinutes <= 20) {
    // ⏰ Entrada tarde (requiere justificación): 6-20 minutos tarde
    checkInStatus = 'late';
    checkInMessage = 'Entrada tardía ⏰, por favor justifica tu demora';
    requiresJustification = true;
  } else if (lateMinutes >= 21 && lateMinutes <= 240) {
    // 🚫 Muy tarde (requiere autorización): 21 minutos hasta 4 horas tarde
    checkInStatus = 'very_late';
    checkInMessage = 'Estás fuera de tu horario. Tu registro requiere autorización especial. Pasa a gerencia para aclarar el asunto';
    requiresAuthorization = true;
  } else {
    // Caso extremo: más de 4 horas tarde
    checkInStatus = 'extreme_late';
    checkInMessage = 'Registro fuera del horario laboral. Contacta a RRHH inmediatamente.';
    requiresAuthorization = true;
  }
  
  return {
    status: checkInStatus,
    message: checkInMessage,
    requiresJustification,
    requiresAuthorization,
    lateMinutes,
    earlyMinutes
  };
}

function validateCheckOut(currentTime, expectedEndTime) {
  const diffMinutes = calculateMinutesDifference(expectedEndTime, currentTime);
  const earlyDepartureMinutes = Math.max(0, diffMinutes);
  
  console.log(`\n🔍 Validando CHECK-OUT:`);
  console.log(`   Hora actual: ${currentTime.toLocaleTimeString()}`);
  console.log(`   Hora esperada: ${expectedEndTime.toLocaleTimeString()}`);
  console.log(`   Diferencia: ${diffMinutes} minutos (${diffMinutes >= 0 ? 'temprano' : 'tarde'})`);
  console.log(`   Minutos de salida temprana: ${earlyDepartureMinutes}`);
  
  // Verificar si es después de las 3:00 PM para salida temprana
  const currentHour = currentTime.getHours();
  const isAfter3PM = currentHour >= 15;
  
  let checkOutStatus = 'normal';
  let checkOutMessage = '';
  let requiresJustification = false;
  
  if (earlyDepartureMinutes >= 1 && isAfter3PM) {
    // ⏰ Salida temprana (requiere justificación): Desde 3:00 PM hasta 1 minuto antes
    checkOutStatus = 'early';
    checkOutMessage = 'Salida anticipada ⏰, por favor justifica tu salida';
    requiresJustification = true;
  } else {
    // 🙌 Salida normal o puntual: Desde la hora exacta de salida en adelante
    checkOutStatus = 'normal';
    checkOutMessage = 'Gracias por tu trabajo hoy, te esperamos mañana temprano';
  }
  
  return {
    status: checkOutStatus,
    message: checkOutMessage,
    requiresJustification,
    earlyDepartureMinutes,
    isAfter3PM
  };
}

// Test scenarios
function runTests() {
  console.log('🧪 INICIANDO PRUEBAS DE LÓGICA DE ASISTENCIA');
  console.log('=============================================\n');
  
  const dayOfWeek = getCurrentDayOfWeek();
  const startKey = `${dayOfWeek}_start`;
  const endKey = `${dayOfWeek}_end`;
  const startTime = mockSchedule[startKey];
  const endTime = mockSchedule[endKey];
  
  console.log(`📅 Día de la semana: ${dayOfWeek}`);
  console.log(`⏰ Horario asignado: ${startTime} - ${endTime}\n`);
  
  // Test CHECK-IN scenarios
  console.log('📥 PRUEBAS DE CHECK-IN:');
  console.log('======================');
  
  const checkInScenarios = [
    { name: 'Entrada muy temprana (3 horas antes)', time: '05:00' },
    { name: 'Entrada temprana (2 horas antes)', time: '06:00' },
    { name: 'Entrada temprana (1 hora antes)', time: '07:00' },
    { name: 'Entrada temprana (30 minutos antes)', time: '07:30' },
    { name: 'Entrada temprana (10 minutos antes)', time: '07:50' },
    { name: 'Entrada temprana (5 minutos antes)', time: '07:55' },
    { name: 'Entrada normal (4 minutos antes)', time: '07:56' },
    { name: 'Entrada normal (1 minuto antes)', time: '07:59' },
    { name: 'Entrada puntual', time: '08:00' },
    { name: 'Entrada normal (1 minuto tarde)', time: '08:01' },
    { name: 'Entrada normal (5 minutos tarde)', time: '08:05' },
    { name: 'Entrada tarde (6 minutos tarde)', time: '08:06' },
    { name: 'Entrada tarde (10 minutos tarde)', time: '08:10' },
    { name: 'Entrada tarde (20 minutos tarde)', time: '08:20' },
    { name: 'Muy tarde (21 minutos tarde)', time: '08:21' },
    { name: 'Muy tarde (1 hora tarde)', time: '09:00' },
    { name: 'Muy tarde (2 horas tarde)', time: '10:00' },
    { name: 'Muy tarde (4 horas tarde)', time: '12:00' },
    { name: 'Extremo (5 horas tarde)', time: '13:00' },
    { name: 'Extremo (8 horas tarde)', time: '16:00' }
  ];
  
  checkInScenarios.forEach(scenario => {
    console.log(`\n🧪 ${scenario.name}:`);
    const [hours, minutes] = scenario.time.split(':').map(Number);
    const testTime = new Date();
    testTime.setHours(hours, minutes, 0, 0);
    
    const expectedStart = parseExpectedTime(startTime, testTime);
    const result = validateCheckIn(testTime, expectedStart);
    
    console.log(`   ✅ Status: ${result.status}`);
    console.log(`   📝 Mensaje: ${result.message}`);
    if (result.requiresJustification) {
      console.log(`   ⚠️  Requiere justificación: SÍ`);
    }
    if (result.requiresAuthorization) {
      console.log(`   🚫 Requiere autorización: SÍ`);
    }
  });
  
  // Test CHECK-OUT scenarios
  console.log('\n\n📤 PRUEBAS DE CHECK-OUT:');
  console.log('======================');
  
  const checkOutScenarios = [
    { name: 'Salida muy temprana (antes de 3 PM)', time: '14:00' },
    { name: 'Salida temprana (3 PM)', time: '15:00' },
    { name: 'Salida temprana (4 PM)', time: '16:00' },
    { name: 'Salida temprana (1 minuto antes)', time: '16:59' },
    { name: 'Salida puntual', time: '17:00' },
    { name: 'Salida normal (1 minuto tarde)', time: '17:01' },
    { name: 'Salida normal (30 minutos tarde)', time: '17:30' },
    { name: 'Salida normal (1 hora tarde)', time: '18:00' }
  ];
  
  checkOutScenarios.forEach(scenario => {
    console.log(`\n🧪 ${scenario.name}:`);
    const [hours, minutes] = scenario.time.split(':').map(Number);
    const testTime = new Date();
    testTime.setHours(hours, minutes, 0, 0);
    
    const expectedEnd = parseExpectedTime(endTime, testTime);
    const result = validateCheckOut(testTime, expectedEnd);
    
    console.log(`   ✅ Status: ${result.status}`);
    console.log(`   📝 Mensaje: ${result.message}`);
    if (result.requiresJustification) {
      console.log(`   ⚠️  Requiere justificación: SÍ`);
    }
    console.log(`   🕐 Después de 3 PM: ${result.isAfter3PM ? 'SÍ' : 'NO'}`);
  });
  
  console.log('\n\n✅ PRUEBAS COMPLETADAS');
  console.log('=====================');
}

// Run tests
runTests(); 