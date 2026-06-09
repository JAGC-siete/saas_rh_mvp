import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
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
})
