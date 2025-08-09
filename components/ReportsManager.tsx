import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

interface DateFilter {
  type: 'today' | 'week' | 'biweek' | 'month'
  startDate: string
  endDate: string
  label: string
}

export default function ReportsManager() {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<DateFilter>({
    type: 'today',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    label: 'Hoy'
  })

  // Funciones para calcular fechas
  function getToday(): string {
    return new Date().toISOString().split('T')[0]
  }

  function getWeekStart(): string {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    return new Date(today.setDate(diff)).toISOString().split('T')[0]
  }

  function getWeekEnd(): string {
    const weekStart = new Date(getWeekStart())
    weekStart.setDate(weekStart.getDate() + 6)
    return weekStart.toISOString().split('T')[0]
  }

  function getBiweekStart(): string {
    const today = new Date()
    const dayOfMonth = today.getDate()
    const startDay = dayOfMonth <= 15 ? 1 : 16
    return new Date(today.getFullYear(), today.getMonth(), startDay).toISOString().split('T')[0]
  }

  function getBiweekEnd(): string {
    const today = new Date()
    const dayOfMonth = today.getDate()
    const endDay = dayOfMonth <= 15 ? 15 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    return new Date(today.getFullYear(), today.getMonth(), endDay).toISOString().split('T')[0]
  }

  function getMonthStart(): string {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  }

  function getMonthEnd(): string {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  }

  const handleFilterChange = (type: 'today' | 'week' | 'biweek' | 'month') => {
    let startDate: string
    let endDate: string
    let label: string

    switch (type) {
      case 'today':
        startDate = getToday()
        endDate = getToday()
        label = 'Hoy'
        break
      case 'week':
        startDate = getWeekStart()
        endDate = getWeekEnd()
        label = 'Esta Semana'
        break
      case 'biweek':
        startDate = getBiweekStart()
        endDate = getBiweekEnd()
        label = 'Esta Quincena'
        break
      case 'month':
        startDate = getMonthStart()
        endDate = getMonthEnd()
        label = 'Este Mes'
        break
    }

    setSelectedFilter({ type, startDate, endDate, label })
  }

  const exportAttendanceReport = async (format: 'pdf' | 'csv') => {
    try {
      setExporting(true)
      
      const response = await fetch(`/api/attendance/export-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': format === 'pdf' ? 'application/pdf' : 'text/csv'
        },
        body: JSON.stringify({
          format,
          range: selectedFilter.type,
          startDate: selectedFilter.startDate,
          endDate: selectedFilter.endDate
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error exportando reporte de asistencia')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_asistencia_${selectedFilter.startDate}_${selectedFilter.endDate}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting attendance report:', error)
      alert(`Error al exportar el reporte de asistencia: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Filtro de Período</CardTitle>
          <CardDescription className="text-gray-300">
            Selecciona el período para los reportes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleFilterChange('today')}
              variant={selectedFilter.type === 'today' ? 'default' : 'outline'}
              size="sm"
              className={selectedFilter.type === 'today' ? 'bg-brand-900 hover:bg-brand-800' : ''}
            >
              Hoy
            </Button>
            <Button
              onClick={() => handleFilterChange('week')}
              variant={selectedFilter.type === 'week' ? 'default' : 'outline'}
              size="sm"
              className={selectedFilter.type === 'week' ? 'bg-brand-900 hover:bg-brand-800' : ''}
            >
              Esta Semana
            </Button>
            <Button
              onClick={() => handleFilterChange('biweek')}
              variant={selectedFilter.type === 'biweek' ? 'default' : 'outline'}
              size="sm"
              className={selectedFilter.type === 'biweek' ? 'bg-brand-900 hover:bg-brand-800' : ''}
            >
              Esta Quincena
            </Button>
            <Button
              onClick={() => handleFilterChange('month')}
              variant={selectedFilter.type === 'month' ? 'default' : 'outline'}
              size="sm"
              className={selectedFilter.type === 'month' ? 'bg-brand-900 hover:bg-brand-800' : ''}
            >
              Este Mes
            </Button>
          </div>
          <div className="mt-3 text-sm text-gray-300">
            <strong>Período seleccionado:</strong> {selectedFilter.startDate} - {selectedFilter.endDate}
          </div>
        </CardContent>
      </Card>

      {/* Reporte de Asistencia */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">⏰ Reporte de Asistencia</CardTitle>
          <CardDescription className="text-gray-300">
            Registros de asistencia del período seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Formato
              </label>
              <select
                className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand-500 backdrop-blur-sm"
                defaultValue="pdf"
                id="reportFormat"
              >
                <option value="pdf" className="text-gray-900">PDF</option>
                <option value="csv" className="text-gray-900">CSV</option>
              </select>
            </div>

            <Button
              onClick={() => {
                const format = (document.getElementById('reportFormat') as HTMLSelectElement)?.value as 'pdf' | 'csv'
                exportAttendanceReport(format)
              }}
              disabled={exporting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {exporting ? 'Generando...' : '📄 Generar Reporte'}
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-gray-300">
            <strong>Reporte incluye:</strong> Registros de entrada/salida, horas trabajadas, tardanzas y ausencias
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            • Si no hay datos en el período seleccionado, se mostrará un mensaje informativo<br/>
            • El reporte respeta los permisos de tu empresa<br/>
            • PDF para impresión profesional, CSV para análisis en Excel
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card variant="glass" className="bg-brand-900/20 border-brand-500/30">
        <CardHeader>
          <CardTitle className="text-brand-300">ℹ️ Información Importante</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-brand-200">
            <strong>Filtros aplicados:</strong> El reporte respeta el período seleccionado arriba.<br/>
            <strong>Seguridad:</strong> Los reportes solo incluyen datos de tu empresa.<br/>
            <strong>Sin datos:</strong> Si no hay registros en el período, se generará un reporte vacío con mensaje informativo.
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 