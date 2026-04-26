#!/usr/bin/env node

/**
 * Script para analizar y comparar configuraciones de dispositivos Hikvision
 * 
 * Uso:
 *   node scripts/analyze-device-config.js <working_device_id> <new_device_id>
 * 
 * Ejemplo:
 *   node scripts/analyze-device-config.js 24e66ba0-c3e5-4d76-b686-e6e9744b217c 8cde857a-e726-495b-8147-40255ae5281d
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Intentar cargar variables de entorno de múltiples archivos
const envFiles = ['.env.local', '.env', '.env.production'];
for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getDeviceConfig(deviceId) {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      id,
      company_id,
      name,
      device_type,
      ip_address,
      port,
      username,
      password_encrypted,
      webhook_url,
      webhook_configured,
      is_active,
      status,
      settings,
      mac_address,
      last_seen_at,
      last_event_at,
      last_webhook_test_at,
      webhook_test_result,
      created_at,
      updated_at
    `)
    .eq('id', deviceId)
    .single();

  if (error) {
    console.error(`❌ Error obteniendo dispositivo ${deviceId}:`, error.message);
    return null;
  }

  return data;
}

async function getCompanyConfig(companyId) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, is_active')
    .eq('id', companyId)
    .single();

  if (error) {
    console.error(`❌ Error obteniendo empresa ${companyId}:`, error.message);
    return null;
  }

  return data;
}

async function getRecentAttendanceRecords(companyId, limit = 5) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, employee_id, date, check_in, check_out, event_uid, metadata, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`❌ Error obteniendo registros de asistencia:`, error.message);
    return [];
  }

  return data || [];
}

async function getEmployeesSample(companyId, limit = 3) {
  const { data, error } = await supabase
    .from('employees')
    .select('id, dni, name, status, pay_type')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .limit(limit);

  if (error) {
    console.error(`❌ Error obteniendo empleados:`, error.message);
    return [];
  }

  return data || [];
}

function parseSettings(settingsStr) {
  if (!settingsStr) return null;
  try {
    return typeof settingsStr === 'string' ? JSON.parse(settingsStr) : settingsStr;
  } catch {
    return { raw: settingsStr };
  }
}

function formatComparison(working, newDevice) {
  const comparison = {
    device: {},
    webhook: {},
    settings: {},
    status: {},
    metadata: {}
  };

  // Comparación básica del dispositivo
  comparison.device = {
    name: { working: working.name, new: newDevice.name },
    device_type: { working: working.device_type, new: newDevice.device_type },
    ip_address: { working: working.ip_address, new: newDevice.ip_address },
    port: { working: working.port, new: newDevice.port },
    mac_address: { 
      working: working.mac_address?.trim() || null, 
      new: newDevice.mac_address?.trim() || null,
      note: newDevice.mac_address?.includes('\n') ? '⚠️ MAC tiene salto de línea' : '✅'
    }
  };

  // Comparación de webhook
  comparison.webhook = {
    webhook_url: { 
      working: working.webhook_url, 
      new: newDevice.webhook_url,
      match: working.webhook_url === newDevice.webhook_url ? '✅' : '⚠️ Diferentes'
    },
    webhook_configured: { 
      working: working.webhook_configured, 
      new: newDevice.webhook_configured 
    },
    last_seen_at: { 
      working: working.last_seen_at, 
      new: newDevice.last_seen_at 
    },
    last_event_at: { 
      working: working.last_event_at, 
      new: newDevice.last_event_at 
    }
  };

  // Comparación de settings
  const workingSettings = parseSettings(working.settings);
  const newSettings = parseSettings(newDevice.settings);
  
  comparison.settings = {
    secret: { 
      working: workingSettings?.secret ? '***' : null, 
      new: newSettings?.secret ? '***' : null 
    },
    timezone: { 
      working: workingSettings?.timezone, 
      new: newSettings?.timezone,
      match: workingSettings?.timezone === newSettings?.timezone ? '✅' : '⚠️'
    },
    signature_header: { 
      working: workingSettings?.signature_header, 
      new: newSettings?.signature_header 
    },
    verify_mode_whitelist: { 
      working: workingSettings?.verify_mode_whitelist, 
      new: newSettings?.verify_mode_whitelist 
    }
  };

  // Comparación de estado
  comparison.status = {
    is_active: { working: working.is_active, new: newDevice.is_active },
    status: { working: working.status, new: newDevice.status },
    last_seen_at: { working: working.last_seen_at, new: newDevice.last_seen_at },
    last_event_at: { working: working.last_event_at, new: newDevice.last_event_at }
  };

  return comparison;
}

function printDeviceInfo(device, company, label) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📱 ${label.toUpperCase()}`);
  console.log('='.repeat(80));
  
  console.log(`\n🏢 Empresa:`);
  console.log(`   ID: ${company.id}`);
  console.log(`   Nombre: ${company.name}`);
  console.log(`   Activa: ${company.is_active ? '✅' : '❌'}`);
  
  console.log(`\n🔧 Dispositivo:`);
  console.log(`   ID: ${device.id}`);
  console.log(`   Nombre: ${device.name}`);
  console.log(`   Tipo: ${device.device_type}`);
  console.log(`   IP: ${device.ip_address}:${device.port}`);
  console.log(`   MAC: ${device.mac_address?.trim() || 'N/A'}`);
  console.log(`   Usuario: ${device.username}`);
  console.log(`   Password: ${device.password_encrypted ? '***' : 'N/A'}`);
  
  console.log(`\n🌐 Webhook:`);
  console.log(`   URL: ${device.webhook_url}`);
  console.log(`   Configurado: ${device.webhook_configured ? '✅' : '❌'}`);
  console.log(`   Última conexión: ${device.last_seen_at || 'Nunca'}`);
  console.log(`   Último evento: ${device.last_event_at || 'Nunca'}`);
  
  const settings = parseSettings(device.settings);
  if (settings) {
    console.log(`\n⚙️  Settings:`);
    console.log(`   Timezone: ${settings.timezone || 'N/A'}`);
    console.log(`   Signature Header: ${settings.signature_header || 'N/A'}`);
    console.log(`   Verify Modes: ${settings.verify_mode_whitelist ? settings.verify_mode_whitelist.join(', ') : 'N/A'}`);
    console.log(`   Secret: ${settings.secret ? '*** Configurado' : '❌ No configurado'}`);
  }
  
  console.log(`\n📊 Estado:`);
  console.log(`   Activo: ${device.is_active ? '✅' : '❌'}`);
  console.log(`   Status: ${device.status || 'N/A'}`);
}

function printComparison(comparison) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 COMPARACIÓN DETALLADA`);
  console.log('='.repeat(80));
  
  console.log(`\n📱 Dispositivo:`);
  console.log(`   Nombre: ${comparison.device.name.working} vs ${comparison.device.name.new}`);
  console.log(`   Tipo: ${comparison.device.device_type.working} vs ${comparison.device.device_type.new}`);
  console.log(`   IP: ${comparison.device.ip_address.working}:${comparison.device.port.working} vs ${comparison.device.ip_address.new}:${comparison.device.port.new}`);
  console.log(`   MAC: ${comparison.device.mac_address.working || 'N/A'} vs ${comparison.device.mac_address.new || 'N/A'} ${comparison.device.mac_address.note || ''}`);
  
  console.log(`\n🌐 Webhook:`);
  console.log(`   URL: ${comparison.webhook.webhook_url.match}`);
  console.log(`   Configurado: ${comparison.webhook.webhook_configured.working ? '✅' : '❌'} vs ${comparison.webhook.webhook_configured.new ? '✅' : '❌'}`);
  console.log(`   Última conexión: ${comparison.webhook.last_seen_at.working || 'Nunca'} vs ${comparison.webhook.last_seen_at.new || 'Nunca'}`);
  console.log(`   Último evento: ${comparison.webhook.last_event_at.working || 'Nunca'} vs ${comparison.webhook.last_event_at.new || 'Nunca'}`);
  
  console.log(`\n⚙️  Settings:`);
  console.log(`   Timezone: ${comparison.settings.timezone.working || 'N/A'} vs ${comparison.settings.timezone.new || 'N/A'} ${comparison.settings.timezone.match || ''}`);
  console.log(`   Signature Header: ${comparison.settings.signature_header.working || 'N/A'} vs ${comparison.settings.signature_header.new || 'N/A'}`);
  console.log(`   Verify Modes: ${JSON.stringify(comparison.settings.verify_mode_whitelist.working || [])} vs ${JSON.stringify(comparison.settings.verify_mode_whitelist.new || [])}`);
}

function printExpectedFormat() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 FORMATO ESPERADO POR EL SOFTWARE`);
  console.log('='.repeat(80));
  
  console.log(`\n📨 Estructura del JSON que debe enviar el dispositivo:`);
  console.log(`
{
  "eventType": "access" | "heartBeat",
  "eventState": "active" | "inactive",
  "dateTime": "2025-01-28T13:30:00" | "2025-01-28T13:30:00Z",
  
  // OPCIONES DE ESTRUCTURA (según firmware):
  
  // Opción 1: AccessControllerEvent directo
  "AccessControllerEvent": {
    "employeeNoString": "0801199012345",  // ⚠️ REQUERIDO para crear attendance_records
    "employeeNo": 801199012345,           // Alternativa
    "cardNo": "12345678",                 // Alternativa
    "doorNo": 1,
    "readerNo": 1,
    "currentVerifyMode": "face" | "fingerprint" | "card",
    "dateTime": "2025-01-28T13:30:00"
  },
  
  // Opción 2: Dentro de EventNotificationAlert
  "EventNotificationAlert": {
    "AccessControllerEvent": {
      "employeeNoString": "0801199012345",
      ...
    }
  },
  
  // Opción 3: AcsEvent (alias)
  "AcsEvent": {
    "employeeNoString": "0801199012345",
    ...
  }
}

⚠️ CRÍTICO: El campo employeeNoString/cardNo/employeeNo es OBLIGATORIO.
   Sin este campo, el webhook responderá 200 OK pero NO creará attendance_records.
  `);
  
  console.log(`\n🔍 Campos que el código busca (en orden de prioridad):`);
  console.log(`
   1. acs.employeeNoString
   2. acs.employeeNo
   3. acs.cardNo
   4. root.employeeNoString  (fallback)
   5. root.employeeNo        (fallback)
   6. root.cardNo            (fallback)
  `);
  
  console.log(`\n✅ Proceso de matching:`);
  console.log(`
   1. Normaliza el identificador (solo dígitos): "0801-1990-12345" → "0801199012345"
   2. Busca empleado en BD: employees.dni = "0801199012345" AND status = 'active'
   3. Si encuentra: crea/actualiza attendance_records
   4. Si NO encuentra: log "[ACCESS EVENT] Employee not found" y sale
  `);
}

async function main() {
  const workingDeviceId = process.argv[2] || '24e66ba0-c3e5-4d76-b686-e6e9744b217c';
  const newDeviceId = process.argv[3] || '8cde857a-e726-495b-8147-40255ae5281d';
  
  console.log(`\n🔍 Analizando dispositivos:`);
  console.log(`   ✅ Funcionando: ${workingDeviceId}`);
  console.log(`   🆕 Nuevo: ${newDeviceId}`);
  
  // Obtener configuraciones
  const workingDevice = await getDeviceConfig(workingDeviceId);
  const newDevice = await getDeviceConfig(newDeviceId);
  
  if (!workingDevice || !newDevice) {
    console.error('\n❌ No se pudieron obtener las configuraciones');
    process.exit(1);
  }
  
  // Obtener información de empresas
  const workingCompany = await getCompanyConfig(workingDevice.company_id);
  const newCompany = await getCompanyConfig(newDevice.company_id);
  
  // Obtener registros recientes de asistencia (solo del que funciona)
  const recentRecords = await getRecentAttendanceRecords(workingDevice.company_id, 3);
  
  // Obtener muestra de empleados
  const workingEmployees = await getEmployeesSample(workingDevice.company_id, 3);
  
  // Mostrar información
  printDeviceInfo(workingDevice, workingCompany, 'Dispositivo que funciona');
  
  if (recentRecords.length > 0) {
    console.log(`\n📊 Registros recientes de asistencia (últimos ${recentRecords.length}):`);
    recentRecords.forEach((record, idx) => {
      console.log(`\n   ${idx + 1}. Registro ID: ${record.id}`);
      console.log(`      Empleado ID: ${record.employee_id}`);
      console.log(`      Fecha: ${record.date}`);
      console.log(`      Check-in: ${record.check_in || 'N/A'}`);
      console.log(`      Check-out: ${record.check_out || 'N/A'}`);
      console.log(`      Event UID: ${record.event_uid}`);
      if (record.metadata) {
        console.log(`      Metadata: ${JSON.stringify(record.metadata, null, 8)}`);
      }
    });
  }
  
  if (workingEmployees.length > 0) {
    console.log(`\n👥 Muestra de empleados activos (${workingEmployees.length}):`);
    workingEmployees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.name} - DNI: ${emp.dni} - Tipo: ${emp.pay_type || 'N/A'}`);
    });
  }
  
  printDeviceInfo(newDevice, newCompany, 'Dispositivo nuevo');
  
  // Comparación
  const comparison = formatComparison(workingDevice, newDevice);
  printComparison(comparison);
  
  // Formato esperado
  printExpectedFormat();
  
  // Recomendaciones
  console.log(`\n${'='.repeat(80)}`);
  console.log(`💡 RECOMENDACIONES PARA EL DISPOSITIVO NUEVO`);
  console.log('='.repeat(80));
  
  const issues = [];
  
  if (!newDevice.mac_address || newDevice.mac_address.includes('\n')) {
    issues.push('⚠️ MAC_ADDRESS tiene salto de línea. Normalizar en BD.');
  }
  
  if (!newDevice.last_event_at) {
    issues.push('⚠️ No hay eventos de acceso registrados. Verificar configuración del dispositivo.');
  }
  
  const newSettings = parseSettings(newDevice.settings);
  if (!newSettings?.timezone) {
    issues.push('⚠️ Timezone no configurado en settings.');
  }
  
  if (newDevice.webhook_url !== workingDevice.webhook_url) {
    issues.push('ℹ️ Webhook URLs diferentes (puede ser normal si son empresas diferentes).');
  }
  
  if (issues.length > 0) {
    console.log('\n📋 Problemas detectados:');
    issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue}`);
    });
  } else {
    console.log('\n✅ No se detectaron problemas obvios en la configuración.');
  }
  
  console.log(`\n🔧 Acciones sugeridas:`);
  console.log(`   1. Verificar en logs de Railway que el dispositivo está enviando eventos con employeeNoString/cardNo`);
  console.log(`   2. Si los eventos llegan pero no tienen employeeNoString, configurar el dispositivo para incluir este campo`);
  console.log(`   3. Verificar que los empleados en BD tengan DNI que coincida con employeeNoString del dispositivo`);
  console.log(`   4. Revisar logs: buscar "[ACCESS EVENT] Extracted Access Control fields" para ver qué campos está recibiendo`);
  
  console.log(`\n`);
}

main().catch(console.error);
