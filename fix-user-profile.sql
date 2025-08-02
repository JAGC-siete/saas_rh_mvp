-- Script para verificar y crear perfil de usuario
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si existe el usuario en auth.users
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'jorge7gomez@gmail.com';

-- 2. Verificar si existe el perfil en user_profiles
SELECT 
  id,
  role,
  company_id,
  is_active,
  created_at
FROM user_profiles 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jorge7gomez@gmail.com'
);

-- 3. Si no existe el perfil, crearlo
INSERT INTO user_profiles (
  id,
  role,
  is_active,
  created_at,
  updated_at
) 
SELECT 
  id,
  'super_admin',
  true,
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'jorge7gomez@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE id = auth.users.id
);

-- 4. Verificar el resultado
SELECT 
  up.id,
  up.role,
  up.company_id,
  up.is_active,
  au.email
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE au.email = 'jorge7gomez@gmail.com';

-- 5. Verificar políticas RLS en user_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_profiles'; 