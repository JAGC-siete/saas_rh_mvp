import { useState, useCallback } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Icon } from './Icon'

interface Employee {
  id: string
  name: string
  employee_code: string
  base_salary: number
  department_id: string
  status: string
}

interface VoucherPreview {
  employee_id: string
  employee_code: string
  name: string
  department: string
  position: string
  periodo: string
  quincena: number
  days_worked: number
  base_salary: number
  gross_salary: number
  ihss: number
  rap: number
  isr: number
  total_deductions: number
  net_salary: number
  adj_bonus: number
  adj_discount: number
  final_net: number
  note: string
}

interface VoucherGeneratorProps {
  employees: Employee[]
  onVoucherGenerated: () => void
}

export default function VoucherGenerator({ employees, onVoucherGenerated }: VoucherGeneratorProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [quincena, setQuincena] = useState<number>(() => {
    const today = new Date()
    const day = today.getDate()
    return day <= 15 ? 1 : 2
  })
  const [incluirDeducciones, setIncluirDeducciones] = useState(false)
  const [adjBonus, setAdjBonus] = useState<number>(0)
  const [adjDiscount, setAdjDiscount] = useState<number>(0)
  const [note, setNote] = useState<string>('')
  
  const [voucherPreview, setVoucherPreview] = useState<VoucherPreview | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Generar preview del voucher
  const generatePreview = useCallback(async () => {
    if (!selectedEmployee) {
      alert('❌ Selecciona un empleado')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/payroll/generate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          employee_id: selectedEmployee,
          periodo,
          quincena,
          incluirDeducciones,
          adj_bonus: adjBonus,
          adj_discount: adjDiscount,
          note
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Error generando preview')
      }

      const result = await response.json()
      setVoucherPreview(result.voucher)
      setIsEditing(true)
      
      console.log('✅ Preview del voucher generado:', result.voucher)
      
    } catch (error: any) {
      console.error('❌ Error generando preview:', error)
      alert(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setIsGenerating(false)
    }
  }, [selectedEmployee, periodo, quincena, incluirDeducciones, adjBonus, adjDiscount, note])

  // Generar PDF del voucher
  const generatePDF = useCallback(async () => {
    if (!voucherPreview) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/payroll/generate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          employee_id: voucherPreview.employee_id,
          periodo: voucherPreview.periodo,
          quincena: voucherPreview.quincena,
          incluirDeducciones,
          adj_bonus: adjBonus,
          adj_discount: adjDiscount,
          note
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Error generando PDF')
      }

      if (response.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `voucher_${voucherPreview.employee_code}_${voucherPreview.periodo}_q${voucherPreview.quincena}.pdf`
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
        
        alert('✅ Voucher PDF generado y descargado exitosamente')
        onVoucherGenerated()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Respuesta inesperada del servidor')
      }
    } catch (error: any) {
      console.error('❌ Error generando PDF:', error)
      alert(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setIsGenerating(false)
    }
  }, [voucherPreview, incluirDeducciones, adjBonus, adjDiscount, note, onVoucherGenerated])

  // Enviar voucher por email
  const sendVoucherEmail = useCallback(async () => {
    if (!voucherPreview) return

    try {
      const to = prompt('Correo de destino:')
      if (!to) return
      
      // Validar formato de email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        alert('❌ Formato de email inválido')
        return
      }

      const response = await fetch('/api/payroll/send-voucher-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          employee_id: voucherPreview.employee_id,
          periodo: voucherPreview.periodo,
          quincena: voucherPreview.quincena
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Error enviando email')
      }

      if (result.sent) {
        alert(`✅ Voucher enviado por email exitosamente a ${to}`)
      } else {
        alert(`📥 ${result.message || 'Enlace listo'}: ${result.downloadUrl}`)
      }
    } catch (error: any) {
      console.error('❌ Error enviando voucher por email:', error)
      alert(`❌ Error: ${error.message || 'Error desconocido'}`)
    }
  }, [voucherPreview])

  // Enviar voucher por WhatsApp
  const sendVoucherWhatsApp = useCallback(async () => {
    if (!voucherPreview) return

    try {
      const phone = prompt('Número WhatsApp (E.164, ej. 5049xxxxxxx):')
      if (!phone) return
      
      // Validar formato de teléfono
      const cleanPhone = phone.replace(/\D/g, '')
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        alert('❌ Formato de teléfono inválido. Use formato E.164 (ej: 5049xxxxxxx)')
        return
      }

      const response = await fetch('/api/payroll/send-voucher-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          employee_id: voucherPreview.employee_id,
          periodo: voucherPreview.periodo,
          quincena: voucherPreview.quincena
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Error enviando WhatsApp')
      }

      if (result.url) {
        const openWhatsApp = confirm(`📱 Enlace de WhatsApp generado para ${cleanPhone}.\n\n¿Abrir WhatsApp?`)
        if (openWhatsApp) {
          window.open(result.url, '_blank')
        }
      } else {
        alert(`📱 ${result.message || 'Enlace generado'}`)
      }
    } catch (error: any) {
      console.error('❌ Error enviando voucher por WhatsApp:', error)
      alert(`❌ Error: ${error.message || 'Error desconocido'}`)
    }
  }, [voucherPreview])

  // Resetear formulario
  const resetForm = useCallback(() => {
    setSelectedEmployee('')
    setPeriodo(new Date().toISOString().slice(0, 7))
    setQuincena(() => {
      const today = new Date()
      const day = today.getDate()
      return day <= 15 ? 1 : 2
    })
    setIncluirDeducciones(false)
    setAdjBonus(0)
    setAdjDiscount(0)
    setNote('')
    setVoucherPreview(null)
    setIsEditing(false)
  }, [])

  return (
    <div className="space-y-6">
      {/* Formulario de configuración */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Selección de empleado */}
        <div>
          <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Icon name="users" className="w-4 h-4" />
            Empleado
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2"
            required
          >
            <option value="">Seleccionar empleado</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employee_code})
              </option>
            ))}
          </select>
        </div>

        {/* Mes */}
        <div>
          <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Icon name="calendar" className="w-4 h-4" />
            Mes
          </label>
          <Input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            required
            className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400"
          />
        </div>

        {/* Quincena */}
        <div>
          <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Icon name="clock" className="w-4 h-4" />
            Quincena
          </label>
          <div className="flex gap-3">
            <Button 
              type="button"
              onClick={() => setQuincena(1)}
              className={`flex-1 ${quincena === 1 ? 'bg-brand-800 hover:bg-brand-700 text-white' : 'border border-white/20 text-white hover:bg-white/10 bg-transparent'}`}
            >
              1 - 15
            </Button>
            <Button 
              type="button"
              onClick={() => setQuincena(2)}
              className={`flex-1 ${quincena === 2 ? 'bg-brand-800 hover:bg-brand-700 text-white' : 'bg-transparent border border-white/20 text-white hover:bg-white/10'}`}
            >
              16 - {(() => {
                const [year, month] = periodo.split('-').map(Number)
                return new Date(year, month, 0).getDate()
              })()}
            </Button>
          </div>
        </div>

        {/* Incluir deducciones */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={incluirDeducciones}
            onChange={(e) => setIncluirDeducciones(e.target.checked)}
            className="w-4 h-4 accent-brand-500"
            id="voucher-deducciones"
          />
          <label htmlFor="voucher-deducciones" className="text-sm font-medium text-white flex items-center gap-2">
            <Icon name="money" className="w-4 h-4" />
            Incluir deducciones (ISR, IHSS, RAP)
          </label>
        </div>

        {/* Ajuste de bono */}
        <div>
          <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Icon name="money" className="w-4 h-4" />
            Ajuste de Bono
          </label>
          <Input
            type="number"
            value={adjBonus}
            onChange={(e) => setAdjBonus(Number(e.target.value) || 0)}
            className="w-full bg-white/10 border-white/20 text-white"
            placeholder="0"
            min="0"
          />
        </div>

        {/* Ajuste de descuento */}
        <div>
          <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Icon name="money" className="w-4 h-4" />
            Ajuste de Descuento
          </label>
          <Input
            type="number"
            value={adjDiscount}
            onChange={(e) => setAdjDiscount(Number(e.target.value) || 0)}
            className="w-full bg-white/10 border-white/20 text-white"
            placeholder="0"
            min="0"
          />
        </div>
      </div>

      {/* Nota */}
      <div>
        <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
          <Icon name="edit" className="w-4 h-4" />
          Nota
        </label>
        <Input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-white/10 border-white/20 text-white"
          placeholder="Nota opcional para el voucher"
        />
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
        <Button
          type="button"
          onClick={generatePreview}
          disabled={!selectedEmployee || isGenerating}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
        >
          {isGenerating ? (
            <>
              <Icon name="refresh" className="w-4 h-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Icon name="search" className="w-4 h-4 mr-2" />
              Generar Preview
            </>
          )}
        </Button>

        <Button
          type="button"
          onClick={resetForm}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10 px-6 py-3"
        >
          <Icon name="refresh" className="w-4 h-4 mr-2" />
          Resetear
        </Button>
      </div>

      {/* Preview del voucher */}
      {voucherPreview && (
        <div className="mt-6 p-6 bg-brand-800/20 border border-brand-500/30 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Icon name="receipt" className="w-5 h-5" />
              Preview del Voucher
            </h3>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Icon name={isEditing ? "eye" : "edit"} className="w-4 h-4 mr-1" />
              {isEditing ? 'Ver' : 'Editar'}
            </Button>
          </div>

          {/* Información del empleado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-gray-300">Empleado</div>
              <div className="text-white font-medium">{voucherPreview.name}</div>
              <div className="text-xs text-gray-400">{voucherPreview.employee_code}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-gray-300">Departamento</div>
              <div className="text-white font-medium">{voucherPreview.department}</div>
              <div className="text-xs text-gray-400">{voucherPreview.position}</div>
            </div>
          </div>

          {/* Detalles del voucher */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-gray-300">Período</div>
              <div className="text-white font-medium">{voucherPreview.periodo} Q{voucherPreview.quincena}</div>
              <div className="text-xs text-gray-400">{voucherPreview.days_worked} días trabajados</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-gray-300">Salario Bruto</div>
              <div className="text-white font-medium">L. {voucherPreview.gross_salary.toFixed(2)}</div>
              <div className="text-xs text-gray-400">Base: L. {voucherPreview.base_salary.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-gray-300">Total Deducciones</div>
              <div className="text-white font-medium">L. {voucherPreview.total_deductions.toFixed(2)}</div>
              <div className="text-xs text-gray-400">IHSS: L. {voucherPreview.ihss.toFixed(2)} | RAP: L. {voucherPreview.rap.toFixed(2)} | ISR: L. {voucherPreview.isr.toFixed(2)}</div>
            </div>
          </div>

          {/* Ajustes y total final */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-gray-300">Ajustes</div>
              <div className="text-green-400 font-medium">+ Bono: L. {voucherPreview.adj_bonus.toFixed(2)}</div>
              <div className="text-red-400 font-medium">- Descuento: L. {voucherPreview.adj_discount.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-green-600/20 border border-green-500/30 rounded-lg">
              <div className="text-sm text-green-300">Total Final</div>
              <div className="text-green-400 font-bold text-xl">L. {voucherPreview.final_net.toFixed(2)}</div>
              <div className="text-xs text-green-300">Neto + Ajustes</div>
            </div>
          </div>

          {/* Nota */}
          {voucherPreview.note && (
            <div className="mb-6 p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
              <div className="text-sm text-yellow-300 font-medium mb-1">Nota:</div>
              <div className="text-yellow-200">{voucherPreview.note}</div>
            </div>
          )}

          {/* Botones de acción final */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
            <Button
              onClick={generatePDF}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3"
            >
              {isGenerating ? (
                <>
                  <Icon name="refresh" className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Icon name="download" className="w-4 h-4 mr-2" />
                  Generar PDF
                </>
              )}
            </Button>

            <Button
              onClick={sendVoucherEmail}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-6 py-3"
            >
              <Icon name="envelope" className="w-4 h-4 mr-2" />
              Enviar por Email
            </Button>

            <Button
              onClick={sendVoucherWhatsApp}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-6 py-3"
            >
              <Icon name="whatsapp" className="w-4 h-4 mr-2" />
              Enviar por WhatsApp
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
