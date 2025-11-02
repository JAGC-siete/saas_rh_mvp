import { Card } from '../ui/card'
import { ReportType } from './ReportBuilder'
import { 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  FileText 
} from 'lucide-react'

interface ReportKPIsProps {
  summary?: Record<string, any>
  reportType: ReportType
  loading?: boolean
}

export default function ReportKPIs({ summary, reportType, loading }: ReportKPIsProps) {
  if (!summary || loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="glass" className="border border-white/10">
            <div className="p-4 flex items-center gap-3">
              <div className="animate-pulse h-12 w-12 rounded-lg bg-white/10"></div>
              <div className="flex-1 space-y-2">
                <div className="animate-pulse h-4 bg-white/10 rounded w-20"></div>
                <div className="animate-pulse h-6 bg-white/10 rounded w-16"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const getKPIConfig = () => {
    switch (reportType) {
      case 'attendance':
        return {
          icon: Clock,
          color: 'text-blue-400',
          bg: 'bg-blue-500/20'
        }
      case 'payroll':
        return {
          icon: DollarSign,
          color: 'text-green-400',
          bg: 'bg-green-500/20'
        }
      case 'employees':
        return {
          icon: Users,
          color: 'text-purple-400',
          bg: 'bg-purple-500/20'
        }
      case 'work_certificate':
        return {
          icon: FileText,
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/20'
        }
      case 'severance':
        return {
          icon: TrendingUp,
          color: 'text-orange-400',
          bg: 'bg-orange-500/20'
        }
      default:
        return {
          icon: FileText,
          color: 'text-gray-400',
          bg: 'bg-gray-500/20'
        }
    }
  }

  const config = getKPIConfig()
  const Icon = config.icon

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Object.entries(summary).map(([key, value], index) => (
        <Card 
          key={key} 
          variant="glass" 
          className={`${config.bg} border border-white/10 hover:border-white/20 transition-colors`}
        >
          <div className="p-4 flex items-center gap-3">
            <div className={`${config.bg} rounded-lg p-2 border border-white/10`}>
              <Icon className={`h-6 w-6 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide truncate">
                {formatSummaryKey(key)}
              </p>
              <p className="text-2xl font-bold text-white truncate">
                {value}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function formatSummaryKey(key: string): string {
  const keyMap: Record<string, string> = {
    totalRegistros: 'Total Registros',
    presentes: 'Presentes',
    ausentes: 'Ausentes',
    tardes: 'Tardes',
    asistenciaPct: 'Asistencia %',
    puntualidadPct: 'Puntualidad %',
    totalDevengado: 'Devengado',
    totalDeducciones: 'Deducciones',
    totalNeto: 'Neto',
    empleados: 'Empleados',
    pagosPendientes: 'Pendientes',
    totalEmpleados: 'Total Empleados',
    activos: 'Activos',
    inactivos: 'Inactivos',
    nuevosEsteMes: 'Nuevos',
    totalConstancias: 'Constancias',
    generadasEsteMes: 'Este Mes',
    pendientes: 'Pendientes',
    totalLiquidaciones: 'Liquidaciones',
    montoTotal: 'Monto Total',
    periodoCalculado: 'Período',
    liquidacion: 'Liquidación'
  }
  
  return keyMap[key] || key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

