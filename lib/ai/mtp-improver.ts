import type { MTPItem } from '../mtp/schema'

type MtpImproveSuccess = {
  success: true
  improvedFunction: string
  provider: 'groq'
}

type MtpImproveFailure = {
  success: false
  reason: 'no_key' | 'provider_error' | 'empty_response'
  message: string
}

export type MtpImproveResult = MtpImproveSuccess | MtpImproveFailure

function buildPrompt(row: MTPItem, roleName?: string) {
  return [
    'Eres un especialista en recursos humanos para restaurantes y operaciones.',
    'Mejora una funcion de job description usando la Matriz de Transformacion de Puestos.',
    'Reglas:',
    '- Responde solo con una funcion final en una sola oracion.',
    '- Debe ser clara, accionable y evaluable.',
    '- Mantén el sentido del indicador/KR.',
    '- No inventes metricas si el usuario no las dio.',
    '',
    `Rol: ${roleName || 'No especificado'}`,
    `Idea cruda: ${row.rawIdea || 'No especificada'}`,
    `Verbo: ${row.actionVerb || 'No especificado'}`,
    `Tarea: ${row.task || 'No especificada'}`,
    `Estandar/Frecuencia: ${row.standard || 'No especificado'}`,
    `Indicador/KR: ${row.indicator || 'No especificado'}`,
    `Funcion actual: ${row.finalFunction || 'No generada'}`
  ].join('\n')
}

export async function improveMtpFunction(row: MTPItem, roleName?: string): Promise<MtpImproveResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return {
      success: false,
      reason: 'no_key',
      message: 'No hay una API key de IA configurada.'
    }
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MTP_MODEL || 'llama-3.1-8b-instant',
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          {
            role: 'user',
            content: buildPrompt(row, roleName)
          }
        ]
      })
    })

    if (!response.ok) {
      return {
        success: false,
        reason: 'provider_error',
        message: 'El proveedor de IA no pudo mejorar la función.'
      }
    }

    const data = await response.json()
    const improvedFunction = String(data?.choices?.[0]?.message?.content || '').trim()

    if (!improvedFunction) {
      return {
        success: false,
        reason: 'empty_response',
        message: 'El proveedor de IA no devolvió texto.'
      }
    }

    return {
      success: true,
      improvedFunction,
      provider: 'groq'
    }
  } catch (error) {
    console.error('MTP AI improvement error:', error)
    return {
      success: false,
      reason: 'provider_error',
      message: 'No se pudo conectar con el proveedor de IA.'
    }
  }
}
