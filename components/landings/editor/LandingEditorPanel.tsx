/**
 * Panel de edición: acordeón con una sección por bloque del content_json.
 *
 * Nota de tipos: react-hook-form no puede tipar rutas como `blocks.3.items.0.name`
 * cuando `blocks` es una unión discriminada, así que el control y el register entran
 * como `any` en los editores de bloque. La corrección no se pierde: el resolver de Zod
 * valida el objeto completo contra landingPageContentSchema antes de guardar.
 */

import React from 'react'
import { useFieldArray, type Control, type UseFormRegister } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { LANDING_CTA_ACTIONS } from '../../../lib/landings/page-schema'
import type { LandingBlockKind } from '../../../types/landing'

type AnyControl = Control<any>
type AnyRegister = UseFormRegister<any>

/**
 * Único punto donde se pierde el tipado de rutas de react-hook-form.
 * A cambio, el resolver de Zod valida el objeto completo antes de guardar, así que
 * un nombre de campo mal escrito falla en la validación, no en silencio.
 */
export interface EditorFormControls {
  control: AnyControl
  register: AnyRegister
}

export function asEditorControls(form: { control: unknown; register: unknown }): EditorFormControls {
  return {
    control: form.control as AnyControl,
    register: form.register as AnyRegister,
  }
}

/** El acordeón solo necesita identificar y ordenar; los datos los lee register(). */
export interface EditableBlockRef {
  id?: string
  kind?: LandingBlockKind
}

const inputClass = 'bg-white/10 text-white placeholder:text-gray-500'

const BLOCK_LABEL: Record<LandingBlockKind, string> = {
  hero: 'Portada',
  items: 'Lista con precios',
  gallery: 'Galería',
  text: 'Texto',
  hours: 'Horario',
  testimonials: 'Testimonios',
  faq: 'Preguntas frecuentes',
  leadForm: 'Formulario',
  contact: 'Contacto',
  cta: 'Llamado final',
  visit: 'Cómo llegar',
  benefits: 'Por qué venir',
  areas: 'Áreas del local',
  team: 'Equipo',
}

const CTA_ACTION_LABEL: Record<(typeof LANDING_CTA_ACTIONS)[number], string> = {
  'lead-form': 'Ir al formulario',
  whatsapp: 'Abrir WhatsApp',
  call: 'Llamar',
  maps: 'Abrir el mapa',
  link: 'Enlace externo',
}

/* ------------------------------- primitivas ------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  )
}

function TextField({
  register,
  name,
  label,
  hint,
  placeholder,
}: {
  register: AnyRegister
  name: string
  label: string
  hint?: string
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <Input {...register(name)} placeholder={placeholder} className={inputClass} />
    </Field>
  )
}

function AreaField({
  register,
  name,
  label,
  rows = 3,
}: {
  register: AnyRegister
  name: string
  label: string
  rows?: number
}) {
  return (
    <Field label={label}>
      <Textarea {...register(name)} rows={rows} className={inputClass} />
    </Field>
  )
}

function SelectField({
  register,
  name,
  label,
  options,
}: {
  register: AnyRegister
  name: string
  label: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <Field label={label}>
      <select
        {...register(name)}
        className="h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-slate-900">
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

function CheckField({
  register,
  name,
  label,
}: {
  register: AnyRegister
  name: string
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-300">
      <input type="checkbox" {...register(name)} className="h-4 w-4" />
      {label}
    </label>
  )
}

function ColorField({
  register,
  name,
  label,
}: {
  register: AnyRegister
  name: string
  label: string
}) {
  return (
    <Field label={label}>
      <input
        type="color"
        {...register(name)}
        className="h-10 w-full cursor-pointer rounded-md border border-white/20 bg-white/10 p-1"
      />
    </Field>
  )
}

function CtaFields({
  register,
  base,
  label,
}: {
  register: AnyRegister
  base: string
  label: string
}) {
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField register={register} name={`${base}.label`} label="Texto del botón" />
        <SelectField
          register={register}
          name={`${base}.action`}
          label="Qué hace"
          options={LANDING_CTA_ACTIONS.map((action) => ({
            value: action,
            label: CTA_ACTION_LABEL[action],
          }))}
        />
      </div>
      <div className="mt-3">
        <TextField
          register={register}
          name={`${base}.href`}
          label="Enlace (solo para enlace externo)"
          placeholder="https://…"
        />
      </div>
    </div>
  )
}

/**
 * Lista editable dentro de un bloque. El índice del bloque llega por props para que
 * el editor siga funcionando si algún día se reordenan los bloques.
 */
