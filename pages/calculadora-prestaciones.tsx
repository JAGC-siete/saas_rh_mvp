import PublicPrestacionesCalculator from '../components/public-calculator/PublicPrestacionesCalculator'
import { PUBLIC_PRESTACIONES_CONFIG } from '../lib/public-calculator/prestaciones-config'

export default function CalculadoraPrestacionesPage() {
  return <PublicPrestacionesCalculator config={PUBLIC_PRESTACIONES_CONFIG} />
}
