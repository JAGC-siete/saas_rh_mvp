import PublicBenefitCalculator from '../components/public-calculator/PublicBenefitCalculator'
import { PUBLIC_BENEFIT_CONFIGS } from '../lib/public-calculator/benefit-config'

export default function CalculadoraAguinaldoHondurasPage() {
  return <PublicBenefitCalculator config={PUBLIC_BENEFIT_CONFIGS['13AVO']} />
}
