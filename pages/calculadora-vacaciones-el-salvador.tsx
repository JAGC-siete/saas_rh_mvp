import MatrixCalculatorPage from '../components/public-calculator/MatrixCalculatorPage'
import { matrixCalculator } from '../lib/public-calculator/registry'

export default function CalculadoraVacacionesElSalvadorPage() {
  return <MatrixCalculatorPage entry={matrixCalculator('/calculadora-vacaciones-el-salvador')} />
}
