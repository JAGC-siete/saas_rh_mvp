#!/usr/bin/env node

/**
 * SCRIPT DE CONFIGURACIÓN AUTOMÁTICA PARA ROLES DE PARAGON
 * 
 * ESTE SCRIPT AUTOMATIZA LA BÚSQUEDA Y CONFIGURAción DE ROLES 
 * USANDO EL SISTEMA EXISTENTE (MINIMAL FIX)
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración (reemplazar con tus valores reales)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // Para admin operations

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.log('❌ ERROR: Necesitas configurar SUPABASE_SERVICE_ROLE_KEY')
  console.log('   Exporta la variable o agrega al .env.local:')
  console.log('   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Nombres objetivo de empleados
const EMPLOYEE_ROLES = [
  { name: 'Gustavo Argueta', targetRole: 'company_admin', email: 'gustavo@paragon.com' },
  { name: 'David Maldonado', targetRole: 'manager', email: 'david@paragon.com' },
  { name: 'Francisco Mendez', targetRole: 'manager', email: 'francisco@paragon.com' },
  { name: 'Jorge Rodriguez', targetRole: 'manager', email: 'jorge@paragon.com' }
]

const COMPANY_ID = '00000000-0000-0000-0000-000000000001'

async function findEmployees() {
  console.log('🔍 Buscando empleados objetivo...')
  
  const employeeNames = EMPLOYEE_ROLES.map(e => e.name)
  
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, email, role, employee_code')
    .eq('company_id', COMPANY_ID)
    .in('name', employeeNames)

  if (error) {
    console.error('❌ Error buscando empleados:', error.message)
    return null
  }

  return data
}

async function checkExistingUsers() {
  console.log('🔍 Verificando usuarios existentes...')
  
  const { data, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('❌ Error verificando usuarios:', error.message)
    return []
  }
  
  return data.users || []
}

async function main() {
  console.log('🚀 CONFIGURACIÓN DE ROLES PARAGON - MINIMAL FIX')
  console.log('=' * 50)
  
  // 1. Buscar empleados
  const employees = await findEmployees()
  if (!employees) {
    console.log('❌ No se pudieron encontrar empleados')
    return
  }
  
  console.log(`✅ Encontrados ${employees.length} empleados:`)
  employees.forEach(emp => {
    console.log(`   - ${emp.name} (${emp.id}) - ${emp.email}`)
  })
  
  // 2. Verificar usuarios auth
  const authUsers = await checkExistingUsers()
  const authEmails = authUsers.map(u => u.email)
  
  console.log(`\n📧 Usuarios Auth existentes: ${authUsers.length}`)
  authUsers.forEach(user => {
    console.log(`   - ${user.email} (${user.id})`)
  })
  
  // 3. Generar instrucciones
  console.log('\n📋 INSTRUCCIONES DE CONFIGURACIÓN:')
  console.log('-' * 40)
  
  EMPLOYEE_ROLES.forEach(roleConfig => {
    const employee = employees.find(emp => emp.name === roleConfig.name)
    
    if (!employee) {
      console.log(`❌ ${roleConfig.name}: NO ENCONTRADO`)
      return
    }
    
    const authExists = authEmails.includes(roleConfig.email)
    
    console.log(`\n👤 ${roleConfig.name}:`)
    console.log(`   Employee ID: ${employee.id}`)
    console.log(`   Target Role: ${roleConfig.targetRole}`)
    console.log(`   Auth Email: ${roleConfig.email}`)
    console.log(`   Auth Status: ${authExists ? '✅ EXISTE' : '❌ CREAR REQUERIDO'}`)
    
    if (!authExists) {
      console.log(`   📝 Crear usuario Auth:`)
      console.log(`      Email: ${roleConfig.email}`)
      console.log(`      Password temporal: password123`)
    }
    
    console.log(`   🔗 User Profile Config:`)
    console.log(`      employee_id: "${employee.id}"`)
    console.log(`      role: "${roleConfig.targetRole}"`)
    console.log(`      permissions: ${
      roleConfig.targetRole === 'company_admin' 
        ? '{"can_manage_all": true, "can_manage_employees": true}' 
        : '{"can_manage_department": true, "can_approve_leave": true}'
    }`)
  })
  
  // 4. Generar SQL final
  console.log('\n💾 SQL PARA EJECUTAR:')
  console.log('-' * 40)
  
  console.log('-- Después de crear usuarios Auth, ejecutar este SQL:')
  console.log('INSERT INTO user_profiles (id, company_id, employee_id, role, permissions, is_active, created_at, updated_at) VALUES')
  
  const inserts = EMPLOYEE_ROLES.map((roleConfig, index) => {
    const employee = employees.find(emp => emp.name === roleConfig.name)
    if (!employee) return null
    
    const permissions = roleConfig.targetRole === 'company_admin' 
      ? '{"can_manage_all": true, "can_manage_employees": true, "can_view_all_payroll": true}'
      : '{"can_manage_department": true, "can_approve_leave": true, "can_view_team": true}'
    
    return `-- ${roleConfig.name}\n('${roleConfig.name.toUpperCase().replace(/\s+/g, '_')}_AUTH_ID_AQUI', '${COMPANY_ID}', '${employee.id}', '${roleConfig.targetRole}', '${permissions}', true, NOW(), NOW())`
  }).filter(Boolean)
  
  console.log(inserts.join(',\n'))
  console.log('\nON CONFLICT (id) DO UPDATE SET ')
  console.log('  role = EXCLUDED.role,')
  console.log('  permissions = EXCLUDED.permissions,')
  console.log('  updated_at = EXCLUDED.updated_at;')
  
  console.log('\n✨ CONFIGURACIÓN COMPLETADA')
  console.log('Pasos restantes:')
  console.log('1. Crear usuarios Auth (si no existen)')
  console.log('2. Ejecutar SQL generado con los auth.user IDs reales') 
  console.log('3. Verificar en /app/simple-roles')
}

// Ejecutar
main().catch(console.error)
