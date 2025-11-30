import { supabase } from './supabaseClient';
// import { HikvisionISAPI } from 'hikvision-isapi';

// Intervalo de chequeo en milisegundos (ej. cada 5 minutos)
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;

/**
 * Realiza un chequeo de salud activo en un solo dispositivo.
 * @param device - El objeto del dispositivo a chequear.
 */
async function checkDeviceHealth(device: any) {
  console.log(`[HealthCheck] Checking device: ${device.name} (${device.ip_address})`);
  let isOnline = false;

  try {
    // En una implementación real, aquí iría la lógica de conexión
    // usando la librería `hikvision-isapi`.
    // const hikvisionClient = new HikvisionISAPI({ ... });
    // const systemInfo = await hikvisionClient.System.getSystemInfo();
    // isOnline = !!systemInfo;
    
    // Simulamos una conexión. Para probar, podemos hacer que falle aleatoriamente.
    isOnline = Math.random() > 0.2; // 80% de probabilidad de estar online

    console.log(`[HealthCheck] Device ${device.name} is ${isOnline ? 'online' : 'offline'}`);

    // Actualizar el estado en la base de datos
    const { error } = await supabase
      .from('devices')
      .update({
        status: isOnline ? 'online' : 'offline',
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', device.id);

    if (error) {
      console.error(`[HealthCheck] Error updating status for device ${device.name}`, error);
    }

  } catch (error) {
    console.error(`[HealthCheck] Failed to connect to device ${device.name}`, error);
    // Si la conexión falla, asegurarnos de marcarlo como offline
    await supabase
      .from('devices')
      .update({ status: 'offline', last_sync_at: new Date().toISOString() })
      .eq('id', device.id);
  }
}

/**
 * Inicia el servicio de monitoreo que se ejecuta periódicamente.
 */
export function startHealthCheckService() {
  console.log('[HealthCheck] Starting health check service...');

  const runChecks = async () => {
    console.log('[HealthCheck] Running scheduled health checks...');
    
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('[HealthCheck] Could not fetch devices for health check', error);
      return;
    }

    if (!devices || devices.length === 0) {
      console.log('[HealthCheck] No active devices to check.');
      return;
    }

    console.log(`[HealthCheck] Found ${devices.length} active devices to check.`);
    // Ejecutar los chequeos en paralelo
    await Promise.all(devices.map(checkDeviceHealth));
  };

  // Ejecutar al iniciar y luego cada X intervalo
  runChecks();
  setInterval(runChecks, HEALTH_CHECK_INTERVAL);

  console.log(`[HealthCheck] Service started. Checks will run every ${HEALTH_CHECK_INTERVAL / 1000} seconds.`);
}
