import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  currencyForCountryCode,
  ianaTimezoneForCountryCode,
  isPublicCountryCode,
  isValidLocalMobileForCountry,
  normalizePublicCountryCode
} from '../lib/country/supported'
import { statutoryDeductionLabels, localeForCountry } from '../lib/country/payroll-labels'
import { currencyNounForCountry, formatMoneyForCountry, formatPdfMoney } from '../lib/country/display-money'
import { isPayrollCountryEngineEnabled } from '../lib/features/payroll-country-flags'
import { computePayrollEmployeeStatutoryDeductions } from '../lib/payroll/statutory-deductions-compute'
import { assertNonHndStatutoryConfigParses, payrollStatutoryErrorResponse } from '../lib/payroll/statutory-api-guard'
import { isPayrollEngineNotAvailableError } from '../lib/tax/statutory-payroll-errors'
import { parseColStatutoryConfig, resolveDatedPeriod } from '../lib/tax/statutory-config-validate'
import { colombiaHolidays, easterSunday } from '../lib/country/col/holidays'

const MIGRATION = readFileSync(
  join(__dirname, '../supabase/migrations/20261025180000_colombia_country_base.sql'),
  'utf8'
)

function between(text: string, tag: string): string {
  const parts = text.split(tag)
  assert.equal(parts.length, 3, `marcador ${tag} debe aparecer exactamente dos veces`)
  return parts[1]
}

describe('Colombia: país en la app', () => {
  it('zona horaria, moneda, locale y etiquetas propias (no las de Honduras)', () => {
    assert.equal(ianaTimezoneForCountryCode('COL'), 'America/Bogota')
    assert.equal(currencyForCountryCode('COL'), 'COP')
    assert.equal(localeForCountry('COL'), 'es-CO')
    const labels = statutoryDeductionLabels('COL')
    assert.equal(labels.primarySocial, 'Salud (EPS)')
    assert.equal(labels.secondarySocial, 'Pensión')
    assert.equal(labels.incomeTax, 'Retención en la fuente')
  })

  it('COP se muestra sin decimales y con punto de miles', () => {
    const shown = formatMoneyForCountry(1750905, 'COL')
    assert.match(shown, /1\.750\.905/)
    assert.doesNotMatch(shown, /,\d{2}$/)
    assert.equal(formatPdfMoney(1750905.4, 'COP'), '$ 1.750.905')
    assert.equal(currencyNounForCountry('COL'), 'pesos')
  })

  it('celular colombiano de 10 dígitos con o sin +57', () => {
    assert.ok(isValidLocalMobileForCountry('3001234567', 'COL'))
    assert.ok(isValidLocalMobileForCountry('+57 300 123 4567', 'COL'))
    assert.ok(!isValidLocalMobileForCountry('98765432', 'COL'))
  })

  it('las entradas públicas no aceptan COL', () => {
    assert.equal(isPublicCountryCode('COL'), false)
    assert.equal(normalizePublicCountryCode('COL'), 'HND')
    assert.equal(normalizePublicCountryCode('SV'), 'SLV')
  })
})

describe('Colombia: motor apagado', () => {
  const original = process.env.PAYROLL_COUNTRY_COL_ENABLED
  afterEach(() => {
    if (original === undefined) delete process.env.PAYROLL_COUNTRY_COL_ENABLED
    else process.env.PAYROLL_COUNTRY_COL_ENABLED = original
  })

  it('la bandera está apagada por defecto y solo se enciende explícitamente', () => {
    delete process.env.PAYROLL_COUNTRY_COL_ENABLED
    assert.equal(isPayrollCountryEngineEnabled('COL'), false)
    process.env.PAYROLL_COUNTRY_COL_ENABLED = '1'
    assert.equal(isPayrollCountryEngineEnabled('COL'), true)
  })

  it('el cálculo de deducciones falla con un error claro en vez de usar las reglas de Guatemala', async () => {
    await assert.rejects(
      computePayrollEmployeeStatutoryDeductions({
        countryCode: 'COL',
        year: 2026,
        baseMonthlySalary: 1750905,
        factor2Pagos: 0.5,
        legalDeductions: { ihss: true, rap: true, isr: true },
        simpleIsrMonthlyBase: 1750905,
        useIsrProjection: false,
        supabase: {}
      }),
      (e: unknown) => isPayrollEngineNotAvailableError(e)
    )
  })

  it('el guard de API responde 400 con un mensaje en palabras simples', async () => {
    let caught: unknown
    try {
      await assertNonHndStatutoryConfigParses('COL', 2026, { from: () => ({}) })
    } catch (e) {
      caught = e
    }
    const res = payrollStatutoryErrorResponse(caught)
    assert.ok(res)
    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'PAYROLL_ENGINE_NOT_AVAILABLE')
    assert.match(String(res.body.message), /Todavía no calculamos nómina/)
  })
})

describe('Colombia: festivos (Ley Emiliani)', () => {
  it('Pascua conocida', () => {
    assert.equal(easterSunday(2026).toISOString().slice(0, 10), '2026-04-05')
    assert.equal(easterSunday(2027).toISOString().slice(0, 10), '2027-03-28')
  })

  it('2026 tiene 18 festivos con los traslados al lunes', () => {
    const dates = colombiaHolidays(2026).map((h) => h.date)
    assert.equal(dates.length, 18)
    for (const d of ['2026-01-12', '2026-03-23', '2026-05-18', '2026-06-08', '2026-06-15', '2026-08-17', '2026-11-02', '2026-11-16']) {
      assert.ok(dates.includes(d), d)
    }
  })

  it('todo festivo trasladable que no es de Semana Santa cae en lunes', () => {
    for (const h of colombiaHolidays(2027)) {
      if (!h.movable || h.name.endsWith('Santo')) continue
      assert.equal(new Date(`${h.date}T00:00:00Z`).getUTCDay(), 1, `${h.name} ${h.date}`)
    }
  })
})

describe('Colombia: parámetros 2026 de la migración', () => {
  it('los festivos de la migración son los que genera el código', () => {
    assert.deepEqual(JSON.parse(between(MIGRATION, '$holidays$')), colombiaHolidays(2026))
  })

  it('la fila de parámetros es válida, inactiva y cambia a mitad de año', () => {
    assert.match(MIGRATION, /'COL', 2026, false,\s*\$json\$/)
    const cfg = parseColStatutoryConfig(JSON.parse(between(MIGRATION, '$json$')))
    assert.equal(resolveDatedPeriod(cfg.smmlv, '2026-03-01')?.value, 1750905)
    assert.equal(resolveDatedPeriod(cfg.uvt, '2026-03-01')?.value, 52374)
    assert.equal(resolveDatedPeriod(cfg.ordinary_hours, '2026-07-14')?.monthly_divisor, 220)
    assert.equal(resolveDatedPeriod(cfg.ordinary_hours, '2026-07-15')?.monthly_divisor, 210)
    assert.equal(resolveDatedPeriod(cfg.surcharges, '2026-06-30')?.sunday_holiday, 0.8)
    assert.equal(resolveDatedPeriod(cfg.surcharges, '2026-07-01')?.sunday_holiday, 0.9)
    assert.equal(resolveDatedPeriod(cfg.smmlv, '2027-01-01'), null)
  })

  it('el esquema rechaza vigencias traslapadas', () => {
    const cfg = JSON.parse(between(MIGRATION, '$json$'))
    cfg.surcharges[1].from = '2026-06-15'
    assert.throws(() => parseColStatutoryConfig(cfg), /traslapadas/)
  })
})
