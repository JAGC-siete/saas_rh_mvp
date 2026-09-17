/**
 * Listado admin de vendedores del mercado.
 * Shell /app: sesión vía AppAuthenticatedProviders. No SuperAdminGuard (no es panel SISU).
 */

import Head from 'next/head'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import AppRoleGate from '../../../../components/AppRoleGate'
import AppMeshShell from '../../../../components/landing/AppMeshShell'
import VendorForm from '../../../../components/mercado/VendorForm'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import {
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABEL,
  type VendorCategory,
} from '../../../../lib/mercado/categories'
import { MERCADO_ADMIN_ROLES, mercadoAdminNewPath, mercadoApplicationsAdminPath, mercadoVendorPath } from '../../../../lib/mercado/paths'
import type { CreateVendorPayload, VendorStatus } from '../../../../lib/mercado/schema'

interface AdminVendorRow extends CreateVendorPayload {
  id: string
}

function StatusBadge({ status }: { status: VendorStatus }) {
  const className =
    status === 'active'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : 'bg-white/10 text-gray-300 border-white/20'
  return <Badge className={className}>{status === 'active' ? 'Activo' : 'Inactivo'}</Badge>
}

function VendorsAdminList() {
  const [rows, setRows] = useState<AdminVendorRow[]>([])
  const [category, setCategory] = useState<VendorCategory | 'all'>('all')
  const [notice, setNotice] = useState<string | null>(null)

  const visible = useMemo(
    () => (category === 'all' ? rows : rows.filter((row) => row.category === category)),
    [rows, category]
  )

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Vendedores del mercado</h1>
          <p className="mt-1 text-sm text-gray-300">
            Alta de puestos que se publican en /mercado. Persistencia de fichas en el siguiente
            incremento. Las solicitudes públicas viven en la bandeja de inscripción.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={mercadoApplicationsAdminPath()}>
            <Button variant="outline">Solicitudes de inscripción</Button>
          </Link>
          <Link href={mercadoAdminNewPath()}>
            <Button>Nuevo vendedor</Button>
          </Link>
        </div>
      </div>

      <Card variant="glass">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">Listado</CardTitle>
          <Select value={category} onValueChange={(value) => setCategory(value as VendorCategory | 'all')}>
            <SelectTrigger className="w-48 bg-white/10 text-white">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {VENDOR_CATEGORIES.map((key) => (
                <SelectItem key={key} value={key}>
                  {VENDOR_CATEGORY_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-300">
              No hay vendedores en esta categoría. Usá el formulario de alta.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-3 py-2">Negocio</th>
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-gray-200">
                  {visible.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-3 font-medium text-white">{row.name}</td>
                      <td className="px-3 py-3">{VENDOR_CATEGORY_LABEL[row.category]}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-3">{row.whatsapp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg">Alta rápida (validación Zod)</CardTitle>
        </CardHeader>
        <CardContent>
          {notice && <p className="mb-4 text-sm text-emerald-300">{notice}</p>}
          <VendorForm
            submitLabel="Validar y agregar al listado"
            onValid={(payload) => {
              setRows((current) => [{ id: payload.slug, ...payload }, ...current])
              setNotice(`Validado: ${payload.name} → ${mercadoVendorPath(payload.slug)}`)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function MercadoVendorsAdminPage() {
  return (
    <ProtectedRoute>
      <AppRoleGate allowRoles={MERCADO_ADMIN_ROLES}>
        <Head>
          <title>Vendedores | Mercado Municipal</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <AppMeshShell>
          <VendorsAdminList />
        </AppMeshShell>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
