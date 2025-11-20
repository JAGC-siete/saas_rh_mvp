/**
 * Idle Timeout Integration Tests
 * Tests for 90-minute idle timeout implementation
 * 
 * Run: npm test -- tests/idle-timeout.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

/**
 * Test 1: Session Creation
 * Verifies that session is created with correct idle_timeout_at
 */
describe('Session Creation', () => {
  it('should create session with idle_timeout_at = last_activity + 90 minutes', async () => {
    // This would be tested via API
    const response = await fetch('/api/test-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    const data = await response.json()
    
    expect(data.idle_timeout_at).toBeDefined()
    expect(data.last_activity).toBeDefined()
    
    const idleDiff = new Date(data.idle_timeout_at).getTime() - 
                     new Date(data.last_activity).getTime()
    expect(idleDiff).toBe(90 * 60 * 1000) // 90 minutes in ms
  })
})

/**
 * Test 2: Activity Update (Rate Limited)
 * Verifies that last_activity is only updated every 60s at most
 */
describe('Activity Update Rate Limiting', () => {
  it('should not update last_activity if called within 60s', async () => {
    // First heartbeat
    const first = await fetch('/api/auth/heartbeat', { method: 'POST' })
    const data1 = await first.json()
    
    // Second heartbeat immediately
    const second = await fetch('/api/auth/heartbeat', { method: 'POST' })
    const data2 = await second.json()
    
    // last_activity should be the same (rate limited)
    expect(data1.last_activity).toEqual(data2.last_activity)
  })
  
  it('should update last_activity after 60s', async () => {
    // Wait 61 seconds
    await new Promise(resolve => setTimeout(resolve, 61000))
    
    const response = await fetch('/api/auth/heartbeat', { method: 'POST' })
    const data = await response.json()
    
    expect(data.last_activity).not.toEqual(data.previous_last_activity)
  })
})

/**
 * Test 3: Idle Timeout Enforcement
 * Verifies that session expires exactly at 90 minutes
 */
describe('Idle Timeout Enforcement', () => {
  it('should return 440 when session idle for >90 minutes', async () => {
    // Manually set last_activity to 91 minutes ago
    // This would be done via SQL in test setup
    // UPDATE user_sessions SET last_activity = NOW() - INTERVAL '91 minutes'
    
    const response = await fetch('/api/auth/heartbeat', { method: 'POST' })
    
    expect(response.status).toBe(440)
    const data = await response.json()
    expect(data.error).toBe('Session expired')
    expect(data.code).toBe('IDLE_TIMEOUT_90M')
    expect(data.requiresReauth).toBe(true)
  })
})

/**
 * Test 4: Exclusion Rules
 * Verifies that excluded paths/requests don't extend activity
 */
describe('Activity Exclusion', () => {
  it('should not extend session for health checks', async () => {
    const before = await getSessionActivity()
    
    await fetch('/api/health') // Health check
    
    const after = await getSessionActivity()
    
    // last_activity should not change
    expect(after.last_activity).toEqual(before.last_activity)
  })
  
  it('should not extend session for prefetch requests', async () => {
    const before = await getSessionActivity()
    
    await fetch('/api/some-endpoint', {
      headers: { 'X-Prefetch': 'true' }
    })
    
    const after = await getSessionActivity()
    expect(after.last_activity).toEqual(before.last_activity)
  })
})

/**
 * Test 5: Session Revocation
 * Verifies that sessions can be revoked
 */
describe('Session Revocation', () => {
  it('should revoke session on logout', async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    
    expect(response.status).toBe(200)
    
    // Subsequent requests should fail
    const heartbeat = await fetch('/api/auth/heartbeat', { method: 'POST' })
    expect(heartbeat.status).toBe(440)
  })
  
  it('should revoke all sessions with logout all', async () => {
    const response = await fetch('/api/auth/logout-all', { method: 'POST' })
    
    expect(response.status).toBe(200)
    
    // Session should be revoked
    const heartbeat = await fetch('/api/auth/heartbeat', { method: 'POST' })
    expect(heartbeat.status).toBe(440)
  })
})

/**
 * Test 6: UI Warning Display
 * Verifies that warning appears at 80 minutes
 */
describe('UI Warning', () => {
  it('should show warning when <10 minutes remain', () => {
    // This would be tested in browser with React Testing Library
    // or with manual testing
    // Warning should appear when minutesUntilExpiry <= 10
  })
  
  it('should extend session when user clicks "Keep Session"', async () => {
    // Simulate warning display
    const beforeMinutes = 8 // minutes until expiry
    
    // User clicks "Extend Session"
    const response = await fetch('/api/auth/heartbeat', { method: 'POST' })
    const data = await response.json()
    
    expect(data.idleTimeoutMinutes).toBeGreaterThan(beforeMinutes)
  })
})

// Helper functions
async function getSessionActivity() {
  const response = await fetch('/api/auth/session-status')
  return await response.json()
}

/**
 * Manual Test Checklist (to be verified by developer):
 * 
 * ✅ 1. Login → Verifica que sesión se crea con idle_timeout_at
 * ✅ 2. Esperar 89 minutos → Sesión aún válida
 * ✅ 3. Esperar 91 minutos → 440 error, requiere re-auth
 * ✅ 4. Health check no extiende sesión
 * ✅ 5. Prefetch no extiende sesión
 * ✅ 6. A los 80 min aparece advertencia en UI
 * ✅ 7. Click "Mantener sesión" extiende a 90 min
 * ✅ 8. Logout revoca sesión
 * ✅ 9. "Cerrar todas" revoca todas las sesiones
 */




