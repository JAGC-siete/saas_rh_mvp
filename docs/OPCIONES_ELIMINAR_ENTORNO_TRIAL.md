# Opciones para Eliminar/Resetear Entorno Trial de Usuario

Cuando un usuario ya tiene un entorno trial activo y necesita crear uno nuevo, hay varias opciones disponibles.

## Problema

El sistema verifica en **3 lugares** si un email ya tiene un trial activo:

1. **`trial_access_users`** - Usuarios con trial activo
2. **`activaciones`** - Solicitudes recientes (cooldown period)
3. **`auth.users` + `user_profiles` + `companies`** - Usuario con company trial activa

Si cualquiera de estos existe, el sistema bloquea la creación de un nuevo trial.

## Opciones Disponibles

### Opción 1: Eliminación Completa (Recomendada) ⭐

**Archivo:** `sql/eliminar_entorno_trial_usuario.sql`

**Qué hace:**
- Elimina completamente todos los registros relacionados con el usuario
- Elimina el usuario de `auth.users`
- Elimina el perfil de `user_profiles`
- Elimina la company y todos sus datos (empleados, departamentos, etc.)
- Elimina registros de `trial_access_users`
- Elimina registros de `activaciones`

**Cuándo usar:**
- Cuando quieres un reset completo
- Cuando no necesitas conservar los datos del trial anterior
- Cuando el usuario quiere empezar desde cero

**Pasos:**
1. Abre el archivo `sql/eliminar_entorno_trial_usuario.sql`
2. Cambia el email en la línea: `target_email TEXT := 'cliente.ejemplo@empresa.com';`
3. Ejecuta el script en el SQL Editor de Supabase
4. Verifica con la consulta al final del script

### Opción 2: Desactivación (Conserva Datos)

**Archivo:** `sql/desactivar_entorno_trial_usuario.sql`

**Qué hace:**
- Desactiva `trial_access_users` (marca `is_active = false`)
- Desactiva la company (marca `is_active = false`)
- Desactiva el perfil de usuario (marca `is_active = false`)
- Elimina registros de `activaciones` (necesario para permitir nueva solicitud)
- **NO elimina datos**, solo los desactiva

**Cuándo usar:**
- Cuando quieres conservar los datos para auditoría
- Cuando puede ser útil tener un historial del trial anterior
- Cuando no estás seguro si necesitarás los datos después

**Pasos:**
1. Abre el archivo `sql/desactivar_entorno_trial_usuario.sql`
2. Cambia el email en la línea: `target_email TEXT := 'cliente.ejemplo@empresa.com';`
3. Ejecuta el script en el SQL Editor de Supabase

### Opción 3: Eliminación Manual desde Dashboard

**Pasos manuales:**

1. **Eliminar de Supabase Auth:**
   - Ve a Supabase Dashboard → Authentication → Users
   - Busca el usuario por email
   - Elimínalo

2. **Eliminar de la base de datos:**
   ```sql
   -- Eliminar trial_access_users
   DELETE FROM trial_access_users WHERE LOWER(email) = LOWER('cliente.ejemplo@empresa.com');
   
   -- Eliminar activaciones
   DELETE FROM activaciones WHERE LOWER(contacto_email) = LOWER('cliente.ejemplo@empresa.com');
   
   -- Eliminar user_profile (si existe)
   DELETE FROM user_profiles 
   WHERE id IN (SELECT id FROM auth.users WHERE LOWER(email) = LOWER('cliente.ejemplo@empresa.com'));
   
   -- Eliminar company (si es trial y no tiene otros usuarios)
   -- Primero verifica:
   SELECT id, name, plan_type 
   FROM companies 
   WHERE id IN (
     SELECT company_id FROM user_profiles 
     WHERE id IN (SELECT id FROM auth.users WHERE LOWER(email) = LOWER('cliente.ejemplo@empresa.com'))
   );
   
   -- Si la company es de tipo trial y no tiene otros usuarios, elimínala:
   DELETE FROM companies 
   WHERE id = 'COMPANY_ID_AQUI' 
   AND plan_type = 'trial';
   ```

