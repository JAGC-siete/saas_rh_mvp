import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'

export default function CompanyDetailPage() {
  const router = useRouter()
  const { id, edit } = router.query
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [company, setCompany] = useState<any>(null)

  const isEdit = useMemo(() => edit === '1', [edit])

  useEffect(() => {
    if (!id || typeof id !== 'string') return
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/companies/${id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Error cargando empresa')
        const data = await res.json()
        setCompany(data.company)
      } catch (err: any) {
        setError(err.message || 'Error cargando empresa')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const [form, setForm] = useState({ name: '', subdomain: '', plan_type: '', is_active: true })

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        subdomain: company.subdomain || '',
        plan_type: company.plan_type || 'basic',
        is_active: !!company.is_active
      })
    }
  }, [company])

  const save = async () => {
    if (!id || typeof id !== 'string') return
    try {
      setError(null)
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Error actualizando')
      setCompany(data.company)
    } catch (err: any) {
      setError(err.message || 'Error actualizando')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Empresa - Admin</title>
      </Head>
      <DashboardLayout>
        <div className="space-y-6">
          <Button variant="outline" onClick={() => router.back()}>← Volver</Button>
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 text-red-800 text-sm">{error}</CardContent>
            </Card>
          )}
          {company && (
            <Card>
              <CardHeader>
                <CardTitle>Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                {isEdit ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm">Nombre</label>
                      <input className="w-full border rounded px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm">Subdominio</label>
                      <input className="w-full border rounded px-3 py-2" value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm">Plan</label>
                      <select className="w-full border rounded px-3 py-2" value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })}>
                        <option value="basic">basic</option>
                        <option value="premium">premium</option>
                        <option value="enterprise">enterprise</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                      <span className="text-sm">Activa</span>
                    </div>
                    <div className="md:col-span-2">
                      <Button onClick={save}>Guardar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700 space-y-1">
                    <div><b>Nombre:</b> {company.name}</div>
                    <div><b>Subdominio:</b> {company.subdomain || '—'}</div>
                    <div><b>Plan:</b> {company.plan_type}</div>
                    <div><b>Estado:</b> {company.is_active ? 'Activa' : 'Inactiva'}</div>
                    <div><b>Empleados:</b> {company.employee_count ?? 0}</div>
                    <div><b>Usuarios:</b> {company.user_count ?? 0}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </>
  )
}


