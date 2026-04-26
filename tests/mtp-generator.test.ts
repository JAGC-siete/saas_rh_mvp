import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { generateFinalFunction } from '../lib/mtp/generator'

describe('MTP generator', () => {
  it('redacta una función evaluable con verbo, tarea, estándar e indicador', () => {
    const result = generateFinalFunction({
      actionVerb: 'Preparar',
      task: 'los platillos del menú',
      standard: 'siguiendo al 100% las fichas técnicas y gramajes',
      indicator: 'mantener la merma por debajo del 3%'
    })

    assert.equal(
      result,
      'Preparar los platillos del menú siguiendo al 100% las fichas técnicas y gramajes para mantener la merma por debajo del 3%.'
    )
  })

  it('respeta indicadores que ya empiezan con para', () => {
    const result = generateFinalFunction({
      actionVerb: 'Limpiar',
      task: 'la estación de trabajo',
      standard: 'al inicio y final de cada turno',
      indicator: 'para pasar auditorías internas con más de 98%'
    })

    assert.equal(
      result,
      'Limpiar la estación de trabajo al inicio y final de cada turno para pasar auditorías internas con más de 98%.'
    )
  })

  it('devuelve vacío si no hay verbo ni tarea', () => {
    const result = generateFinalFunction({
      actionVerb: '',
      task: '',
      standard: 'cada turno',
      indicator: '0 quejas'
    })

    assert.equal(result, '')
  })
})
