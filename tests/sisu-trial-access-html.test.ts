import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSisuTrialAccessEmailHtml,
  getSisuTrialAccessEmailSubject,
  SISU_TRIAL_WARNING_TEXT,
} from '../lib/emails/sisu-trial-access-html'

describe('sisu-trial-access-html', () => {
  it('trial_welcome uses bienvenida title and credentials', () => {
    const html = buildSisuTrialAccessEmailHtml({
      variant: 'trial_welcome',
      nombre: 'Delia',
      email: 'gerencia@example.com',
      password: 'SISU117846',
      loginUrl: 'https://humanosisu.net/app/login',
    })

    assert.ok(html.includes('Delia, te damos la bienvenida a SISU'))
    assert.ok(html.includes('Credenciales seguras'))
    assert.ok(html.includes('gerencia@example.com'))
    assert.ok(html.includes('SISU117846'))
    assert.ok(html.includes('Entrar al panel'))
    assert.ok(html.includes(SISU_TRIAL_WARNING_TEXT))
    assert.ok(html.includes('biométrico'))
    assert.ok(!html.includes('te invitamos a SISU'))
  })

  it('lead_invite uses invitamos title, activar CTA, no credentials', () => {
    const html = buildSisuTrialAccessEmailHtml({
      variant: 'lead_invite',
      nombre: 'Delia',
      activarUrl: 'https://humanosisu.net/activar',
      unsubscribeUrl: 'https://humanosisu.net/api/mail-list/unsubscribe?token=abc',
    })

    assert.ok(html.includes('Delia, te invitamos a SISU'))
    assert.ok(html.includes('Activar mi acceso gratuito'))
    assert.ok(html.includes('https://humanosisu.net/activar'))
    assert.ok(html.includes('Descubrí SISU'))
    assert.ok(html.includes(SISU_TRIAL_WARNING_TEXT))
    assert.ok(!html.includes('Credenciales seguras'))
    assert.ok(!html.includes('Contraseña temporal'))
    assert.ok(html.includes('La serie contiene únicamente 5 correos'))
    assert.ok(!html.includes('Darte de baja de estos correos'))
  })

  it('warning text no longer mentions cambiar contraseña', () => {
    assert.ok(!SISU_TRIAL_WARNING_TEXT.includes('cambia la contraseña'))
    assert.ok(SISU_TRIAL_WARNING_TEXT.includes('biométrico'))
  })

  it('subjects differ by variant', () => {
    assert.ok(
      getSisuTrialAccessEmailSubject({ variant: 'lead_invite' }).includes('invitamos')
    )
    assert.ok(
      getSisuTrialAccessEmailSubject({ variant: 'trial_welcome', empresa: 'Acme' }).includes('Acme')
    )
  })
})
