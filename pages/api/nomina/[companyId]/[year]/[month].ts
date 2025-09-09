// Endpoint unificado de nómina
// GET /api/nomina/:companyId/:year/:month

import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { getUnifiedPayroll, generateETag, PayrollParams } from '../../../../../lib/services/payroll/unified'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // Validar parámetros de URL
    const { companyId, year, month } = req.query
    
    if (!companyId || !year || !month) {
      return res.status(400).json({ error: 'Parámetros requeridos: companyId, year, month' })
    }

    const yearNum = parseInt(year as string)
    const monthNum = parseInt(month as string)
    
    if (isNaN(yearNum) || isNaN(monthNum)) {
      return res.status(400).json({ error: 'Año y mes deben ser números válidos' })
    }

    // Validar UUID de companyId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(companyId as string)) {
      return res.status(400).json({ error: 'companyId debe ser un UUID válido' })
    }

    // Autenticación Supabase
    const supabase = createPagesServerClient({ req, res })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    // Verificar que el usuario pertenece a la empresa
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.company_id !== companyId) {
      return res.status(403).json({ error: 'No autorizado para esta empresa' })
    }

    // Parsear query parameters
    const quincena = (req.query.quincena as string) || 'Ambas'
    const includeMissingEmployees = req.query.includeMissingEmployees !== 'false'
    
    if (!['Q1', 'Q2', 'Ambas'].includes(quincena)) {
      return res.status(400).json({ error: 'quincena debe ser Q1, Q2 o Ambas' })
    }

    // Parámetros para el servicio
    const params: PayrollParams = {
      companyId: companyId as string,
      year: yearNum,
      month: monthNum,
      quincena: quincena as 'Q1' | 'Q2' | 'Ambas',
      includeMissingEmployees
    }

    // Verificar ETag para cache
    const etag = generateETag(companyId as string, yearNum, monthNum, quincena)
    const ifNoneMatch = req.headers['if-none-match']
    
    if (ifNoneMatch === etag) {
      return res.status(304).end()
    }

    // Obtener datos de nómina
    const payrollData = await getUnifiedPayroll(params)

    // Headers de cache
    res.setHeader('ETag', etag)
    res.setHeader('Last-Modified', new Date().toUTCString())
    res.setHeader('Cache-Control', 'public, max-age=300') // 5 minutos

    return res.status(200).json(payrollData)

  } catch (error: any) {
    console.error('Error en endpoint de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    })
  }
}
