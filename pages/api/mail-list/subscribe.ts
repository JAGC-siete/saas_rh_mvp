import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { withRateLimit } from '../../../lib/security/rate-limiting'
import { sendMailListConfirmationEmail } from '../../../lib/emails/mail-list-confirmation'

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
    // Verificar si el email ya existe
    const { data: existing } = await supabaseAdmin
      .from('mail_list_subscriptions')
      .select('id, status')
      .eq('email', normalizedEmail)
      .single()

    // Si ya existe y está confirmado, retornar éxito (no exponer que existe)
    if (existing && existing.status === 'confirmed') {
      return res.status(200).json({ 
        success: true, 
        message: 'Gracias por tu interés. Revisa tu correo para confirmar tu suscripción.' 
      })
    }

    // Si existe pero está pendiente o unsubscribed, generar nuevo token y actualizar
    let confirmationToken
    let attempts = 0
    const maxAttempts = 10

    do {
      confirmationToken = randomBytes(16).toString('hex')
      attempts++

      // Verificar que el token no existe (muy poco probable pero por seguridad)
      const { data: tokenExists } = await supabaseAdmin
        .from('mail_list_subscriptions')
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
        .from('mail_list_subscriptions')
        .update({
          confirmation_token: confirmationToken,
          status: 'pending',
          source: source || 'landing',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Error actualizando suscripción:', updateError)
        return res.status(500).json({ error: 'Error procesando tu solicitud.' })
      }
    } else {
      // Crear nuevo registro
      const { error: insertError } = await supabaseAdmin
        .from('mail_list_subscriptions')
        .insert({
          email: normalizedEmail,
          confirmation_token: confirmationToken,
          status: 'pending',
          source: source || 'landing',
        })

      if (insertError) {
        // Si es error de duplicado, retornar éxito (no exponer)
        if (insertError.code === '23505') {
          return res.status(200).json({ 
            success: true, 
            message: 'Gracias por tu interés. Revisa tu correo para confirmar tu suscripción.' 
          })
        }
        console.error('Error creando suscripción:', insertError)
        return res.status(500).json({ error: 'Error procesando tu solicitud.' })
      }
    }

    // Enviar email de confirmación
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      const confirmUrl = `${siteUrl}/api/mail-list/confirm?token=${confirmationToken}`
      
      await sendMailListConfirmationEmail({
        to: normalizedEmail,
        confirmUrl,
      })
    } catch (emailError) {
      console.warn('Error enviando email de confirmación:', emailError)
      // No fallar la request si el email falla, pero loguear
    }

    // Retornar éxito siempre (por seguridad, no exponer si email existe)
    return res.status(200).json({ 
      success: true, 
      message: 'Gracias por tu interés. Revisa tu correo para confirmar tu suscripción.' 
    })
  } catch (error: any) {
    console.error('Error en suscripción a lista de correo:', error)
    return res.status(500).json({ error: 'Error procesando tu solicitud.' })
  }
}

