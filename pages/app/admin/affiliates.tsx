import { useState, useEffect } from 'react'
import SuperAdminLayout from '../../../components/SuperAdminLayout'
import SuperAdminGuard from '../../../components/SuperAdminGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'

interface Affiliate {
  id: string
  user_id: string
  referral_code: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user_email: string
  user_name: string
}

export default function ManageAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAffiliates()
  }, [])

  const fetchAffiliates = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/affiliates')
      if (res.ok) {
        const data = await res.json()
        setAffiliates(data.affiliates)
      } else {
        setError('No se pudo cargar la lista de afiliados.')
      }
    } catch {
      setError('Ocurrió un error de red.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (affiliateId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        setAffiliates(prev =>
          prev.map(aff => (aff.id === affiliateId ? { ...aff, status } : aff))
        )
      } else {
        alert('No se pudo actualizar el estado del afiliado.')
      }
    } catch {
      alert('Ocurrió un error de red.')
    }
  }

  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestionar Afiliados</CardTitle>
              <CardDescription>Aprobar o rechazar solicitudes de afiliados.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <p>Cargando...</p>}
              {error && <p className="text-red-500">{error}</p>}
              {!loading && !error && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Código de Referido</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha de Registro</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-800">
                      {affiliates.map(aff => (
                        <tr key={aff.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{aff.user_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{aff.user_email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{aff.referral_code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(aff.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={
                              aff.status === 'approved' ? 'default' :
                              aff.status === 'rejected' ? 'destructive' :
                              'outline'
                            }>
                              {aff.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {aff.status === 'pending' && (
                              <div className="flex items-center space-x-2">
                                <Button size="sm" onClick={() => handleStatusChange(aff.id, 'approved')}>
                                  Aprobar
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleStatusChange(aff.id, 'rejected')}>
                                  Rechazar
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
