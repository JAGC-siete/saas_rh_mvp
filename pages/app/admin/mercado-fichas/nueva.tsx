import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import SuperAdminGuard from '../../../../components/SuperAdminGuard'
import SuperAdminLayout from '../../../../components/SuperAdminLayout'
import VendorForm, { type VendorFormValues } from '../../../../components/mercado/VendorForm'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { getBrowserAuthHeaders } from '../../../../lib/auth/browser-auth-headers'
import {
  MERCADO_APPLICATIONS_ADMIN_API_PATH,
  MERCADO_VENDORS_API_PATH,
  mercadoAdminListPath,
} from '../../../../lib/mercado/paths'
import type { CreateVendorPayload } from '../../../../lib/mercado/schema'

export default function MercadoFichaNuevaPage() {
  const router = useRouter()
  const fromId = typeof router.query.from === 'string' ? router.query.from : ''
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<Partial<VendorFormValues> | undefined>()
  const [applicationId, setApplicationId] = useState<string | null>(null)

  useEffect(() => {
    if (!fromId) return
    void (async () => {
      try {
        const headers = await getBrowserAuthHeaders()
        const res = await fetch(MERCADO_APPLICATIONS_ADMIN_API_PATH, { headers })
        const body = (await res.json().catch(() => ({}))) as {
          applications?: Array<{
            id: string
            business_name: string
            merchant_name: string
            stall_number: string
            vendor_id?: string | null
          }>
        }
        const app = body.applications?.find((row) => row.id === fromId)
        if (!app) {
          setError('Solicitud no encontrada')
          return
        }
        if (app.vendor_id) {
          setError('Esa solicitud ya tiene ficha')
          return
        }
        setApplicationId(app.id)
        setInitial({
          name: app.business_name,
          stallLocation: app.stall_number,
          description: `${app.business_name} de ${app.merchant_name} en el Mercado Municipal San Pablo. Pedí por WhatsApp y recogé en el local sin hacer fila.`,
          products: ['Consultar por WhatsApp', '', '', '', ''],
          category: 'otros',
        })
      } catch {
        setError('No se pudo cargar la solicitud')
      }
    })()
  }, [fromId])

  async function onValid(payload: CreateVendorPayload) {
    setBusy(true)
    setError(null)
    try {
      const headers = await getBrowserAuthHeaders()
      const body = applicationId
        ? {
            applicationId,
            name: payload.name,
            slug: payload.slug,
            category: payload.category,
            description: payload.description,
            whatsapp: payload.whatsapp,
            stallLocation: payload.stallLocation,
            hoursNote: payload.hoursNote,
            products: payload.products,
            paymentMethods: payload.paymentMethods,
            logoUrl: payload.logoUrl,
            gallery: payload.gallery,
            status: payload.status,
            featured: payload.featured,
          }
        : payload

      const res = await fetch(MERCADO_VENDORS_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; vendor?: { id: string } }
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar')
      void router.push(mercadoAdminListPath())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SuperAdminGuard redirectPath="/app/admin/mercado-fichas/nueva">
      <SuperAdminLayout>
        <Head>
          <title>Nueva ficha mercado | Super Admin</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
          <Link href={mercadoAdminListPath()} className="text-sm text-amber-200 underline">
            Volver al listado
          </Link>
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                {applicationId ? 'Crear ficha desde solicitud' : 'Alta de ficha'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
              <VendorForm
                key={applicationId ?? 'blank'}
                initialValues={initial}
                submitLabel={applicationId ? 'Publicar ficha y aprobar solicitud' : 'Crear ficha'}
                busy={busy}
                onValid={onValid}
              />
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  )
}
