import MatrixCalculatorPage from '../components/public-calculator/MatrixCalculatorPage'
import { matrixCalculator } from '../lib/public-calculator/registry'

export default function CalculadoraIndemnizacionGuatemalaPage() {
  return <MatrixCalculatorPage entry={matrixCalculator('/calculadora-indemnizacion-guatemala')} />
}
