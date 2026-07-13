import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ENLACE_COMPANY_ID,
  enlaceDniLast5,
  enlaceEmployeeCodeCandidates,
  enlaceFirstNameLetters,
  isEnlaceCompany,
  resolveEnlaceEmployeeCode,
  suggestEnlaceEmployeeCode,
} from '../lib/employees/enlace-employee-code'

describe('enlace-employee-code', () => {
  it('identifica solo la empresa Enlace', () => {
    assert.equal(isEnlaceCompany(ENLACE_COMPANY_ID), true)
    assert.equal(isEnlaceCompany('other-company'), false)
    assert.equal(isEnlaceCompany(null), false)
  })

  it('extrae letras del primer nombre sin acentos', () => {
    assert.equal(enlaceFirstNameLetters('Jorge Arturo Gomez Coello'), 'JORGE')
    assert.equal(enlaceFirstNameLetters('Héctor Manuel Lopez'), 'HECTOR')
    assert.equal(enlaceFirstNameLetters('Jesús Francisco'), 'JESUS')
  })

  it('toma los últimos 5 dígitos del DNI', () => {
    assert.equal(enlaceDniLast5('0510199100731'), '00731')
    assert.equal(enlaceDniLast5('0501-1984-02978'), '02978')
    assert.equal(enlaceDniLast5('123'), null)
  })

  it('genera J00731 para Jorge + DNI ejemplo', () => {
    assert.equal(
      suggestEnlaceEmployeeCode('Jorge Arturo Gomez Coello', '0510199100731'),
      'J00731'
    )
    assert.deepEqual(
      enlaceEmployeeCodeCandidates('Jorge Arturo Gomez Coello', '0510199100731'),
      ['J00731', 'JO00731', 'JOR00731', 'JORG00731', 'JORGE00731']
    )
  })

  it('ante duplicidad usa la segunda letra', () => {
    const code = resolveEnlaceEmployeeCode(
      'Jorge Arturo Gomez Coello',
      '0510199100731',
      ['J00731']
    )
    assert.equal(code, 'JO00731')
  })

  it('si agota letras, agrega sufijo numérico', () => {
    const taken = enlaceEmployeeCodeCandidates('Jo', '0510199100731')
    const code = resolveEnlaceEmployeeCode('Jo', '0510199100731', taken)
    assert.equal(code, 'JO007312')
  })
})
