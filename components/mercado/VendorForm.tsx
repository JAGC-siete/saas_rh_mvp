import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { VENDOR_CATEGORIES, VENDOR_CATEGORY_LABEL, type VendorCategory } from '../../lib/mercado/categories'
import { VENDOR_PAYMENT_METHOD_LABEL } from '../../lib/mercado/payments'
import {
  DEFAULT_VENDOR_PAYMENT_METHODS,
  parseCreateVendor,
  type CreateVendorPayload,
  type VendorPaymentMethod,
  type VendorStatus,
} from '../../lib/mercado/schema'
import { slugifyVendorName } from '../../lib/mercado/slug'

const fieldClass = 'bg-white/10 text-white placeholder:text-gray-400'

export interface VendorFormValues {
  name: string
  slug: string
  category: VendorCategory | ''
  description: string
  whatsapp: string
  logoUrl: string
  stallLocation: string
  hoursNote: string
  products: string[]
  paymentMethods: VendorPaymentMethod[]
  status: VendorStatus
}

const EMPTY_VALUES: VendorFormValues = {
  name: '',
  slug: '',
  category: '',
  description: '',
  whatsapp: '',
  logoUrl: '',
  stallLocation: '',
  hoursNote: '',
  products: ['', '', '', '', ''],
  paymentMethods: [...DEFAULT_VENDOR_PAYMENT_METHODS],
  status: 'active',
}

export default function VendorForm({
  initialValues,
  submitLabel,
  onValid,
}: {
  initialValues?: Partial<VendorFormValues>
  submitLabel: string
  onValid: (payload: CreateVendorPayload) => void
}) {
  const [values, setValues] = useState<VendorFormValues>(() => ({
    ...EMPTY_VALUES,
    ...initialValues,
    products: [...(initialValues?.products ?? EMPTY_VALUES.products), '', '', '', '', ''].slice(0, 5),
    paymentMethods: initialValues?.paymentMethods ?? [...DEFAULT_VENDOR_PAYMENT_METHODS],
  }))
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues?.slug))
  const [error, setError] = useState<string | null>(null)

  const effectiveSlug = slugTouched ? values.slug : slugifyVendorName(values.name)

  const categoryItems = useMemo(
    () =>
      VENDOR_CATEGORIES.map((key) => (
        <SelectItem key={key} value={key}>
          {VENDOR_CATEGORY_LABEL[key]}
        </SelectItem>
      )),
    []
  )

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseCreateVendor({
      name: values.name,
      slug: effectiveSlug,
      category: values.category,
      description: values.description,
      whatsapp: values.whatsapp,
      logoUrl: values.logoUrl,
      stallLocation: values.stallLocation,
      hoursNote: values.hoursNote,
      products: values.products,
      paymentMethods: values.paymentMethods,
      status: values.status,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }
    setError(null)
    onValid(parsed.data)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="vendor-name" className="mb-1 block text-sm font-medium text-gray-200">
          Nombre del negocio
        </label>
        <Input
          id="vendor-name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder="Comedor El Patio"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="vendor-slug" className="mb-1 block text-sm font-medium text-gray-200">
          Slug SEO
        </label>
        <Input
          id="vendor-slug"
          value={effectiveSlug}
          onChange={(event) => {
            setSlugTouched(true)
            setValues((current) => ({ ...current, slug: event.target.value }))
          }}
          placeholder="comedor-el-patio"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="vendor-category" className="mb-1 block text-sm font-medium text-gray-200">
          Categoría
        </label>
        <Select
          value={values.category || undefined}
          onValueChange={(value) =>
            setValues((current) => ({ ...current, category: value as VendorCategory }))
          }
        >
          <SelectTrigger id="vendor-category" className={fieldClass}>
            <SelectValue placeholder="Elegí una categoría" />
          </SelectTrigger>
          <SelectContent>{categoryItems}</SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="vendor-description" className="mb-1 block text-sm font-medium text-gray-200">
          Descripción
        </label>
        <Textarea
          id="vendor-description"
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          placeholder="Qué vende el puesto y en qué pasillo está."
          className={fieldClass}
          rows={4}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-200">5 productos principales</legend>
        <div className="grid gap-2">
          {values.products.map((product, index) => (
            <Input
              key={index}
              id={`vendor-product-${index}`}
              value={product}
              onChange={(event) =>
                setValues((current) => {
                  const products = [...current.products]
                  products[index] = event.target.value
                  return { ...current, products }
                })
              }
              placeholder={index === 0 ? 'Lomo de res' : `Producto ${index + 1}`}
              className={fieldClass}
            />
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="vendor-whatsapp" className="mb-1 block text-sm font-medium text-gray-200">
          Teléfono / WhatsApp
        </label>
        <Input
          id="vendor-whatsapp"
          value={values.whatsapp}
          onChange={(event) => setValues((current) => ({ ...current, whatsapp: event.target.value }))}
          placeholder="9999-0000"
          inputMode="tel"
          className={fieldClass}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-200">Métodos de pago</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['efectivo', 'transferencia_bac'] as VendorPaymentMethod[]).map((method) => {
            const checked = values.paymentMethods.includes(method)
            return (
              <label
                key={method}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setValues((current) => {
                      const paymentMethods = checked
                        ? current.paymentMethods.filter((item) => item !== method)
                        : [...current.paymentMethods, method]
                      return { ...current, paymentMethods }
                    })
                  }
                />
                {VENDOR_PAYMENT_METHOD_LABEL[method]}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="vendor-logo" className="mb-1 block text-sm font-medium text-gray-200">
          Imagen / logo (URL)
        </label>
        <Input
          id="vendor-logo"
          value={values.logoUrl}
          onChange={(event) => setValues((current) => ({ ...current, logoUrl: event.target.value }))}
          placeholder="https://…"
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="vendor-stall" className="mb-1 block text-sm font-medium text-gray-200">
            Ubicación en el mercado
          </label>
          <Input
            id="vendor-stall"
            value={values.stallLocation}
            onChange={(event) =>
              setValues((current) => ({ ...current, stallLocation: event.target.value }))
            }
            placeholder="Pasillo 1, local 8"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="vendor-hours" className="mb-1 block text-sm font-medium text-gray-200">
            Horario
          </label>
          <Input
            id="vendor-hours"
            value={values.hoursNote}
            onChange={(event) => setValues((current) => ({ ...current, hoursNote: event.target.value }))}
            placeholder="Lun–Sáb 6:00–15:00"
            className={fieldClass}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit">{submitLabel}</Button>
    </form>
  )
}
