/**
 * Client helpers for field mobile WebAuthn + geolocation.
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'

export type FieldGeoFix = {
  lat: number
  lon: number
  accuracy_m: number
  geo_ts: number
}

export type FieldCapability =
  | { ok: true; webauthn: true; platformAuthenticator: boolean }
  | { ok: false; code: 'WEBAUTHN_UNSUPPORTED' | 'INSECURE_CONTEXT'; message: string }

export async function checkFieldDeviceCapability(): Promise<FieldCapability> {
  if (typeof window === 'undefined') {
    return {
      ok: false,
      code: 'WEBAUTHN_UNSUPPORTED',
      message: 'Entorno no compatible.',
    }
  }

  if (!window.isSecureContext && location.hostname !== 'localhost') {
    return {
      ok: false,
      code: 'INSECURE_CONTEXT',
      message: 'Se requiere HTTPS para biometría del dispositivo.',
    }
  }

  if (!browserSupportsWebAuthn()) {
    return {
      ok: false,
      code: 'WEBAUTHN_UNSUPPORTED',
      message: 'Este dispositivo no soporta biometría WebAuthn (Face ID / huella).',
    }
  }

  let platformAuthenticator = false
  try {
    platformAuthenticator = await platformAuthenticatorIsAvailable()
  } catch {
    platformAuthenticator = false
  }

  return { ok: true, webauthn: true, platformAuthenticator }
}

export function captureFieldGeolocation(timeoutMs = 20_000): Promise<FieldGeoFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(Object.assign(new Error('GPS no disponible en este dispositivo'), { code: 'GEO_UNAVAILABLE' }))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
          geo_ts: pos.timestamp || Date.now(),
        })
      },
      (err) => {
        const code =
          err.code === err.PERMISSION_DENIED
            ? 'GEO_DENIED'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'GEO_UNAVAILABLE'
              : 'GEO_TIMEOUT'
        reject(Object.assign(new Error(err.message || 'No se pudo obtener ubicación'), { code }))
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 15_000,
      }
    )
  })
}

export async function runWebAuthnEnroll(
  options: PublicKeyCredentialCreationOptionsJSON
) {
  return startRegistration({ optionsJSON: options })
}

export async function runWebAuthnAssert(
  options: PublicKeyCredentialRequestOptionsJSON
) {
  return startAuthentication({ optionsJSON: options })
}

export function fieldErrorMessage(code?: string, fallback?: string): string {
  switch (code) {
    case 'WEBAUTHN_UNSUPPORTED':
      return 'Este teléfono no soporta biometría nativa para asistencia.'
    case 'INSECURE_CONTEXT':
      return 'Abre esta página con HTTPS para usar Face ID / huella.'
    case 'GEO_DENIED':
      return 'Permiso de ubicación denegado. Actívalo en ajustes del navegador.'
    case 'GEO_UNAVAILABLE':
      return 'GPS no disponible. Activa la ubicación e intenta de nuevo.'
    case 'GEO_TIMEOUT':
      return 'Tiempo agotado al obtener GPS. Intenta en un área abierta.'
    case 'GEO_ACCURACY':
      return 'GPS poco preciso. Muévete a un área abierta.'
    case 'GEO_STALE':
      return 'Ubicación desactualizada. Vuelve a intentar.'
    case 'GEOFENCE_FAILED':
      return 'Estás fuera de la zona autorizada.'
    case 'WEBAUTHN_REJECTED':
      return 'Biometría rechazada o cancelada.'
    case 'WEBAUTHN_NOT_ENROLLED':
      return 'Vincula este dispositivo con biometría primero.'
    case 'ENROLL_TOKEN_REQUIRED':
      return 'Se requiere un token de vinculación emitido por RR.HH.'
    case 'ENROLL_TOKEN_INVALID':
      return 'Token de vinculación inválido o ya usado.'
    case 'ENROLL_TOKEN_EXPIRED':
      return 'Token expirado. Solicita uno nuevo a RR.HH.'
    case 'CREDENTIAL_LIMIT':
      return 'Ya hay un dispositivo vinculado. RR.HH. debe revocar el anterior.'
    case 'WEBAUTHN_SYNCED_PASSKEY':
      return 'Usa Face ID / huella de este teléfono (no passkey en la nube).'
    case 'WEBAUTHN_CLONE_SUSPECTED':
      return 'Credencial inválida. Contacte a RR.HH. para re-vincular.'
    case 'WEBAUTHN_CHALLENGE_EXPIRED':
      return 'La sesión biométrica expiró. Intenta de nuevo.'
    case 'DAY_COMPLETE':
      return 'Ya registraste entrada y salida hoy.'
    default:
      return fallback || 'No se pudo completar el registro.'
  }
}
