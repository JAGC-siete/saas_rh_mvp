import React from 'react'
import Link from 'next/link'
import { Breadcrumb } from '../../lib/seo/breadcrumbs'
import SchemaMarkup from './SchemaMarkup'
import { generateBreadcrumbListSchema } from '../../lib/seo/schema'

interface BreadcrumbsProps {
  items: Breadcrumb[]
  showSchema?: boolean
}

/**
 * Breadcrumb navigation component with Schema.org markup
 */
export default function Breadcrumbs({ items, showSchema = true }: BreadcrumbsProps) {
  const schema = showSchema
    ? generateBreadcrumbListSchema(
        items.map(item => ({ name: item.name, url: item.url }))
      )
    : null

  return (
    <>
      {schema && <SchemaMarkup schema={schema} />}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center space-x-2 text-sm text-gray-400">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            
            return (
              <li key={item.url} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-gray-500">/</span>
                )}
                {isLast ? (
                  <span className="text-white font-medium" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.url}
                    className="hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}

