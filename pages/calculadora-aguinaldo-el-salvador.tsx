import MatrixCalculatorPage from '../components/public-calculator/MatrixCalculatorPage'
import { matrixCalculator } from '../lib/public-calculator/registry'

export default function CalculadoraAguinaldoElSalvadorPage() {
  return <MatrixCalculatorPage entry={matrixCalculator('/calculadora-aguinaldo-el-salvador')} />
}
