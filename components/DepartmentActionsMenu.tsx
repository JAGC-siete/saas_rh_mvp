import { useState, useCallback } from 'react'
import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useToast } from '../lib/toast'

interface DepartmentActionsMenuProps {
  departmentId: string
  departmentName: string
  onUpdate: () => void
}

export default function DepartmentActionsMenu({ 
  departmentId, 
  departmentName, 
  onUpdate 
}: DepartmentActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleDelete = useCallback(async () => {
    const confirmMessage = `¿Estás seguro de que quieres eliminar el departamento "${departmentName}"?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/departments/${departmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar el departamento')
      }

      toast.success('Éxito', 'Departamento eliminado exitosamente')
      onUpdate()
    } catch (error: any) {
      console.error('Error deleting department:', error)
      toast.error('Error', error.message || 'Error inesperado al eliminar el departamento')
    } finally {
      setLoading(false)
    }
  }, [departmentId, departmentName, onUpdate])

  const handleEdit = useCallback(() => {
    // For now, we'll just show a toast. In the future, this could open an edit modal
    toast.info('Info', 'Función de edición próximamente disponible')
    setIsOpen(false)
  }, [toast])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-8 z-20 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1">
            <button
              onClick={handleEdit}
              disabled={loading}
              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Editar</span>
            </button>
            
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Eliminar</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
