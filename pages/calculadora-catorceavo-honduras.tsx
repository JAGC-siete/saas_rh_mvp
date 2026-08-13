import PublicBenefitCalculator from '../components/public-calculator/PublicBenefitCalculator'
import { PUBLIC_BENEFIT_CONFIGS } from '../lib/public-calculator/benefit-config'

export default function CalculadoraCatorceavoHondurasPage() {
  return <PublicBenefitCalculator config={PUBLIC_BENEFIT_CONFIGS['14AVO']} />
}
