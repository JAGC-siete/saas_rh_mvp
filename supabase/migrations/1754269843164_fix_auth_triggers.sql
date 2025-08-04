-- Migración para corregir problemas de triggers de autenticación
-- Fecha: 2025-08-04

-- 1. Eliminar trigger problemático si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Crear función mejorada para manejo de usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS trigger AS $$
BEGIN
  -- Solo crear perfil si no existe
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    INSERT INTO public.user_profiles (id, role, is_active, permissions, created_at, updated_at)
    VALUES (
      NEW.id,
      'employee',
      true,
      '{
        "can_view_own_data": true,
        "can_view_own_attendance": true,
        "can_register_attendance": true
      }'::jsonb,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero no fallar
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger con permisos apropiados
CREATE TRIGGER on_auth_user_created_safe
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_safe();

-- 4. Comentarios para documentación
COMMENT ON FUNCTION public.handle_new_user_safe() IS 'Función segura para crear perfil automáticamente';
COMMENT ON TRIGGER on_auth_user_created_safe ON auth.users IS 'Trigger seguro para crear perfil automáticamente';
