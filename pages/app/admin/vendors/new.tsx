import type { GetServerSideProps } from 'next'
import { mercadoAdminNewPath } from '../../../../lib/mercado/paths'

/** Legacy: unificado en SuperAdmin /app/admin/mercado-fichas/nueva */
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: mercadoAdminNewPath(), permanent: false },
})

export default function LegacyVendorsNewRedirect() {
  return null
}
