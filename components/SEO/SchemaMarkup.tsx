import React from 'react'

interface SchemaMarkupProps {
  schema: object | object[]
}

/**
 * Component to inject Schema.org JSON-LD markup
 */
export default function SchemaMarkup({ schema }: SchemaMarkupProps) {
  const schemas = Array.isArray(schema) ? schema : [schema]

  return (
    <>
      {schemas.map((s, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s, null, 0) }}
        />
      ))}
    </>
  )
}

