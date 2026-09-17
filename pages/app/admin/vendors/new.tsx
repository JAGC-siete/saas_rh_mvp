import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import AppRoleGate from '../../../../components/AppRoleGate'
import AppMeshShell from '../../../../components/landing/AppMeshShell'
import VendorForm from '../../../../components/mercado/VendorForm'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { MERCADO_ADMIN_ROLES, mercadoAdminListPath } from '../../../../lib/mercado/paths'

export default function MercadoVendorNewPage() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <AppRoleGate allowRoles={MERCADO_ADMIN_ROLES}>
        <Head>
          <title>Nuevo vendedor | Mercado Municipal</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <AppMeshShell>
          <div className="relative z-10 mx-auto w-full max-w-2xl space-y-6 p-6">
            <Link href={mercadoAdminListPath()} className="text-sm text-amber-200 underline">
              Volver al listado
            </Link>
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Alta de vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                <VendorForm
                  submitLabel="Validar ficha"
                  onValid={(payload) => {
                    void router.push({
                      pathname: mercadoAdminListPath(),
                      query: { created: payload.slug },
                    })
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </AppMeshShell>
      </AppRoleGate>
    </ProtectedRoute>
  )
}