function ItemList({
  control,
  register,
  blockIndex,
  property,
  addLabel,
  emptyItem,
  renderFields,
}: {
  control: AnyControl
  register: AnyRegister
  blockIndex: number
  property: string
  addLabel: string
  emptyItem: Record<string, unknown>
  // eslint-disable-next-line no-unused-vars -- falso positivo: parámetro en posición de tipo
  renderFields: (itemBase: string) => React.ReactNode
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `blocks.${blockIndex}.${property}`,
  })

  return (
    <div className="space-y-3">
      {fields.map((field, itemIndex) => (
        <div key={field.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">#{itemIndex + 1}</span>
            <button
              type="button"
              onClick={() => remove(itemIndex)}
              className="text-gray-400 hover:text-red-400"
              aria-label={`Eliminar elemento ${itemIndex + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {renderFields(`blocks.${blockIndex}.${property}.${itemIndex}`)}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={() => append(emptyItem)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {addLabel}
      </Button>

      {fields.length === 0 && (
        <p className="text-xs text-amber-300">
          Este bloque necesita al menos un elemento para poder guardar.
        </p>
      )}
      <input type="hidden" {...register(`blocks.${blockIndex}.kind`)} />
    </div>
  )
}

/* ----------------------------- bloque por tipo ---------------------------- */

export function BlockFields({
  block,
  blockIndex,
  control,
  register,
}: {
  block: EditableBlockRef
  blockIndex: number
  control: AnyControl
  register: AnyRegister
}) {
  const base = `blocks.${blockIndex}`

  switch (block.kind) {
    case 'hero':
      return (
        <div className="space-y-3">
          <SelectField
            register={register}
            name={`${base}.layout`}
            label="Tipo de portada"
            options={[
              { value: 'classic', label: 'Clásica' },
              { value: 'visit', label: 'Visita al local (retail)' },
              { value: 'booking', label: 'Cita / reserva (servicios)' },
            ]}
          />
          <TextField register={register} name={`${base}.badge`} label="Etiqueta pequeña" />
          <TextField register={register} name={`${base}.headline`} label="Titular" />
          <AreaField register={register} name={`${base}.subheadline`} label="Bajada" />
          <TextField
            register={register}
            name={`${base}.imageUrl`}
            label="Imagen"
            hint="URL https o ruta interna que empiece con /. En visita al local es el fondo."
          />
          <TextField register={register} name={`${base}.searchPlaceholder`} label="Placeholder de búsqueda" />
          <TextField register={register} name={`${base}.searchHint`} label="Ayuda bajo la búsqueda" />
          <TextField register={register} name={`${base}.searchSubmitLabel`} label="Texto del botón buscar" />
          <CtaFields register={register} base={`${base}.primaryCta`} label="Botón principal" />
          <CtaFields register={register} base={`${base}.secondaryCta`} label="Botón secundario" />
        </div>
      )

    case 'items':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <AreaField register={register} name={`${base}.subtitle`} label="Subtítulo" rows={2} />
          <SelectField
            register={register}
            name={`${base}.layout`}
            label="Distribución"
            options={[
              { value: 'grid', label: 'Tarjetas' },
              { value: 'list', label: 'Lista' },
            ]}
          />
          <ItemList
            control={control}
            register={register}
            blockIndex={blockIndex}
            property="items"
            addLabel="Agregar producto o servicio"
            emptyItem={{ name: '', detail: '', category: '', priceLabel: '' }}
            renderFields={(itemBase) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField register={register} name={`${itemBase}.name`} label="Nombre" />
                <TextField register={register} name={`${itemBase}.priceLabel`} label="Precio" />
                <TextField register={register} name={`${itemBase}.category`} label="Categoría (Cabello, Uñas…)" />
                <TextField register={register} name={`${itemBase}.detail`} label="Para qué sirve" />
                <TextField register={register} name={`${itemBase}.imageUrl`} label="Imagen" />
              </div>
            )}
          />
        </div>
      )

    case 'gallery':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <ItemList
            control={control}
            register={register}
            blockIndex={blockIndex}
            property="images"
            addLabel="Agregar imagen"
            emptyItem={{ url: '', alt: '' }}
            renderFields={(itemBase) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField register={register} name={`${itemBase}.url`} label="URL" />
                <TextField register={register} name={`${itemBase}.alt`} label="Descripción" />
              </div>
            )}
          />
        </div>
      )

    case 'text':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <AreaField register={register} name={`${base}.body`} label="Texto" rows={6} />
        </div>
      )

    case 'hours':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <ItemList
            control={control}
            register={register}
            blockIndex={blockIndex}
            property="rows"
            addLabel="Agregar fila"
            emptyItem={{ label: '', value: '' }}
            renderFields={(itemBase) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField register={register} name={`${itemBase}.label`} label="Días" />
                <TextField register={register} name={`${itemBase}.value`} label="Horas" />
              </div>
            )}
          />
          <TextField register={register} name={`${base}.note`} label="Nota" />
        </div>
      )

    case 'testimonials':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <ItemList
            control={control}
            register={register}
            blockIndex={blockIndex}
            property="items"
            addLabel="Agregar testimonio"
            emptyItem={{ author: '', role: '', quote: '' }}
            renderFields={(itemBase) => (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField register={register} name={`${itemBase}.author`} label="Quién lo dice" />
                  <TextField register={register} name={`${itemBase}.role`} label="Detalle" />
                </div>
                <AreaField register={register} name={`${itemBase}.quote`} label="Testimonio" rows={2} />
              </div>
            )}
          />
        </div>
      )

    case 'faq':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <ItemList
            control={control}
            register={register}
            blockIndex={blockIndex}
            property="items"
            addLabel="Agregar pregunta"
            emptyItem={{ question: '', answer: '' }}
            renderFields={(itemBase) => (
              <div className="space-y-3">
                <TextField register={register} name={`${itemBase}.question`} label="Pregunta" />
                <AreaField register={register} name={`${itemBase}.answer`} label="Respuesta" rows={3} />
              </div>
            )}
          />
        </div>
      )

    case 'leadForm':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <AreaField register={register} name={`${base}.subtitle`} label="Subtítulo" rows={2} />
          <TextField register={register} name={`${base}.submitLabel`} label="Texto del botón" />
          <SelectField
            register={register}
            name={`${base}.layout`}
            label="Tipo de formulario"
            options={[
              { value: 'plain', label: 'Contacto simple' },
              { value: 'booking', label: 'Reserva en 3 pasos' },
            ]}
          />
          <AreaField register={register} name={`${base}.consentText`} label="Texto de consentimiento" rows={2} />
          <div className="flex gap-4">
            <CheckField register={register} name={`${base}.fields.phone`} label="Pedir teléfono" />
            <CheckField register={register} name={`${base}.fields.message`} label="Pedir mensaje" />
          </div>
          <TextField register={register} name={`${base}.successTitle`} label="Título al enviar" />
          <AreaField register={register} name={`${base}.successBody`} label="Mensaje al enviar" rows={2} />
        </div>
      )

    case 'contact':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <TextField register={register} name={`${base}.note`} label="Nota" />
          <div className="grid grid-cols-2 gap-2">
            <CheckField register={register} name={`${base}.showWhatsapp`} label="Mostrar WhatsApp" />
            <CheckField register={register} name={`${base}.showPhone`} label="Mostrar teléfono" />
            <CheckField register={register} name={`${base}.showEmail`} label="Mostrar correo" />
            <CheckField register={register} name={`${base}.showAddress`} label="Mostrar dirección" />
            <CheckField register={register} name={`${base}.showMap`} label="Mostrar mapa" />
          </div>
        </div>
      )

    case 'cta':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.headline`} label="Titular" />
          <AreaField register={register} name={`${base}.subheadline`} label="Bajada" rows={2} />
          <CtaFields register={register} base={`${base}.primaryCta`} label="Botón" />
        </div>
      )

    case 'visit':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <AreaField register={register} name={`${base}.body`} label="Cómo llegar" rows={4} />
          <TextField register={register} name={`${base}.geoLabel`} label="Coordenadas o nota corta" />
          <TextField register={register} name={`${base}.mapsCtaLabel`} label="Botón de mapa" />
          <TextField register={register} name={`${base}.hoursCtaLabel`} label="Botón de horario" />
          <TextField register={register} name={`${base}.mapPlaceholder`} label="Texto del recuadro de mapa" />
        </div>
      )

    case 'benefits':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <ItemList
            control={control}
            register={register}
            blockIndex={blockIndex}
            property="items"
            addLabel="Agregar beneficio"
            emptyItem={{ mark: '', title: '', body: '' }}
            renderFields={(itemBase) => (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField register={register} name={`${itemBase}.mark`} label="Marca (01)" />
                  <TextField register={register} name={`${itemBase}.title`} label="Título" />
                </div>
                <AreaField register={register} name={`${itemBase}.body`} label="Texto" rows={2} />
              </div>
            )}
          />
        </div>
      )

    case 'areas':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <AreaField register={register} name={`${base}.subtitle`} label="Bajada" rows={2} />
          <TextField register={register} name={`${base}.emptyMessage`} label="Mensaje si la búsqueda no da" />
          <ItemList
            control={control}
            register={register}
            blockIndex={blockIndex}
            property="items"
            addLabel="Agregar área"
            emptyItem={{
              id: '',
              title: '',
              aisle: '',
              description: '',
              ctaLabel: 'Ver ubicación del área',
              needles: [],
            }}
            renderFields={(itemBase) => (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField register={register} name={`${itemBase}.id`} label="Id (minúsculas)" />
                  <TextField register={register} name={`${itemBase}.title`} label="Nombre" />
                  <TextField register={register} name={`${itemBase}.aisle`} label="Pasillo o zona" />
                  <TextField register={register} name={`${itemBase}.ctaLabel`} label="Enlace a la visita" />
                  <TextField register={register} name={`${itemBase}.imageUrl`} label="Imagen" />
                  <TextField register={register} name={`${itemBase}.imageAlt`} label="Descripción de la foto" />
                </div>
                <AreaField register={register} name={`${itemBase}.description`} label="Qué hay en el área" rows={3} />
                <TextField
                  register={register}
                  name={`${itemBase}.hintLabel`}
                  label="Texto de sugerencia en la búsqueda"
                />
              </div>
            )}
          />
        </div>
      )

    case 'team':
      return (
        <div className="space-y-3">
          <TextField register={register} name={`${base}.title`} label="Título" />
          <AreaField register={register} name={`${base}.subtitle`} label="Subtítulo" rows={2} />
          <ItemList
            control={control}
            register={register}
            blockIndex={blockIndex}
            property="items"
            addLabel="Agregar persona"
            emptyItem={{ name: '', role: '', bio: '', imageUrl: '' }}
            renderFields={(itemBase) => (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField register={register} name={`${itemBase}.name`} label="Nombre" />
                  <TextField register={register} name={`${itemBase}.role`} label="Rol" />
                </div>
                <AreaField register={register} name={`${itemBase}.bio`} label="Bio" rows={2} />
                <TextField register={register} name={`${itemBase}.imageUrl`} label="Foto" />
              </div>
            )}
          />
        </div>
      )

    default:
      return null
  }
}

