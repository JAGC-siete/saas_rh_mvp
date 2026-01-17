import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { withRateLimit } from '../../../lib/security/rate-limiting'
import { sendAffiliateQuestionnaireEmail } from '../../../lib/emails/affiliate-questionnaire'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL and service role key are required.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export default withRateLimit('general')(handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { email, source } = req.body

  // Validar email
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'El email es requerido.' })
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Formato de email inválido.' })
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    // Verificar si el email ya existe en affiliate_requests
    const { data: existing } = await supabaseAdmin
      .from('affiliate_requests')
      .select('id, status')
      .eq('email', normalizedEmail)
      .single()

    // Si ya existe y está aprobado, retornar éxito (no exponer que existe)
    if (existing && existing.status === 'approved') {
      return res.status(200).json({ 
        success: true, 
        message: 'Gracias por tu interés. Revisa tu correo para completar tu solicitud.' 
      })
    }

    // Si existe pero está pendiente, generar nuevo token y actualizar
    let confirmationToken
    let attempts = 0
    const maxAttempts = 10

    do {
      confirmationToken = randomBytes(16).toString('hex')
      attempts++

      // Verificar que el token no existe (muy poco probable pero por seguridad)
      const { data: tokenExists } = await supabaseAdmin
        .from('affiliate_requests')
        .select('id')
        .eq('confirmation_token', confirmationToken)
        .single()

      if (!tokenExists) break
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      console.error('Error generando token único después de múltiples intentos')
      return res.status(500).json({ error: 'Error interno del servidor.' })
    }

    // Si existe registro previo, actualizar; si no, crear nuevo
    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from('affiliate_requests')
        .update({
          confirmation_token: confirmationToken,
          status: 'pending_email_confirmation',
          source: source || 'landing',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Error actualizando solicitud de afiliado:', updateError)
        return res.status(500).json({ error: 'Error procesando tu solicitud.' })
      }
    } else {
      // Crear nuevo registro
      const { error: insertError } = await supabaseAdmin
        .from('affiliate_requests')
        .insert({
          email: normalizedEmail,
          confirmation_token: confirmationToken,
          status: 'pending_email_confirmation',
          source: source || 'landing',
        })

      if (insertError) {
        // Si es error de duplicado, retornar éxito (no exponer)
        if (insertError.code === '23505') {
          return res.status(200).json({ 
            success: true, 
            message: 'Gracias por tu interés. Revisa tu correo para completar tu solicitud.' 
          })
        }
        console.error('Error creando solicitud de afiliado:', insertError)
        return res.status(500).json({ error: 'Error procesando tu solicitud.' })
      }
    }

    // Enviar email con cuestionario
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      const questionnaireUrl = `${siteUrl}/afiliados/questionnaire?token=${confirmationToken}`
      
      await sendAffiliateQuestionnaireEmail({
        to: normalizedEmail,
        questionnaireUrl,
      })
    } catch (emailError) {
      console.warn('Error enviando email de cuestionario:', emailError)
      // No fallar la request si el email falla, pero loguear
    }

    // Retornar éxito siempre (por seguridad, no exponer si email existe)
    return res.status(200).json({ 
      success: true, 
      message: 'Gracias por tu interés. Revisa tu correo para completar tu solicitud de afiliación.' 
    })
  } catch (error: any) {
    console.error('Error en solicitud de afiliado:', error)
    return res.status(500).json({ error: 'Error procesando tu solicitud.' })
  }
}








