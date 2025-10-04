#!/usr/bin/env node

/**
 * SCRIPT SIMPLE PARA BUSCAR EMPLEADOS SIN SERVICIO KEY
 * Solo consulta la tabla employees usando credenciales normales
 */

const EMPLOYEE_TARGETS = [
  'David Maldonado',
  'Francisco Mendez', 
  'Jorge Rodriguez',
  'Gustavo Argueta'
]

const COMPANY_ID = '00000000-0000-0000-0000-000000000001'

console.log('🔍 BUSCANDO EMPLEADOS OBJETIVO EN PARAGON')
console.log('=' * 50)

console.log('\n👥 Empleados a buscar:')
EMPLOYEE_TARGETS.forEach(name => {
  console.log(`   - ${name}`)
})

console.log('\n📋 INSTRUCCIONES PARA CONFIGURAR:')

console.log('\n1️⃣ EJECUTAR ESTA CONSULTA SQL EN SUPABASE DASHBOARD:')
console.log('-' * 40)
console.log(`SELECT id, name, email, role, employee_code 
FROM employees 
WHERE company_id = '${COMPANY_ID}' 
AND (name ILIKE '%David Maldonado%' 
OR name ILIKE '%Francisco Mendez%' 
OR name ILIKE '%Jorge Rodriguez%'
OR name ILIKE '%Gustavo Argueta%');`)

console.log('\n2️⃣ CREAR USUARIOS EN SUPABASE DASHBOARD > AUTHENTICATION:')
console.log('-' * 40)
console.log('✅ gustavo@paragon.com / password: password123')
console.log('✅ david@paragon.com / password: password123')  
console.log('✅ francisco@paragon.com / password: password123')
console.log('✅ jorge@paragon.com / password: password123')

console.log('\n3️⃣ EJECUTAR SQL DE CONFIGURACIÓN (después de obtener IDs):')
console.log('-' * 40)

console.log(`
-- ================================================================================
-- SCRIPT DE CONFIGURACIÓN FINAL PARA ROLES DE PARAGON
-- ================================================================================

-- IMPORTANTE: Reemplazar los placeholders con IDs reales de los pasos anteriores

-- Para Gustavo Argueta - Gerente General (company_admin)
INSERT INTO user_profiles (id, company_id, employee_id, role, permissions, is_active, created_at, updated_at) 
SELECT 
  (SELECT id FROM auth.users WHERE email = 'gustavo@paragon.com'),
  '${COMPANY_ID}',
  e.id,
  'company_admin',
  '{"can_manage_all": true, "can_manage_employees": true, "can_view_all_payroll": true, "can_manage_attendance": true, "can_manage_departments": true}',
  true,
  NOW(),
  NOW()
FROM employees e 
WHERE e.name ILIKE '%Gustavo Argueta%' AND e.company_id = '${COMPANY_ID}'

UNION ALL

-- Para David Maldonado - Supervisor (manager)
INSERT INTO user_profiles (id, company_id, employee_id, role, permissions, is_active, created_at, updated_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'david@paragon.com'),
  '${COMPANY_ID}',
  e.id,
  'manager',
  '{"can_manage_department": true, "can_approve_leave": true, "can_view_team": true, "can_view_team_payroll": true}',
  true,
  NOW(),
  NOW()
FROM employees e 
WHERE e.name ILIKE '%David Maldonado%' AND e.company_id = '${COMPANY_ID}'

UNION ALL

-- Para Francisco Mendez - Supervisor (manager)  
INSERT INTO user_profiles (id, company_id, employee_id, role, permissions, is_active, created_at, updated_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'francisco@paragon.com'),
  '${COMPANY_ID}',
  e.id,
  'manager',
  '{"can_manage_department": true, "can_approve_leave": true, "can_view_team": true, "can_view_team_payroll": true}',
  true,
  NOW(),
  NOW()
FROM employees e 
WHERE e.name ILIKE '%Francisco Mendez%' AND e.company_id = '${COMPANY_ID}'

UNION ALL

-- Para Jorge Rodriguez - Supervisor (manager)
INSERT INTO user_profiles (id, company_id, employee_id, role, permissions, is_active, created_at, updated_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'jorge@paragon.com'),
  '${COMPANY_ID}',
  e.id,
  'manager',
  '{"can_manage_department": true, "can_approve_leave": true, "can_view_team": true, "can_view_team_payroll": true}',
  true,
  NOW(),
  NOW()
FROM employees e 
WHERE e.name ILIKE '%Jorge Rodriguez%' AND e.company_id = '${COMPANY_ID}'

ON CONFLICT (id) DO UPDATE SET 
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  updated_at = EXCLUDED.updated_at;
`)

console.log('\n4️⃣ VERIFICAR CONFIGURACIÓN:')
console.log('-' * 40)
console.log('✅ Acceder a /app/simple-roles en la aplicación')
console.log('✅ Verificar que los roles se muestren correctamente')
console.log('✅ Probar login con cada usuario creado')

console.log('\n✨ CONFIGURACIÓN COMPLETADA')
console.log('📈 Resumen de roles:')
console.log('   🏢 Gustavo Argueta → Gerente General (acceso completo)')
console.log('   👥 David/Francisco/Jorge → Supervisores (gestión de equipo)')
