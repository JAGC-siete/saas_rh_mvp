import MatrixCalculatorPage from '../components/public-calculator/MatrixCalculatorPage'
import { matrixCalculator } from '../lib/public-calculator/registry'

export default function CalculadoraIndemnizacionElSalvadorPage() {
  return <MatrixCalculatorPage entry={matrixCalculator('/calculadora-indemnizacion-el-salvador')} />
}
