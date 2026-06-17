import { useState } from 'react'
import { Card } from '../ui/card'
import { PreviewData, ReportType } from './ReportBuilder'
import { Pagination } from '../ui/pagination'
import { AlertCircle } from 'lucide-react'

interface ReportPreviewProps {
  data: PreviewData
  loading?: boolean
  reportType: ReportType
}

export default function ReportPreview({ data, loading, reportType }: ReportPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')

  const itemsPerPage = 15

  // Filter and sort data
  const processedData = data.rows
    .filter((row: any[]) => {
      if (!searchTerm) return true
      return row.some((cell: any) => 
        String(cell).toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
    .sort((a, b) => {
      if (sortColumn === null) return 0
      const aVal = a[sortColumn] || ''
      const bVal = b[sortColumn] || ''
      
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortDirection === 'asc' ? comparison : -comparison
    })

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = processedData.slice(startIndex, endIndex)

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnIndex)
      setSortDirection('asc')
    }
  }

  if (loading) {
    return (
      <Card variant="liquid" className="border border-white/10">
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Generando vista previa...</p>
        </div>
      </Card>
    )
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card variant="liquid" className="border border-white/10">
        <div className="p-12 text-center">
          <AlertCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No hay datos para mostrar
          </h3>
          <p className="text-gray-400">
            Ajusta los filtros para ver los resultados
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar en los resultados..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="text-sm text-gray-400">
          {processedData.length} resultados encontrados
        </div>
      </div>

      {/* Data Table */}
      <Card variant="liquid" className="border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {data.headers.map((header, index) => (
                  <th
                    key={index}
                    onClick={() => handleSort(index)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {header}
                      {sortColumn === index && (
                        <span className="text-brand-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-white/5 transition-colors"
                >
                  {row.map((cell: any, cellIndex: number) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 text-sm text-gray-300"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty table state */}
          {paginatedData.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-400">No hay resultados que coincidan con la búsqueda</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-white/10">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedData.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

