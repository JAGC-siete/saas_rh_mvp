import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { reportConfigSchema, reportTypeEnum } from '../../../../lib/reports/report-config-schema'
import { getStandardColumns } from '../../../../lib/reports/standard-columns'
import type { ReportType } from '../../../../lib/reports/report-config-schema'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : undefined

  if (!id) {
    return res.status(400).json({ error: 'Company ID is required' })
  }

  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)

    const canAccess =
      role === 'super_admin' || (companyId && companyId === id)
    if (!canAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a la configuración de reportes de esta empresa'
      })
    }

    const targetCompanyId = role === 'super_admin' ? id : companyId!

    switch (req.method) {
      case 'GET':
        return await getReportConfigs(supabase, targetCompanyId, req, res)
      case 'PUT':
        return await putReportConfig(supabase, targetCompanyId, req, res)
      default:
        res.setHeader('Allow', ['GET', 'PUT'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'COMPANY_ACCESS_REQUIRED') {
      return
    }
    console.error('Error in report-configs API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getReportConfigs(
  supabase: any,
  companyId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const reportType = typeof req.query.report_type === 'string' ? req.query.report_type : undefined

  if (reportType) {
    const parsed = reportTypeEnum.safeParse(reportType)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid report_type', allowed: ['attendance', 'payroll', 'employees', 'work_certificate', 'severance'] })
    }

    const { data: config, error } = await supabase
      .from('report_configurations')
      .select('id, report_type, config, created_at, updated_at')
      .eq('company_id', companyId)
      .eq('report_type', reportType)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching report config:', error)
      return res.status(500).json({ error: 'Error fetching configuration' })
    }

    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('custom_fields')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    const customFields = payrollConfig?.custom_fields as Record<string, { label?: string }> | undefined
    const availableCustomFields = customFields
      ? Object.entries(customFields).map(([key, def]) => ({
          id: `custom_${key}`,
          label: typeof def === 'string' ? def : def?.label ?? key,
          sourceField: key
        }))
      : []

    const standardColumns = getStandardColumns(reportType as ReportType)

    return res.status(200).json({
      config: config ?? null,
      standardColumns,
      availableCustomFields: reportType === 'payroll' ? availableCustomFields : []
    })
  }

  const { data: configs, error } = await supabase
    .from('report_configurations')
    .select('id, report_type, config, created_at, updated_at')
    .eq('company_id', companyId)
    .order('report_type')

  if (error) {
    console.error('Error fetching report configs:', error)
    return res.status(500).json({ error: 'Error fetching configurations' })
  }

  return res.status(200).json({ configs: configs ?? [] })
}

async function putReportConfig(
  supabase: any,
  companyId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const body = req.body
  const reportType = body?.report_type
  const config = body?.config

  if (!reportType) {
    return res.status(400).json({ error: 'report_type is required' })
  }

  const parsedType = reportTypeEnum.safeParse(reportType)
  if (!parsedType.success) {
    return res.status(400).json({ error: 'Invalid report_type' })
  }

  const parsedConfig = reportConfigSchema.safeParse(config ?? {})
  if (!parsedConfig.success) {
    return res.status(400).json({
      error: 'Invalid config',
      details: parsedConfig.error.flatten()
    })
  }

  const { error } = await supabase
    .from('report_configurations')
    .upsert(
      {
        company_id: companyId,
        report_type: parsedType.data,
        config: parsedConfig.data,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'company_id,report_type' }
    )

  if (error) {
    console.error('Error upserting report config:', error)
    return res.status(500).json({ error: 'Error saving configuration' })
  }

  const { data: saved } = await supabase
    .from('report_configurations')
    .select('id, report_type, config, updated_at')
    .eq('company_id', companyId)
    .eq('report_type', parsedType.data)
    .single()

  return res.status(200).json({ success: true, config: saved })
}
