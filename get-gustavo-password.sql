-- OBTENER CONTRASEÑA ACTUAL DE GUSTAVO
-- Ejecutar en Supabase SQL Editor

-- Ver la contraseña encriptada actual
SELECT 
    '🔑 CONTRASEÑA ACTUAL DE GUSTAVO' as info,
    id,
    email,
    encrypted_password,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'gustavo.gnaz@gmail.com';

-- También puedes ver todos los usuarios para comparar
SELECT 
    '👥 TODOS LOS USUARIOS' as info,
    id,
    email,
    encrypted_password,
    created_at,
    last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC;
