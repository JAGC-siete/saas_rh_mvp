import React, { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  /** Texto que el usuario debe escribir. Vacío + requireTypedConfirm=false → solo Cancelar/Confirmar. */
  confirmText?: string
  confirmLabel?: string
  type?: 'warning' | 'danger' | 'info'
  loading?: boolean
  requireTypedConfirm?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '',
  confirmLabel = 'Confirmar',
  type = 'warning',
  loading = false,
  requireTypedConfirm
}: ConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const mustType = requireTypedConfirm ?? Boolean(confirmText)

  useEffect(() => {
    if (!isOpen) {
      setInputValue('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || loading) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, loading, onClose])

  if (!isOpen) return null

  const isValid =
    !mustType ||
    inputValue.toLowerCase().trim() === confirmText.toLowerCase().trim()

  const handleConfirm = () => {
    if (isValid && !loading) {
      onConfirm()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !loading) {
      handleConfirm()
    }
  }

  const typeStyles = {
    warning: {
      icon: 'text-yellow-400',
      border: 'border-yellow-400/30',
      bg: 'bg-yellow-400/10'
    },
    danger: {
      icon: 'text-red-400',
      border: 'border-red-400/30',
      bg: 'bg-red-400/10'
    },
    info: {
      icon: 'text-blue-400',
      border: 'border-blue-400/30',
      bg: 'bg-blue-400/10'
    }
  }

  const styles = typeStyles[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        className="relative z-50 w-full max-w-lg mx-4 glass border border-white/20 rounded-lg shadow-2xl"
      >
        <div className={`p-6 border-b ${styles.border}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className={`p-2 rounded-lg ${styles.bg}`}>
                <AlertTriangle className={`h-5 w-5 ${styles.icon}`} />
              </div>
              <div className="flex-1">
                <h3 id="confirmation-dialog-title" className="text-lg font-semibold text-white mb-2">
                  {title}
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="ml-4 p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mustType && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Para confirmar, escriba <span className="font-mono text-brand-300">{confirmText}</span> a continuación:
              </label>
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={confirmText}
                disabled={loading}
                className="input-glass text-white placeholder:text-white/50 font-mono"
                autoFocus
              />
              {inputValue && !isValid && (
                <p className="mt-2 text-xs text-yellow-400">
                  El texto debe coincidir exactamente con "{confirmText}"
                </p>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
            className="border-white/20 hover:bg-white/10 hover:border-white/30"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            variant={type === 'danger' ? 'destructive' : 'default'}
            className={type === 'danger' ? '' : 'bg-brand-600 hover:bg-brand-700'}
            autoFocus={!mustType}
          >
            {loading ? 'Confirmando...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
