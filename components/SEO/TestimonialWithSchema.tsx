import React from 'react'
import SchemaMarkup from './SchemaMarkup'
import { generateReviewSchema } from '../../lib/seo/schema'

interface Testimonial {
  name: string
  company?: string
  quote: string
  rating: number
  datePublished?: string
}

interface TestimonialWithSchemaProps {
  testimonial: Testimonial
  productName?: string
  showSchema?: boolean
  className?: string
}

export default function TestimonialWithSchema({
  testimonial,
  productName = 'Humano SISU',
  showSchema = true,
  className = ''
}: TestimonialWithSchemaProps) {
  const reviewSchema = showSchema
    ? generateReviewSchema({
        productName,
        authorName: testimonial.name,
        rating: testimonial.rating,
        reviewText: testimonial.quote,
        datePublished: testimonial.datePublished
      })
    : null

  return (
    <>
      {reviewSchema && <SchemaMarkup schema={reviewSchema} />}
      <div className={`bg-white/5 border border-white/10 rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold">
            {testimonial.name[0]}
          </div>
          <div>
            <p className="text-white font-medium">{testimonial.name}</p>
            {testimonial.company && (
              <p className="text-brand-200/80 text-sm">{testimonial.company}</p>
            )}
          </div>
        </div>
        <div className="mb-2">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`text-lg ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-600'}`}
            >
              ★
            </span>
          ))}
        </div>
        <blockquote className="text-brand-200/90 italic">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
      </div>
    </>
  )
}

