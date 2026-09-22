import type { GetServerSideProps } from 'next'
import DemoLocalLanding from '../../components/landing/DemoLocalLanding'
import { isWebycitasFormRubro, type WebycitasFormRubro } from '../../lib/marketing/demo-local'

interface Props {
  initialRubro: WebycitasFormRubro
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const raw = ctx.query.rubro
  const initialRubro = typeof raw === 'string' && isWebycitasFormRubro(raw) ? raw : 'barberia'
  return { props: { initialRubro } }
}

export default function WebYCitasPage({ initialRubro }: Props) {
  return <DemoLocalLanding initialRubro={initialRubro} />
}
