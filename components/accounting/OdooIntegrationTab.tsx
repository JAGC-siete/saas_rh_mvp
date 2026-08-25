import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Loader2 } from 'lucide-react'

type ConnectionState = {
  configured: boolean
  base_url?: string
  database_name?: string | null
  odoo_version?: '18.0' | '19.0'
  odoo_company_id?: number | null
  journal_code?: string
  odoo_login?: string | null
  enabled?: boolean
  key_expires_at?: string | null
  has_api_key?: boolean
}

type SisuAccount = { id: string; code: string; name: string }
type MappingRow = { id?: string; sisu_account_id: string; odoo_account_code: string }
type OutboxRow = {
  id: string
  kind: string
  job_key: string
  status: string
  attempts: number
  last_error: string | null
  updated_at: string
}

function authJson(res: Response) {
  return res.json().catch(() => ({ error: `HTTP ${res.status}` }))
}

export function OdooIntegrationTab({ companyId }: { companyId: string | null }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [baseUrl, setBaseUrl] = useState('')
  const [databaseName, setDatabaseName] = useState('')
  const [odooVersion, setOdooVersion] = useState<'18.0' | '19.0'>('19.0')
  const [odooCompanyId, setOdooCompanyId] = useState('')
  const [journalCode, setJournalCode] = useState('NOM')
  const [odooLogin, setOdooLogin] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [keyExpiresAt, setKeyExpiresAt] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)

  const [sisuAccounts, setSisuAccounts] = useState<SisuAccount[]>([])
  const [mapBySisu, setMapBySisu] = useState<Record<string, string>>({})
  const [odooAccounts, setOdooAccounts] = useState<Array<{ code: string; name: string }>>([])
  const [deadItems, setDeadItems] = useState<OutboxRow[]>([])

  const qs = companyId ? `company_id=${encodeURIComponent(companyId)}` : ''

  const loadAll = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const [connRes, mapRes, deadRes] = await Promise.all([
        fetch(`/api/integrations/odoo/connection?${qs}`, { credentials: 'include' }),
        fetch(`/api/integrations/odoo/account-map?${qs}`, { credentials: 'include' }),
        fetch(`/api/integrations/odoo/outbox?${qs}&status=dead`, { credentials: 'include' }),
      ])
      const conn = (await authJson(connRes)) as ConnectionState & { error?: string }
      const mapData = await authJson(mapRes)
      const deadData = await authJson(deadRes)

      if (!connRes.ok) throw new Error(conn.error || 'Error leyendo conexión')
      if (conn.configured) {
        setBaseUrl(conn.base_url || '')
        setDatabaseName(conn.database_name || '')
        setOdooVersion(conn.odoo_version === '18.0' ? '18.0' : '19.0')
        setOdooCompanyId(conn.odoo_company_id != null ? String(conn.odoo_company_id) : '')
        setJournalCode(conn.journal_code || 'NOM')
        setOdooLogin(conn.odoo_login || '')
        setEnabled(Boolean(conn.enabled))
        setKeyExpiresAt(conn.key_expires_at ? conn.key_expires_at.slice(0, 10) : '')
        setHasApiKey(Boolean(conn.has_api_key))
      }

      if (mapRes.ok) {
        setSisuAccounts(mapData.sisu_accounts ?? [])
        const next: Record<string, string> = {}
        for (const row of (mapData.mappings ?? []) as MappingRow[]) {
          next[row.sisu_account_id] = row.odoo_account_code
        }
        setMapBySisu(next)
      }
      if (deadRes.ok) {
        setDeadItems(deadData.items ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando Odoo')
    } finally {
      setLoading(false)
    }
  }, [companyId, qs])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const saveConnection = async () => {
    if (!companyId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/odoo/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          company_id: companyId,
          base_url: baseUrl,
          database_name: databaseName || null,
          odoo_version: odooVersion,
          odoo_company_id: odooCompanyId ? Number(odooCompanyId) : null,
          journal_code: journalCode,
          odoo_login: odooLogin || null,
          api_key: apiKey || undefined,
          enabled,
          key_expires_at: keyExpiresAt ? new Date(`${keyExpiresAt}T00:00:00Z`).toISOString() : undefined,
        }),
      })
      const data = await authJson(res)
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar')
      setApiKey('')
      setHasApiKey(true)
      setMessage('Conexión guardada')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!companyId) return
    setTesting(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/odoo/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ company_id: companyId }),
      })
      const data = await authJson(res)
      if (!res.ok) throw new Error(data.error || 'Prueba fallida')
      setMessage(`Conexión OK (${data.transport})`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prueba fallida')
    } finally {
      setTesting(false)
    }
  }

  const pullAccounts = async () => {
    if (!companyId) return
    setPulling(true)
    setError(null)
    try {
      const res = await fetch(`/api/integrations/odoo/account-map?${qs}&pull=1`, {
        credentials: 'include',
      })
      const data = await authJson(res)
      if (!res.ok) throw new Error(data.error || 'No se pudieron leer cuentas Odoo')
      setOdooAccounts(data.odoo_accounts ?? [])
      setMessage(`Cuentas Odoo: ${(data.odoo_accounts ?? []).length}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error pull cuentas')
    } finally {
      setPulling(false)
    }
  }

  const saveMap = async () => {
    if (!companyId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const mappings = Object.entries(mapBySisu).map(([sisu_account_id, odoo_account_code]) => ({
        sisu_account_id,
        odoo_account_code,
      }))
      const res = await fetch('/api/integrations/odoo/account-map', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ company_id: companyId, mappings }),
      })
      const data = await authJson(res)
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el mapa')
      setMessage('Mapa de cuentas guardado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error mapa')
    } finally {
      setSaving(false)
    }
  }

  const replay = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/integrations/odoo/outbox/${id}/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ company_id: companyId }),
      })
      const data = await authJson(res)
      if (!res.ok) throw new Error(data.error || 'Replay falló')
      setMessage(`Reintento: ${data.status}`)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Replay falló')
    }
  }

  if (!companyId) {
    return <p className="text-gray-400">Seleccione una empresa.</p>
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400/80" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300">{error}</div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-300">
          {message}
        </div>
      )}

      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Conexión Odoo</CardTitle>
          <CardDescription className="text-gray-300">
            18.0 XML-RPC o 19.0 JSON-2. La API key se cifra en SISU y vence a los 3 meses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-300">
              URL
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://odoo.example.com" />
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              Versión
              <select
                value={odooVersion}
                onChange={(e) => setOdooVersion(e.target.value as '18.0' | '19.0')}
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="19.0">19.0 JSON-2</option>
                <option value="18.0">18.0 XML-RPC</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              Base de datos
              <Input value={databaseName} onChange={(e) => setDatabaseName(e.target.value)} />
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              Login XML-RPC (18)
              <Input value={odooLogin} onChange={(e) => setOdooLogin(e.target.value)} autoComplete="off" />
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              res.company id
              <Input value={odooCompanyId} onChange={(e) => setOdooCompanyId(e.target.value)} />
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              Diario (code)
              <Input value={journalCode} onChange={(e) => setJournalCode(e.target.value)} />
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              API key {hasApiKey ? '(guardada)' : ''}
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasApiKey ? 'Dejar vacío para conservar' : ''}
                autoComplete="new-password"
              />
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              Vence
              <Input type="date" value={keyExpiresAt} onChange={(e) => setKeyExpiresAt(e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Habilitada
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void saveConnection()} disabled={saving} className="bg-brand-600 hover:bg-brand-500 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
            <Button variant="outline" onClick={() => void testConnection()} disabled={testing} className="border-white/20 text-white">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Probar conexión'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Mapa de cuentas</CardTitle>
          <CardDescription className="text-gray-300">
            SISU NIIF → código Odoo. No se asume el mismo code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void pullAccounts()} disabled={pulling} className="border-white/20 text-white">
              {pulling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Leer cuentas Odoo'}
            </Button>
            <Button onClick={() => void saveMap()} disabled={saving} className="bg-brand-600 hover:bg-brand-500 text-white">
              Guardar mapa
            </Button>
          </div>
          {odooAccounts.length > 0 && (
            <p className="text-xs text-gray-400">
              Odoo: {odooAccounts.slice(0, 12).map((a) => a.code).join(', ')}
              {odooAccounts.length > 12 ? '…' : ''}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-200">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2 pr-4">SISU</th>
                  <th className="py-2">Código Odoo</th>
                </tr>
              </thead>
              <tbody>
                {sisuAccounts.map((acc) => (
                  <tr key={acc.id} className="border-t border-white/10">
                    <td className="py-2 pr-4">
                      {acc.code} {acc.name}
                    </td>
                    <td className="py-2">
                      <Input
                        value={mapBySisu[acc.id] ?? ''}
                        onChange={(e) =>
                          setMapBySisu((prev) => ({ ...prev, [acc.id]: e.target.value }))
                        }
                        list="odoo-account-codes"
                        className="h-9"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <datalist id="odoo-account-codes">
            {odooAccounts.map((a) => (
              <option key={a.code} value={a.code}>
                {a.name}
              </option>
            ))}
          </datalist>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-md bg-white/10 border border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Cola muerta (DLQ)</CardTitle>
          <CardDescription className="text-gray-300">
            Jobs que no se pudieron enviar. El detalle no incluye secretos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deadItems.length === 0 ? (
            <p className="text-gray-400">Sin jobs en dead.</p>
          ) : (
            <div className="space-y-3">
              {deadItems.map((item) => (
                <div key={item.id} className="rounded-md border border-white/10 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white">
                      {item.kind} · {item.job_key}
                    </span>
                    <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={() => void replay(item.id)}>
                      Reintentar
                    </Button>
                  </div>
                  <p className="mt-1 text-red-300">{item.last_error || 'sin detalle'}</p>
                  <p className="text-xs text-gray-500">intentos {item.attempts}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
