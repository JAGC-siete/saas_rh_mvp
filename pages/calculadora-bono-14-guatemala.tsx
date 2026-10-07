import MatrixCalculatorPage from '../components/public-calculator/MatrixCalculatorPage'
import { matrixCalculator } from '../lib/public-calculator/registry'

export default function CalculadoraBono14GuatemalaPage() {
  return <MatrixCalculatorPage entry={matrixCalculator('/calculadora-bono-14-guatemala')} />
}