## Diagnóstico Antes de Eliminar

**ANTES de ejecutar el script de eliminación**, ejecuta el script de diagnóstico:

**Archivo:** `sql/diagnostico_trial_usuario.sql`

Este script te mostrará:
- Cuántos registros hay en cada tabla
- Cuáles están activos
- Los IDs de los registros encontrados
- Las companies asociadas

**Pasos:**
1. Abre `sql/diagnostico_trial_usuario.sql`
2. Cambia el email en la línea: `SELECT LOWER(TRIM('cliente.ejemplo@empresa.com')) AS email`
3. Ejecuta el script
4. Revisa los resultados para entender qué se va a eliminar

## Verificación Post-Eliminación

Después de ejecutar el script de eliminación, ejecuta nuevamente el script de diagnóstico para verificar que todo se eliminó correctamente:

**Resultado esperado:** Todos los registros deben ser `0` o `NULL`.

También puedes usar esta consulta rápida:

```sql
WITH params AS (
  SELECT LOWER('cliente.ejemplo@empresa.com') AS email
)
SELECT 
  'trial_access_users' AS tabla, COUNT(*) AS registros
FROM trial_access_users tau, params p
WHERE LOWER(tau.email) = p.email
UNION ALL
SELECT 
  'activaciones' AS tabla, COUNT(*) AS registros
FROM activaciones a, params p
WHERE LOWER(a.contacto_email) = p.email
UNION ALL
SELECT 
  'user_profiles' AS tabla, COUNT(*) AS registros
FROM user_profiles up
JOIN auth.users au ON up.id = au.id, params p
WHERE LOWER(au.email) = p.email
UNION ALL
SELECT 
  'auth.users' AS tabla, COUNT(*) AS registros
FROM auth.users au, params p
WHERE LOWER(au.email) = p.email;
```

## Después de la Eliminación

Una vez completado el proceso:

1. El usuario puede ingresar su email nuevamente en el formulario de activación
2. Recibirá el correo de activación como si fuera la primera vez
3. Se creará un nuevo entorno trial completamente nuevo

## Solución de Problemas

### Si el usuario sigue recibiendo el error después de ejecutar el script

1. **Ejecuta el script de diagnóstico** (`sql/diagnostico_trial_usuario.sql`) para ver qué registros quedan
2. **Verifica que el email esté correctamente escrito** (sin espacios, en minúsculas)
3. **Revisa los logs del script** - El script mostrará mensajes de NOTICE con lo que encontró y eliminó
4. **Elimina manualmente desde Supabase Dashboard:**
   - Ve a Authentication → Users y elimina el usuario si existe
   - Ve a Table Editor → `trial_access_users` y elimina registros manualmente
   - Ve a Table Editor → `activaciones` y elimina registros manualmente

### Si el script falla al eliminar de auth.users

Esto es normal si no tienes permisos completos. En ese caso:
1. El script eliminará todo lo demás
2. Ve manualmente a Supabase Dashboard → Authentication → Users
3. Busca el usuario por email y elimínalo manualmente

## Notas Importantes

⚠️ **Advertencias:**
- La eliminación es **irreversible** (excepto si tienes backups)
- Si la company tiene otros usuarios asociados, no se eliminará automáticamente
- Si eliminas el usuario de `auth.users`, perderá acceso inmediato a cualquier cuenta existente
- El script mejorado elimina **TODOS** los registros de `trial_access_users` (activos e inactivos)

✅ **Recomendaciones:**
- **Siempre ejecuta el diagnóstico primero** para ver qué hay
- Usa la **Opción 1** (eliminación completa) para un reset limpio
- Usa la **Opción 2** (desactivación) si necesitas conservar datos
- Siempre verifica después de ejecutar el script usando el diagnóstico
- Considera hacer un backup antes de eliminar datos importantes

## Soporte

Si encuentras problemas al ejecutar los scripts:
1. Verifica que el email esté correctamente escrito
2. Revisa los logs en el SQL Editor de Supabase
3. Asegúrate de tener permisos de administrador en Supabase

