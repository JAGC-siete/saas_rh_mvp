import MatrixCalculatorPage from '../components/public-calculator/MatrixCalculatorPage'
import { matrixCalculator } from '../lib/public-calculator/registry'

export default function CalculadoraHorasExtraHondurasPage() {
  return <MatrixCalculatorPage entry={matrixCalculator('/calculadora-horas-extra-honduras')} />
}
