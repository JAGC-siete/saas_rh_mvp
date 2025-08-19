-- 🔧 ARREGLAR EMAIL DE GUSTAVO EN EMPLOYEES
-- Este script actualiza el email de Gustavo para que coincida con su login de Supabase

-- 1. Verificar que Gustavo existe
SELECT 
  id,
  name,
  email,
  role,
  team
FROM employees 
WHERE name ILIKE '%gustavo%';

-- 2. Actualizar el email de Gustavo
UPDATE employees 
SET 
  email = 'gustavo.gnaz@gmail.com',
  updated_at = NOW()
WHERE name ILIKE '%gustavo%';

-- 3. Verificar el cambio
SELECT 
  id,
  name,
  email,
  role,
  team,
  updated_at
FROM employees 
WHERE name ILIKE '%gustavo%';

-- 4. Verificar que ahora se puede buscar por email
SELECT 
  id,
  name,
  email,
  role,
  team
FROM employees 
WHERE email = 'gustavo.gnaz@gmail.com';
