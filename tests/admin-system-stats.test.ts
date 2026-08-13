import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  computeConversionRate30d,
  getVentasBankConfigStatus,
  serviceStatusColorClass,
  serviceStatusLabel,
} from '../lib/admin/system-stats'

describe('admin system stats helpers', () => {
  it('serviceStatusLabel traduce estados de plataforma', () => {
    assert.equal(serviceStatusLabel('operational'), 'Operativa')
    assert.equal(serviceStatusLabel('degraded'), 'Degradada')
    assert.equal(serviceStatusLabel('offline'), 'Fuera de línea')
    assert.equal(serviceStatusLabel('unknown'), 'Sin datos')
  })

  it('serviceStatusColorClass asigna color por severidad', () => {
    assert.match(serviceStatusColorClass('operational'), /emerald/)
    assert.match(serviceStatusColorClass('degraded'), /amber/)
    assert.match(serviceStatusColorClass('offline'), /rose/)
    assert.match(serviceStatusColorClass('unknown'), /white/)
  })

  it('computeConversionRate30d calcula porcentaje con un decimal', () => {
    assert.equal(computeConversionRate30d(3, 10), 30)
    assert.equal(computeConversionRate30d(1, 3), 33.3)
    assert.equal(computeConversionRate30d(0, 0), null)
  })

  it('getVentasBankConfigStatus no expone valores de cuenta', () => {
    const prev = { ...process.env }
    process.env.VENTAS_BANK_BAC_ACCOUNT = '722983451'
    process.env.VENTAS_BANK_CLIENT_NAME = 'CLIENTE'
    process.env.VENTAS_BANK_CLIENT_DNI = '0510199100731'
    const status = getVentasBankConfigStatus()
    assert.equal(status.configured, true)
    assert.equal(status.hasBacAccount, true)
    assert.equal(status.hasClientName, true)
    assert.equal(JSON.stringify(status).includes('722983451'), false)
    process.env = prev
  })
})
