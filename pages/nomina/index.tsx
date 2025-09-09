// Página unificada de nómina - Frontend
// Combina resumen y detalle por empleado en una sola vista

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Icon } from '../../components/Icon'
import { useAuth } from '../../lib/auth'
import { toTGUDateParts } from '../../lib/timezone'
import { formatCurrency, formatCurrencyShort } from '../../lib/utils/currency'
import { PayrollDTO } from '../../lib/services/payroll/unified'

export default function NominaPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [data, setData] = useState<PayrollDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estado de filtros
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    quincena: 'Q1' as 'Q1' | 'Q2' | 'Ambas'
  })

  // Obtener companyId del usuario
  useEffect(() => {
    if (!user) return

    const getUserCompany = async () => {
      try {
        const response = await fetch('/api/user-profile')
        if (response.ok) {
          const profile = await response.json()
          setCompanyId(profile.company_id)
        }
      } catch (err) {
        console.error('Error obteniendo companyId:', err)
      }
    }

    getUserCompany()
  }, [user])

  // Cargar período actual automáticamente
  useEffect(() => {
    if (!companyId) return

    const { year, month, day } = toTGUDateParts(new Date())
    const quincena = day <= 15 ? 'Q1' : 'Q2'
    
    setFilters({ year, month, quincena })
    loadPayrollData(companyId, year, month, quincena)
  }, [companyId])

  // Función para cargar datos de nómina
  const loadPayrollData = async (companyId: string, year: number, month: number, quincena: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/nomina/${companyId}/${year}/${month}?quincena=${quincena}&detalle=true&includeMissingEmployees=true`)
      
      if (response.status === 304) {
        // No hay cambios, usar datos en cache
        return
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const payrollData: PayrollDTO = await response.json()
      setData(payrollData)
    } catch (err: any) {
      setError(err.message || 'Error cargando datos de nómina')
      console.error('Error loading payroll data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Manejar cambios de filtros
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    if (companyId) {
      loadPayrollData(companyId, newFilters.year, newFilters.month, newFilters.quincena)
    }
  }

  // Exportar PDF
  const handleExportPDF = async () => {
    if (!data || !companyId) return

    try {
      const response = await fetch(`/api/payroll/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          year: filters.year,
          month: filters.month,
          quincena: filters.quincena,
          data
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nomina_${filters.year}_${filters.month}_${filters.quincena}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Error exporting PDF:', err)
    }
  }

  // Exportar CSV
  const handleExportCSV = () => {
    if (!data) return

    const csvContent = generateCSV(data)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nomina_${filters.year}_${filters.month}_${filters.quincena}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Generar CSV
  const generateCSV = (data: PayrollDTO): string => {
    const headers = [
      'Empleado',
      'Salario Base',
      'Horas Trabajadas',
      'Horas Extras',
      'Monto Extras',
      'Salario Bruto',
      'IHSS',
      'RAP',
      'ISR',
      'Total Deducciones',
      'Salario Neto',
      'Observaciones'
    ]

    const rows = data.detalle.map(emp => [
      emp.nombre,
      emp.salario_base,
      emp.horas_trabajadas,
      emp.extras.horas,
      emp.extras.monto,
      emp.salario_base + emp.extras.monto,
      emp.deducciones.IHSS,
      emp.deducciones.RAP,
      emp.deducciones.ISR,
      emp.deducciones.IHSS + emp.deducciones.RAP + emp.deducciones.ISR,
      emp.neto,
      emp.observaciones || ''
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Nómina Unificada - Humano SISU</title>
        <meta name="description" content="Sistema unificado de nómina con resumen y detalle por empleado" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Nómina Unificada</h1>
              <p className="text-gray-200 text-lg">Resumen y detalle por empleado en una sola vista</p>
            </div>
            
            {loading && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            )}
          </div>

          {/* Filtros con Glass Effect Legible */}
          <Card className="backdrop-blur-md bg-white/10 border border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Filtros de Período</CardTitle>
              <CardDescription className="text-gray-200 text-base">
                Selecciona el período para generar la nómina
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Año */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">Año</label>
                  <Select
                    value={filters.year.toString()}
                    onValueChange={(value) => handleFilterChange('year', parseInt(value))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder-white/70 focus:ring-2 focus:ring-indigo-400/60">
                      <SelectValue placeholder="Seleccionar año" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/10 backdrop-blur-md border border-white/20">
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                        <SelectItem 
                          key={year} 
                          value={year.toString()}
                          className="text-white hover:bg-white/20 focus:bg-white/20"
                        >
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mes */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">Mes</label>
                  <Select
                    value={filters.month.toString()}
                    onValueChange={(value) => handleFilterChange('month', parseInt(value))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder-white/70 focus:ring-2 focus:ring-indigo-400/60">
                      <SelectValue placeholder="Seleccionar mes" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/10 backdrop-blur-md border border-white/20">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <SelectItem 
                          key={month} 
                          value={month.toString()}
                          className="text-white hover:bg-white/20 focus:bg-white/20"
                        >
                          {new Date(filters.year, month - 1).toLocaleDateString('es-HN', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quincena */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">Quincena</label>
                  <Select
                    value={filters.quincena}
                    onValueChange={(value) => handleFilterChange('quincena', value)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder-white/70 focus:ring-2 focus:ring-indigo-400/60">
                      <SelectValue placeholder="Seleccionar quincena" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/10 backdrop-blur-md border border-white/20">
                      <SelectItem value="Q1" className="text-white hover:bg-white/20 focus:bg-white/20">Q1 (1-15)</SelectItem>
                      <SelectItem value="Q2" className="text-white hover:bg-white/20 focus:bg-white/20">Q2 (16-31)</SelectItem>
                      <SelectItem value="Ambas" className="text-white hover:bg-white/20 focus:bg-white/20">Ambas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="backdrop-blur-md bg-red-500/20 border border-red-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-200">
                  <Icon name="alert" className="h-5 w-5" />
                  <span className="font-medium">Error:</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumen de Nómina */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="backdrop-blur-md bg-white/10 border border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-200">Empleados</p>
                      <p className="text-2xl font-bold text-white">{data.resumen.empleados}</p>
                    </div>
                    <div className="p-2 bg-blue-500/30 rounded-full">
                      <Icon name="users" className="h-6 w-6 text-blue-200" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-md bg-white/10 border border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-200">Total Bruto</p>
                      <p className="text-2xl font-bold text-white">{formatCurrencyShort(data.resumen.total_bruto)}</p>
                    </div>
                    <div className="p-2 bg-green-500/30 rounded-full">
                      <Icon name="money" className="h-6 w-6 text-green-200" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-md bg-white/10 border border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-200">Total Deducciones</p>
                      <p className="text-2xl font-bold text-white">{formatCurrencyShort(Object.values(data.resumen.total_deducciones).reduce((sum, val) => sum + val, 0))}</p>
                    </div>
                    <div className="p-2 bg-red-500/30 rounded-full">
                      <Icon name="chart" className="h-6 w-6 text-red-200" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-md bg-white/10 border border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-200">Total Neto</p>
                      <p className="text-2xl font-bold text-white">{formatCurrencyShort(data.resumen.total_neto)}</p>
                    </div>
                    <div className="p-2 bg-emerald-500/30 rounded-full">
                      <Icon name="money" className="h-6 w-6 text-emerald-200" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Advertencias */}
          {data && data.resumen.advertencias.length > 0 && (
            <Card className="backdrop-blur-md bg-yellow-500/20 border border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-yellow-200 text-lg font-semibold">Advertencias</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {data.resumen.advertencias.map((warning, index) => (
                    <li key={index} className="text-yellow-200 text-sm">• {warning}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Tabla de Detalle */}
          {data && (
            <Card className="backdrop-blur-md bg-white/10 border border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-xl font-semibold">Detalle por Empleado</CardTitle>
                <CardDescription className="text-gray-200 text-base">
                  {data.resumen.empleados} empleados - 
                  Período: {new Date(filters.year, filters.month - 1).toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })} {filters.quincena}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/30">
                    <thead className="bg-white/20">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Empleado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Salario Base</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Horas Trab.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Extras</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Bruto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">IHSS</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">RAP</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">ISR</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Neto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Obs.</th>
                      </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-white/20">
                      {data.detalle.map((emp, index) => (
                        <tr key={index} className="hover:bg-white/10 transition-colors duration-200">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{emp.nombre}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{formatCurrency(emp.salario_base)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{emp.horas_trabajadas.toFixed(1)}h</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{emp.extras.horas.toFixed(1)}h</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-300">{formatCurrency(emp.salario_base + emp.extras.monto)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-red-300">{formatCurrency(emp.deducciones.IHSS)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-red-300">{formatCurrency(emp.deducciones.RAP)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-red-300">{formatCurrency(emp.deducciones.ISR)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-white">{formatCurrency(emp.neto)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{emp.observaciones || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Botones de Exportación */}
                <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/20">
                  <Button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Icon name="document" className="h-4 w-4" />
                    Exportar PDF
                  </Button>

                  <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    className="flex items-center gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Icon name="download" className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
