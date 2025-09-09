// Centralized currency formatting utilities
// Consistent formatting across the entire application

export const formatCurrency = (value: number, options?: {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  showSymbol?: boolean
}): string => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true
  } = options || {}

  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits,
    maximumFractionDigits,
    ...(showSymbol ? {} : { currencyDisplay: 'code' })
  }).format(value)
}

// Short currency format for cards and metrics
export const formatCurrencyShort = (value: number): string => {
  return formatCurrency(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

// Long currency format for detailed tables
export const formatCurrencyLong = (value: number): string => {
  return formatCurrency(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Currency without symbol (for calculations)
export const formatCurrencyValue = (value: number): string => {
  return formatCurrency(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    showSymbol: false
  })
}
