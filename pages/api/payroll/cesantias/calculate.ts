import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { cesantiasRequestSchema } from '../../../../lib/payroll/cesantias-schema'
import { calcularLiquidacionHonduras } from '../../../../lib/payroll/cesantias'
import { logTenantAdminAction } from '../../../../lib/security/audit-logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user, companyId, role } = await requireCompanyAccess(req, res)

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para calcular cesantías'
      })
    }

    if (!companyId && role !== 'super_admin') {
      return res.status(400).json({
        error: 'Perfil de usuario incompleto',
        message: 'No se pudo obtener la información de la empresa'
      })
    }

    const parseResult = cesantiasRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      const formatted = parseResult.error.format()
      return res.status(400).json({
        error: 'Parámetros inválidos',
        validation: formatted
      })
    }

    const input = parseResult.data
    const result = calcularLiquidacionHonduras(input)

    try {
      if (companyId) {
        await logTenantAdminAction(
          user.id,
          companyId,
          'calculate_cesantias',
          'cesantias',
          input.empleadoId || undefined,
          {
            motivoSalida: input.parametrosCalculo.motivoSalida,
            preavisoGozado: input.parametrosCalculo.preavisoGozado,
            fechaIngreso: input.datosManuales.fechaIngreso,
            fechaEgreso: input.datosManuales.fechaEgreso
          }
        )
      }
    } catch (error) {
      console.warn('Failed to log cesantias calculation audit event:', error)
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error en cálculo de cesantías:', error)
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }
}

