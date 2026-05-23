import PublicDeductionCalculator from '../components/public-calculator/PublicDeductionCalculator'
import { PUBLIC_CALCULATOR_CONFIGS } from '../lib/public-calculator/config'

export default function CalculadoraDeduccionesGuatemalaPage() {
  return <PublicDeductionCalculator config={PUBLIC_CALCULATOR_CONFIGS.GTM} />
}
