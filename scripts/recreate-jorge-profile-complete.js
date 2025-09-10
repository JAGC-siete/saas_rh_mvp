#!/usr/bin/env node

/**
 * Complete script to recreate Jorge's user profile with proper Paragon assignment
 * This will drop the existing profile and recreate it with all correct data
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function recreateJorgeProfile() {
  try {
    console.log('🔄 Starting complete Jorge profile recreation...')
    
    const jorgeAuthId = '8c49be71-c48f-4fee-9935-44a168eb2dfe'
    const paragonCompanyId = '00000000-0000-0000-0000-000000000001'
    const jorgeEmployeeId = '3eb9c0f8-7321-47ab-b33d-9181cbca23bc'
    
    // Step 1: Check current state
    console.log('\n📊 Step 1: Checking current state...')
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', jorgeAuthId)
      .single()
    
    if (currentProfile) {
      console.log('⚠️  Current profile found:', {
        role: currentProfile.role,
        company_id: currentProfile.company_id,
        employee_id: currentProfile.employee_id,
        is_active: currentProfile.is_active
      })
    } else {
      console.log('ℹ️  No current profile found')
    }
    
    // Step 2: Verify Jorge's employee data
    console.log('\n📊 Step 2: Verifying Jorge\'s employee data...')
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'jorge7gomez@gmail.com')
      .single()
    
    if (empError || !employee) {
      console.error('❌ Jorge\'s employee record not found:', empError)
      return
    }
    
    console.log('✅ Employee data found:', {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      company_id: employee.company_id,
      role: employee.role,
      position: employee.position,
      status: employee.status
    })
    
    // Step 3: Verify Paragon company
    console.log('\n📊 Step 3: Verifying Paragon company...')
    const { data: company, error: compError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', paragonCompanyId)
      .single()
    
    if (compError || !company) {
      console.error('❌ Paragon company not found:', compError)
      return
    }
    
    console.log('✅ Company data found:', {
      id: company.id,
      name: company.name,
      is_active: company.is_active
    })
    
    // Step 4: Drop existing profile
    console.log('\n🗑️  Step 4: Dropping existing profile...')
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', jorgeAuthId)
    
    if (deleteError) {
      console.error('❌ Error deleting existing profile:', deleteError)
      return
    }
    
    console.log('✅ Existing profile deleted')
    
    // Step 5: Create new profile with complete data
    console.log('\n🔧 Step 5: Creating new profile with complete data...')
    
    const newProfile = {
      id: jorgeAuthId,
      company_id: paragonCompanyId,
      employee_id: jorgeEmployeeId,
      role: 'hr_manager',
      permissions: {
        can_manage_employees: true,
        can_view_payroll: true,
        can_manage_attendance: true,
        can_manage_departments: true,
        can_view_reports: true,
        can_generate_payroll: true,
        can_export_payroll: true,
        can_view_own_attendance: true,
        can_register_attendance: true,
        can_manage_company_settings: true,
        can_manage_work_schedules: true,
        can_approve_leave_requests: true,
        can_view_audit_logs: true,
        can_manage_gamification: true
      },
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: createdProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert([newProfile])
      .select(`
        *,
        employees(name, email, role, status),
        companies(name, is_active)
      `)
      .single()
    
    if (createError) {
      console.error('❌ Error creating new profile:', createError)
      return
    }
    
    console.log('✅ New profile created successfully!')
    
    // Step 6: Verify the new profile
    console.log('\n📊 Step 6: Verifying new profile...')
    const { data: verifyProfile } = await supabase
      .from('user_profiles')
      .select(`
        *,
        employees(name, email, role, status),
        companies(name, is_active)
      `)
      .eq('id', jorgeAuthId)
      .single()
    
    if (verifyProfile) {
      console.log('✅ Profile verification successful:', {
        id: verifyProfile.id,
        role: verifyProfile.role,
        company_id: verifyProfile.company_id,
        employee_id: verifyProfile.employee_id,
        is_active: verifyProfile.is_active,
        company_name: verifyProfile.companies?.name,
        employee_name: verifyProfile.employees?.name,
        employee_email: verifyProfile.employees?.email,
        permissions: verifyProfile.permissions
      })
    }
    
    // Step 7: Test login simulation
    console.log('\n🧪 Step 7: Testing login simulation...')
    const { data: loginTest } = await supabase
      .from('user_profiles')
      .select('role, company_id, employee_id, permissions')
      .eq('id', jorgeAuthId)
      .single()
    
    if (loginTest) {
      console.log('✅ Login simulation successful:', {
        role: loginTest.role,
        company_id: loginTest.company_id,
        has_company_id: !!loginTest.company_id,
        should_redirect_to: loginTest.company_id ? 'dashboard' : 'onboarding'
      })
    }
    
    console.log('\n🎉 Jorge\'s profile recreation completed successfully!')
    console.log('\n📋 Summary:')
    console.log('  ✅ User profile recreated')
    console.log('  ✅ Assigned to Paragon Honduras')
    console.log('  ✅ Linked to Jorge\'s employee record')
    console.log('  ✅ HR Manager role with full permissions')
    console.log('  ✅ Ready for login')
    
    console.log('\n🔑 Next steps:')
    console.log('  1. Jorge should go to: https://humanosisu.net/app/login')
    console.log('  2. Login with: jorge7gomez@gmail.com / jorge123456')
    console.log('  3. Should be redirected to dashboard (not create account)')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
recreateJorgeProfile()
  .then(() => {
    console.log('\n✨ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
