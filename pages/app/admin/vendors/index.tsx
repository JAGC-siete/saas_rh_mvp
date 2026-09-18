import type { GetServerSideProps } from 'next'
import { MERCADO_ADMIN_PATH } from '../../../../lib/mercado/paths'

/** Legacy: unificado en SuperAdmin /app/admin/mercado-fichas */
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: MERCADO_ADMIN_PATH, permanent: false },
})

export default function LegacyVendorsRedirect() {
  return null
}
