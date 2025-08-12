-- RESETEAR CONTRASEÑA DE GUSTAVO
-- Usuario: gustavo.gnaz@gmail.com
-- Nueva contraseña: eljefe123456

-- IMPORTANTE: Este script debe ejecutarse en Supabase SQL Editor
-- La contraseña se resetea desde el Dashboard de Supabase

-- 1. Verificar que el usuario existe
SELECT 
    '🔍 USUARIO ENCONTRADO' as status,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'gustavo.gnaz@gmail.com';

-- 2. Verificar el perfil de usuario
SELECT 
    '🔍 PERFIL DE USUARIO' as status,
    up.id,
    up.role,
    up.permissions,
    up.is_active,
    c.name as company_name
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.id = '0d875a24-a774-41b6-b221-791989491ce7';

-- 3. INSTRUCCIONES PARA RESETEAR CONTRASEÑA:
-- ⚠️ NO EJECUTAR ESTO EN SQL - HACERLO MANUALMENTE EN EL DASHBOARD

/*
PASOS PARA RESETEAR CONTRASEÑA:

1. Ve a Supabase Dashboard → Authentication → Users
2. Busca gustavo.gnaz@gmail.com
3. Haz clic en los 3 puntos (...) → "Reset Password"
4. Se enviará un email de reset
5. O mejor aún, haz clic en "Edit" y cambia la contraseña directamente a: eljefe123456

ALTERNATIVA MÁS RÁPIDA:
1. Ve a Authentication → Users
2. Busca gustavo.gnaz@gmail.com
3. Haz clic en "Edit"
4. Cambia la contraseña a: eljefe123456
5. Guarda cambios
*/
