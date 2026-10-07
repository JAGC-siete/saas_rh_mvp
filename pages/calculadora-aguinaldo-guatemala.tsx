import MatrixCalculatorPage from '../components/public-calculator/MatrixCalculatorPage'
import { matrixCalculator } from '../lib/public-calculator/registry'

export default function CalculadoraAguinaldoGuatemalaPage() {
  return <MatrixCalculatorPage entry={matrixCalculator('/calculadora-aguinaldo-guatemala')} />
}
