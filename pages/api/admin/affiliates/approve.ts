import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { randomBytes, randomInt } from 'crypto'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { sendAffiliateCredentialsEmail } from '../../../../lib/emails/affiliate-credentials'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL and service role key are required.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

// Función para generar contraseña segura
function generateSecurePassword(): string {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  
  return Array.from({ length }, () => {
    const randomIndex = randomInt(0, charset.length)
    return charset[randomIndex]
  }).join('')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Verificar que es super admin
    await requireSuperAdmin(req, res)

    const { request_id } = req.body

    if (!request_id) {
      return res.status(400).json({ error: 'ID de solicitud requerido.' })
    }

    // Buscar solicitud
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('affiliate_requests')
      .select('*')
      .eq('id', request_id)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' })
    }

    // Validar que está en estado correcto
    if (request.status !== 'pending_approval') {
      return res.status(400).json({ 
        error: `La solicitud no puede ser aprobada. Estado actual: ${request.status}` 
      })
    }

    // Validar que términos fueron aceptados
    if (!request.terms_accepted) {
      return res.status(400).json({ error: 'La solicitud no tiene términos aceptados.' })
    }

    // Generar contraseña automática
    const generatedPassword = generateSecurePassword()

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: request.email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: request.questionnaire_data?.full_name || request.email.split('@')[0],
        affiliate_request_id: request.id
      }
    })

    if (authError || !authData.user) {
      console.error('Error creando usuario:', authError)
      return res.status(500).json({ error: 'Error creando usuario de autenticación.' })
    }

    const userId = authData.user.id

    // Crear perfil de usuario
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email: request.email,
        role: 'affiliate',
        is_b2c: true
      })

    if (profileError) {
      // Rollback: eliminar usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(userId)
      console.error('Error creando perfil:', profileError)
      return res.status(500).json({ error: 'Error creando perfil de usuario.' })
    }

    // Generar código de referido único
    let referralCode
    let affiliateError
    let attempts = 0
    const maxAttempts = 10

    do {
      referralCode = randomBytes(4).toString('hex')
      const { error } = await supabaseAdmin
        .from('affiliates')
        .insert({
          user_id: userId,
          referral_code: referralCode,
          status: 'approved',
          affiliate_request_id: request.id
        })

      affiliateError = error
      attempts++

      if (!affiliateError) break

      if (affiliateError.code !== '23505') { // Not unique violation
        // Rollback: eliminar perfil y usuario
        await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        throw affiliateError
      }
    } while (attempts < maxAttempts)

    if (affiliateError) {
      // Rollback: eliminar perfil y usuario
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return res.status(500).json({ error: 'Error creando registro de afiliado.' })
    }

    // Obtener el affiliate_id recién creado
    const { data: affiliate } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .single()

    // Actualizar affiliate_request con user_id y affiliate_id
    const { error: updateError } = await supabaseAdmin
      .from('affiliate_requests')
      .update({
        user_id: userId,
        affiliate_id: affiliate?.id,
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)

    if (updateError) {
      console.error('Error actualizando affiliate_request:', updateError)
      // No fallar aquí, ya se creó el usuario y afiliado
    }

    // Enviar email con credenciales
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      await sendAffiliateCredentialsEmail({
        to: request.email,
        email: request.email,
        password: generatedPassword,
        referralCode: referralCode,
        loginUrl: `${siteUrl}/auth/login`
      })
    } catch (emailError) {
      console.warn('Error enviando email de credenciales:', emailError)
      // No fallar la request si el email falla, pero loguear
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Solicitud aprobada exitosamente. Se ha enviado un email con las credenciales.',
      affiliate_id: affiliate?.id,
      user_id: userId
    })
  } catch (error: any) {
    console.error('Error aprobando solicitud de afiliado:', error)
    return res.status(500).json({ error: error.message || 'Error procesando la aprobación.' })
  }
}

