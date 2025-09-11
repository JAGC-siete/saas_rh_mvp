#!/usr/bin/env node

/**
 * Complete End-to-End trace for Jorge's authentication flow
 * This simulates the entire user journey from login to dashboard access
 */

const fetch = require('node-fetch')
require('dotenv').config()

async function e2eTraceComplete() {
  console.log('🔍 COMPLETE E2E TRACE - Jorge Authentication Flow')
  console.log('=' .repeat(60))
  
  try {
    // STEP 1: Verify Jorge's profile exists in database
    console.log('\n📊 STEP 1: Verifying Jorge\'s profile in database...')
    const { createClient } = require('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        employees(name, email, role, status),
        companies(name, is_active)
      `)
      .eq('id', '8c49be71-c48f-4fee-9935-44a168eb2dfe')
      .single()
    
    if (profileError) {
      console.error('❌ Database profile check failed:', profileError)
      return
    }
    
    console.log('✅ Database profile found:')
    console.log('  - ID:', profile.id)
    console.log('  - Role:', profile.role)
    console.log('  - Company:', profile.companies?.name)
    console.log('  - Employee:', profile.employees?.name)
    console.log('  - Active:', profile.is_active)
    
    // STEP 2: Test login API
    console.log('\n🔐 STEP 2: Testing login API...')
    const loginResponse = await fetch('https://humanosisu.net/api/auth/login-supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'jorge7gomez@gmail.com', 
        password: 'jorge123456' 
      })
    })
    
    console.log('  - Status:', loginResponse.status)
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json()
      console.error('❌ Login API failed:', errorData)
      return
    }
    
    const loginData = await loginResponse.json()
    console.log('✅ Login API successful:')
    console.log('  - User ID:', loginData.user.id)
    console.log('  - Email:', loginData.user.email)
    console.log('  - Name:', loginData.user.name)
    console.log('  - Role:', loginData.user.role)
    console.log('  - Company ID:', loginData.user.company_id)
    console.log('  - Has Company ID:', !!loginData.user.company_id)
    
    // STEP 3: Test login page logic simulation
    console.log('\n🧠 STEP 3: Simulating login page logic...')
    if (!loginData.user.company_id) {
      console.log('❌ Would redirect to /onboarding (WRONG!)')
    } else {
      console.log('✅ Would redirect to /app/dashboard (CORRECT!)')
    }
    
    // STEP 4: Test cookies and session
    console.log('\n🍪 STEP 4: Testing cookies and session...')
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'] || []
    console.log('  - Cookies received:', setCookieHeaders.length)
    setCookieHeaders.forEach((cookie, index) => {
      const cookieName = cookie.split('=')[0]
      console.log(`  - Cookie ${index + 1}: ${cookieName}`)
    })
    
    // STEP 5: Test middleware authentication
    console.log('\n🛡️  STEP 5: Testing middleware authentication...')
    const dashboardResponse = await fetch('https://humanosisu.net/app/dashboard', {
      method: 'GET',
      headers: {
        'Cookie': setCookieHeaders.join('; '),
        'User-Agent': 'E2E-Test/1.0'
      }
    })
    
    console.log('  - Dashboard status:', dashboardResponse.status)
    console.log('  - Content-Type:', dashboardResponse.headers.get('content-type'))
    
    if (dashboardResponse.status === 302) {
      const location = dashboardResponse.headers.get('location')
      console.log('❌ Redirected to:', location)
    } else if (dashboardResponse.status === 200) {
      console.log('✅ Dashboard access successful!')
      
      // Check if it's actually the dashboard page
      const responseText = await dashboardResponse.text()
      if (responseText.includes('dashboard') || responseText.includes('Dashboard')) {
        console.log('✅ Dashboard content confirmed')
      } else {
        console.log('⚠️  Dashboard content unclear')
      }
    } else {
      console.log('❌ Dashboard access failed')
      const responseText = await dashboardResponse.text()
      console.log('  - Response preview:', responseText.substring(0, 200))
    }
    
    // STEP 6: Test protected routes
    console.log('\n🔒 STEP 6: Testing other protected routes...')
    const protectedRoutes = [
      '/app/employees',
      '/app/payroll',
      '/app/reports'
    ]
    
    for (const route of protectedRoutes) {
      const routeResponse = await fetch(`https://humanosisu.net${route}`, {
        method: 'GET',
        headers: {
          'Cookie': setCookieHeaders.join('; '),
          'User-Agent': 'E2E-Test/1.0'
        }
      })
      
      console.log(`  - ${route}: ${routeResponse.status}`)
    }
    
    // STEP 7: Test logout simulation
    console.log('\n🚪 STEP 7: Testing logout simulation...')
    const logoutResponse = await fetch('https://humanosisu.net/api/auth/logout', {
      method: 'POST',
      headers: {
        'Cookie': setCookieHeaders.join('; '),
        'Content-Type': 'application/json'
      }
    })
    
    console.log('  - Logout status:', logoutResponse.status)
    
    // STEP 8: Test access after logout
    console.log('\n🔐 STEP 8: Testing access after logout...')
    const postLogoutResponse = await fetch('https://humanosisu.net/app/dashboard', {
      method: 'GET',
      headers: {
        'User-Agent': 'E2E-Test/1.0'
      }
    })
    
    console.log('  - Post-logout status:', postLogoutResponse.status)
    if (postLogoutResponse.status === 302) {
      const location = postLogoutResponse.headers.get('location')
      console.log('  - Redirected to:', location)
    }
    
    // FINAL SUMMARY
    console.log('\n' + '=' .repeat(60))
    console.log('📋 E2E TRACE SUMMARY')
    console.log('=' .repeat(60))
    
    const summary = {
      'Database Profile': profile ? '✅ EXISTS' : '❌ MISSING',
      'Login API': loginResponse.ok ? '✅ WORKING' : '❌ FAILED',
      'Company ID Present': loginData.user?.company_id ? '✅ YES' : '❌ NO',
      'Login Logic': loginData.user?.company_id ? '✅ DASHBOARD' : '❌ ONBOARDING',
      'Cookies Set': setCookieHeaders.length > 0 ? '✅ YES' : '❌ NO',
      'Middleware Auth': dashboardResponse.status === 200 ? '✅ WORKING' : '❌ FAILED',
      'Dashboard Access': dashboardResponse.status === 200 ? '✅ SUCCESS' : '❌ FAILED'
    }
    
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })
    
    const allWorking = Object.values(summary).every(status => status.includes('✅'))
    
    if (allWorking) {
      console.log('\n🎉 ALL SYSTEMS WORKING! Jorge should be able to login successfully.')
    } else {
      console.log('\n⚠️  SOME ISSUES DETECTED. Check the summary above.')
    }
    
  } catch (error) {
    console.error('❌ E2E Trace failed:', error)
  }
}

// Run the complete trace
e2eTraceComplete()
  .then(() => {
    console.log('\n✨ E2E Trace completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ E2E Trace failed:', error)
    process.exit(1)
  })
