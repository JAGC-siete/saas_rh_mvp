import type { BenefitTipo } from '../public-calculator/benefit-config'

export function marketingSourceForBenefitCalculator(tipo: BenefitTipo): string {
  return tipo === '13AVO' ? 'calculadora-aguinaldo-hnd' : 'calculadora-catorceavo-hnd'
}

export function leadSourceForBenefitCalculator(tipo: BenefitTipo): 'aguinaldo' | 'catorceavo' {
  return tipo === '13AVO' ? 'aguinaldo' : 'catorceavo'
}
