import type { ReportType, ReportConfig, BrandingConfig } from './report-config-schema'
import { getStandardColumns } from './standard-columns'
import { parseReportsMetadata } from '../company-branding/storage'

export interface ResolvedColumn {
  id: string
  label: string
  sourceField: string
  source: 'standard' | 'payroll_config'
}

export interface ResolvedReportConfig {
  columns: ResolvedColumn[]
  branding: BrandingConfig
}

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#0b4fa1'
}

/**
 * Resolve report configuration for a company and report type.
 * Merges DB config with standard columns, adds custom payroll fields when enabled.
 */
export async function resolveReportConfig(
  companyId: string,
  reportType: ReportType,
  supabase: any,
  configId?: string
): Promise<ResolvedReportConfig> {
  let dbConfig: ReportConfig | null = null

  if (configId) {
    const { data } = await supabase
      .from('report_configurations')
      .select('config')
      .eq('id', configId)
      .eq('company_id', companyId)
      .single()
    if (data) dbConfig = data.config as ReportConfig
  }

  if (!dbConfig) {
    const { data } = await supabase
      .from('report_configurations')
      .select('config')
      .eq('company_id', companyId)
      .eq('report_type', reportType)
      .single()
    if (data) dbConfig = data.config as ReportConfig
  }

  const standardColumns = getStandardColumns(reportType)
  const configColumns = dbConfig?.columns ?? []
  const includeCustomPayrollFields = dbConfig?.includeCustomPayrollFields ?? false

  let companyLogoBranding: Partial<BrandingConfig> = {}
  try {
    const { data: metaRow } = await supabase
      .from('company_metadata')
      .select('reports_metadata')
      .eq('company_id', companyId)
      .maybeSingle()
    const companyReports = parseReportsMetadata(metaRow?.reports_metadata)
    if (companyReports.branding?.logo_storage_path) {
      companyLogoBranding = {
        logoStoragePath: companyReports.branding.logo_storage_path,
      }
    }
  } catch {
    // Non-fatal: reports work without logo
  }

  const branding = { ...DEFAULT_BRANDING, ...companyLogoBranding, ...dbConfig?.branding }

  const columnMap = new Map<string, { label: string; visible: boolean; order: number; source?: 'standard' | 'payroll_config'; sourceField?: string }>()
  for (const sc of standardColumns) {
    const override = configColumns.find((c) => c.id === sc.id)
    columnMap.set(sc.id, {
      label: override?.label ?? sc.label,
      visible: override?.visible ?? true,
      order: override?.order ?? sc.order,
      source: 'standard',
      sourceField: sc.sourceField
    })
  }

  if ((reportType === 'payroll' || reportType === 'voucher') && includeCustomPayrollFields) {
    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('custom_fields')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    const customFields = (payrollConfig?.custom_fields as Record<string, { label?: string }>) ?? {}
    let customOrder = 100
    for (const [key, def] of Object.entries(customFields)) {
      const colId = `custom_${key}`
      const existingOverride = configColumns.find((c) => c.id === colId)
      const label = typeof def === 'string' ? def : def?.label ?? key
      columnMap.set(colId, {
        label: existingOverride?.label ?? label,
        visible: existingOverride?.visible ?? true,
        order: existingOverride?.order ?? customOrder++,
        source: 'payroll_config',
        sourceField: key
      })
    }
  }

  for (const cc of configColumns) {
    if (!columnMap.has(cc.id) && cc.source === 'payroll_config') {
      columnMap.set(cc.id, {
        label: cc.label,
        visible: cc.visible ?? true,
        order: cc.order,
        source: 'payroll_config',
        sourceField: cc.sourceField ?? cc.id.replace(/^custom_/, '')
      })
    }
  }

  const resolved = Array.from(columnMap.entries())
    .filter(([, v]) => v.visible)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id, v]) => ({
      id,
      label: v.label,
      sourceField: v.sourceField ?? id,
      source: (v.source ?? 'standard') as 'standard' | 'payroll_config'
    }))

  if (resolved.length === 0 && standardColumns.length > 0) {
    return {
      columns: standardColumns.map((sc) => ({
        id: sc.id,
        label: sc.label,
        sourceField: sc.sourceField,
        source: 'standard' as const
      })),
      branding
    }
  }

  return { columns: resolved, branding }
}
