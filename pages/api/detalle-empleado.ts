// Ruta legacy - Detalle por empleado (DEPRECATED)
// Delega al endpoint unificado

import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log de advertencia
  console.warn('⚠️ Ruta legacy /api/detalle-empleado utilizada - migrar a /api/nomina/:companyId/:year/:month')
  
  // Headers de deprecación
  res.setHeader('X-Deprecated', 'true')
  res.setHeader('X-Deprecation-Date', '2024-12-01')
  res.setHeader('X-Sunset-Date', '2025-03-01')
  
  // Redirigir al endpoint unificado
  const { companyId, year, month, ...queryParams } = req.query
  
  if (!companyId || !year || !month) {
    return res.status(400).json({ 
      error: 'Parámetros requeridos: companyId, year, month',
      migration: 'Use /api/nomina/:companyId/:year/:month'
    })
  }

  // Construir URL del endpoint unificado
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const unifiedUrl = `${baseUrl}/api/nomina/${companyId}/${year}/${month}`
  
  // Agregar query parameters (forzar detalle=true)
  const params = { ...queryParams, detalle: 'true' }
  const queryString = new URLSearchParams(params as Record<string, string>).toString()
  const finalUrl = `${unifiedUrl}?${queryString}`

  try {
    const response = await fetch(finalUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-From': '/api/detalle-empleado'
      }
    })

    // Copiar headers de respuesta
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    const data = await response.json()
    return res.status(response.status).json(data)

  } catch (error: any) {
    return res.status(500).json({
      error: 'Error delegando a endpoint unificado',
      message: error.message,
      migration: 'Use /api/nomina/:companyId/:year/:month'
    })
  }
}
