import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { activarDemoBaseSalary, trialPayrollConfigInsert } from '../lib/activar-game/activar-form'
import {
  formatMoneyForCountry,
  formatPdfMoney,
  resolvePayrollDisplayCurrency,
  statutoryUiLabels,
} from '../lib/country/display-money'
import { isPayrollCountryEngineEnabled } from '../lib/features/payroll-country-flags'
import { buildPayrollReceiptEmailText } from '../lib/emails/payroll-receipt-email'

describe('SLV/GTM tenant money and statutory labels', () => {
  it('country_code gana sobre metadata HNL residual', () => {
    assert.equal(resolvePayrollDisplayCurrency('SLV', 'HNL'), 'USD')
    assert.equal(resolvePayrollDisplayCurrency('GTM', 'HNL'), 'GTQ')
    assert.equal(resolvePayrollDisplayCurrency('HND', 'USD'), 'HNL')
  })

  it('formatters SLV no pintan L. ni HNL', () => {
    const ui = formatMoneyForCountry(420, 'SLV')
    const pdf = formatPdfMoney(420, 'USD')
    assert.equal(ui.includes('L.'), false)
    assert.equal(ui.includes('HNL'), false)
    assert.equal(pdf.includes('L.'), false)
    assert.equal(pdf.includes('HNL'), false)
    assert.equal(pdf.startsWith('$'), true)
  })

  it('formatters GTM usan quetzales', () => {
    const pdf = formatPdfMoney(4200, 'GTQ')
    assert.equal(pdf.includes('L.'), false)
    assert.equal(pdf.includes('HNL'), false)
    assert.match(pdf, /^Q /)
  })

  it('etiquetas estatutarias por país', () => {
    assert.deepEqual(statutoryUiLabels('SLV'), {
      primarySocial: 'ISSS',
      secondarySocial: 'AFP',
      incomeTax: 'ISR',
    })
    assert.deepEqual(statutoryUiLabels('GTM'), {
      primarySocial: 'IGSS',
      secondarySocial: '—',
      incomeTax: 'ISR',
    })
    assert.deepEqual(statutoryUiLabels('HND'), {
      primarySocial: 'IHSS',
      secondarySocial: 'RAP',
      incomeTax: 'ISR',
    })
  })

  it('motor SLV/GTM queda habilitado por defecto', () => {
    assert.equal(isPayrollCountryEngineEnabled('SLV'), true)
    assert.equal(isPayrollCountryEngineEnabled('GTM'), true)
  })

  it('salarios demo trial usan escala del país', () => {
    assert.equal(activarDemoBaseSalary('SLV', 0), 420)
    assert.equal(activarDemoBaseSalary('GTM', 0), 4200)
    assert.equal(activarDemoBaseSalary('HND', 0), 8000)
  })

  it('config trial persiste moneda del país', () => {
    const slv = trialPayrollConfigInsert('co-1', 'SLV')
    const gtm = trialPayrollConfigInsert('co-2', 'GTM')
    assert.equal(slv.metadata.currency, 'USD')
    assert.equal(slv.metadata.legal_deductions.rap, true)
    assert.equal(gtm.metadata.currency, 'GTQ')
    assert.equal(gtm.metadata.legal_deductions.rap, false)
  })

  it('email de recibo SLV no usa L. ni IHSS/RAP', () => {
    const text = buildPayrollReceiptEmailText({
      employeeName: 'Ana',
      periodLabel: '2026-08 Q1',
      grossSalary: 210,
      ihss: 6.3,
      rap: 15.225,
      isr: 0,
      netSalary: 188.475,
      countryCode: 'SLV',
    })
    assert.equal(text.includes('L.'), false)
    assert.equal(text.includes('IHSS'), false)
    assert.equal(text.includes('RAP'), false)
    assert.equal(text.includes('ISSS'), true)
    assert.equal(text.includes('AFP'), true)
  })
})
