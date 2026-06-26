import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('calculate-benefit API', () => {
  function mockRes() {
    const res: any = {
      statusCode: 200,
      headersSent: false,
      body: null as unknown,
      setHeader() {
        return res
      },
      status(code: number) {
        res.statusCode = code
        return res
      },
      json(data: unknown) {
        res.headersSent = true
        res.body = data
        return res
      },
    }
    return res
  }

  it('rechaza método GET', async () => {
    const handler = (await import('../pages/api/public/calculate-benefit')).default as any
    const res = mockRes()
    await handler({ method: 'GET', headers: { 'x-forwarded-for': '127.0.0.1' } }, res)
    assert.equal(res.statusCode, 405)
  })

  it('rechaza fechas inválidas con 400', async () => {
    const handler = (await import('../pages/api/public/calculate-benefit')).default as any
    const res = mockRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' },
        body: {
          tipo: '13AVO',
          salarioBaseMensual: 25000,
          fechaIngreso: '2025-06-01',
          fechaCalculo: '2025-01-01',
          modoCalculo: 'proporcional',
        },
      },
      res
    )
    assert.equal(res.statusCode, 400)
  })

  it('calcula 13AVO válido', async () => {
    const handler = (await import('../pages/api/public/calculate-benefit')).default as any
    const res = mockRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' },
        body: {
          tipo: '13AVO',
          salarioBaseMensual: 36000,
          fechaIngreso: '2025-01-01',
          fechaCalculo: '2025-06-30',
          modoCalculo: 'proporcional',
        },
      },
      res
    )
    assert.equal(res.statusCode, 200)
    const body = res.body as { monto: number; tipo: string }
    assert.equal(body.tipo, '13AVO')
    assert.ok(body.monto > 0)
  })
})