export function BlockAccordion({
  blocks,
  control,
  register,
}: {
  blocks: EditableBlockRef[]
  control: AnyControl
  register: AnyRegister
}) {
  return (
    <div className="space-y-2">
      {blocks.map((block, blockIndex) => (
        <details key={block.id ?? blockIndex} className="rounded-lg border border-white/10 bg-white/5">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-white">
              {block.kind ? BLOCK_LABEL[block.kind] : 'Bloque'}
              <span className="ml-2 font-mono text-xs text-gray-500">{block.id}</span>
            </span>
          </summary>
          <div className="space-y-3 border-t border-white/10 px-4 py-4">
            <CheckField
              register={register}
              name={`blocks.${blockIndex}.visible`}
              label="Mostrar este bloque en la página"
            />
            <BlockFields block={block} blockIndex={blockIndex} control={control} register={register} />
          </div>
        </details>
      ))}
    </div>
  )
}

export function GlobalFields({ register }: { register: AnyRegister }) {
  return (
    <div className="space-y-2">
      <details className="rounded-lg border border-white/10 bg-white/5" open>
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-white">
          Datos del negocio
        </summary>
        <div className="grid gap-3 border-t border-white/10 px-4 py-4 sm:grid-cols-2">
          <TextField register={register} name="business.name" label="Nombre del negocio" />
          <TextField register={register} name="business.tagline" label="Frase corta" />
          <TextField
            register={register}
            name="business.whatsapp"
            label="WhatsApp"
            hint="Si lo dejas vacío, los botones de WhatsApp no se muestran"
          />
          <TextField register={register} name="business.phone" label="Teléfono" />
          <TextField register={register} name="business.email" label="Correo" />
          <TextField register={register} name="business.city" label="Ciudad" />
          <TextField register={register} name="business.address" label="Dirección" />
          <TextField
            register={register}
            name="business.mapsQuery"
            label="Búsqueda en Maps"
            hint="Lo que la gente escribiría para encontrarte"
          />
          <TextField register={register} name="business.socials.instagram" label="Instagram" />
          <TextField register={register} name="business.socials.facebook" label="Facebook" />
          <TextField register={register} name="business.socials.tiktok" label="TikTok" />
        </div>
      </details>

      <details className="rounded-lg border border-white/10 bg-white/5">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-white">Colores y tipografía</summary>
        <div className="grid gap-3 border-t border-white/10 px-4 py-4 sm:grid-cols-2">
          <ColorField register={register} name="theme.primary" label="Color principal" />
          <ColorField register={register} name="theme.accent" label="Color de acento" />
          <ColorField register={register} name="theme.surface" label="Fondo" />
          <SelectField
            register={register}
            name="theme.tone"
            label="Tono"
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
          />
          <SelectField
            register={register}
            name="theme.font"
            label="Tipografía"
            options={[
              { value: 'sans', label: 'Sans (moderna)' },
              { value: 'serif', label: 'Serif (clásica)' },
            ]}
          />
          <SelectField
            register={register}
            name="theme.radius"
            label="Bordes"
            options={[
              { value: 'sm', label: 'Rectos' },
              { value: 'md', label: 'Medios' },
              { value: 'lg', label: 'Redondeados' },
            ]}
          />
        </div>
      </details>

      <details className="rounded-lg border border-white/10 bg-white/5">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-white">
          Google y redes (SEO)
        </summary>
        <div className="space-y-3 border-t border-white/10 px-4 py-4">
          <TextField
            register={register}
            name="meta.seoTitle"
            label="Título en Google"
            hint="Hasta 70 caracteres"
          />
          <AreaField register={register} name="meta.seoDescription" label="Descripción en Google" rows={3} />
          <TextField register={register} name="meta.keywords" label="Palabras clave" />
          <TextField register={register} name="meta.ogImageUrl" label="Imagen al compartir" />
          <CheckField register={register} name="meta.noindex" label="Pedir a Google que NO indexe" />
        </div>
      </details>
    </div>
  )
}
