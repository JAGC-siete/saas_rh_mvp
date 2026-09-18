import type { GetServerSideProps } from 'next'
import { mercadoAdminEditPath, mercadoAdminListPath } from '../../../../lib/mercado/paths'

/** Legacy: unificado en SuperAdmin /app/admin/mercado-fichas/[id] */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const id = typeof ctx.params?.id === 'string' ? ctx.params.id : ''
  return {
    redirect: {
      destination: id ? mercadoAdminEditPath(id) : mercadoAdminListPath(),
      permanent: false,
    },
  }
}

export default function LegacyVendorsEditRedirect() {
  return null
}
