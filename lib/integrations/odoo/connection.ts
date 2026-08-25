import { createAdminClient } from '../../supabase/server'
import { decryptOdooSecret } from './crypto'
import type { DecryptedOdooConnection, OdooVersion } from './types'

type ConnectionRow = {
  id: string
  company_id: string
  base_url: string
  database_name: string | null
  odoo_version: OdooVersion
  odoo_company_id: number | null
  journal_code: string
  odoo_login: string | null
  api_key_ciphertext: string
  enabled: boolean
  key_expires_at: string | null
}

export async function loadEnabledOdooConnection(
  companyId: string
): Promise<DecryptedOdooConnection | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('odoo_connections')
    .select(
      'id, company_id, base_url, database_name, odoo_version, odoo_company_id, journal_code, odoo_login, api_key_ciphertext, enabled, key_expires_at'
    )
    .eq('company_id', companyId)
    .eq('enabled', true)
    .maybeSingle()

  if (error || !data) return null
  return decryptConnectionRow(data as ConnectionRow)
}

export async function loadOdooConnectionRow(companyId: string): Promise<ConnectionRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('odoo_connections')
    .select(
      'id, company_id, base_url, database_name, odoo_version, odoo_company_id, journal_code, odoo_login, api_key_ciphertext, enabled, key_expires_at'
    )
    .eq('company_id', companyId)
    .maybeSingle()

  if (error || !data) return null
  return data as ConnectionRow
}

export function decryptConnectionRow(data: ConnectionRow): DecryptedOdooConnection {
  return {
    id: data.id,
    companyId: data.company_id,
    baseUrl: data.base_url,
    databaseName: data.database_name,
    odooVersion: data.odoo_version,
    odooCompanyId: data.odoo_company_id,
    journalCode: data.journal_code,
    odooLogin: data.odoo_login,
    apiKey: decryptOdooSecret(data.api_key_ciphertext),
    enabled: data.enabled,
    keyExpiresAt: data.key_expires_at ?? null,
  }
}

export function publicConnectionView(row: {
  base_url: string
  database_name: string | null
  odoo_version: OdooVersion
  odoo_company_id: number | null
  journal_code: string
  odoo_login: string | null
  enabled: boolean
  key_expires_at: string | null
  api_key_ciphertext?: string | null
}) {
  return {
    configured: true,
    base_url: row.base_url,
    database_name: row.database_name,
    odoo_version: row.odoo_version,
    odoo_company_id: row.odoo_company_id,
    journal_code: row.journal_code,
    odoo_login: row.odoo_login,
    enabled: row.enabled,
    key_expires_at: row.key_expires_at,
    has_api_key: Boolean(row.api_key_ciphertext),
  }
}

export function isOdooKeyExpired(keyExpiresAt: string | null | undefined): boolean {
  if (!keyExpiresAt) return false
  return new Date(keyExpiresAt).getTime() < Date.now()
}
