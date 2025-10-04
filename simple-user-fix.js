const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurado');
  process.exit(1);
}

// Crear cliente con service role key (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUser() {
  const email = 'jorge7gomez@gmail.com';
  const userId = '8c49be71-c48f-4fee-9935-44a168eb2dfe'; // Tu ID conocido

  console.log('🔧 Arreglando usuario:', email);
  console.log('🆔 User ID:', userId);
  console.log('=' .repeat(50));

  try {
    // PASO 1: Actualizar user_profiles para asegurar super_admin
    console.log('\n📋 PASO 1: Actualizando user_profiles...');
    const { data: profileUpdate, error: profileError } = await supabase
      .from('user_profiles')
      .update({
        role: 'super_admin',
        company_id: '00000000-0000-0000-0000-000000000000',
        is_active: true,
        permissions: {
          super_admin: true,
          system_admin: true,
          can_manage_all: true,
          can_manage_users: true,
          can_view_all_payroll: true,
          can_manage_attendance: true,
          can_manage_departments: true,
          can_manage_companies: true,
          can_manage_employees: true,
          can_create_employees: true,
          can_delete_employees: true,
          can_edit_employees: true,
          can_view_employees: true,
          can_manage_payroll: true,
          can_view_payroll: true,
          can_approve_payroll: true,
          can_generate_payroll: true,
          can_export_payroll: true,
          can_manage_attendance: true,
          can_view_attendance: true,
          can_edit_attendance: true,
          can_register_attendance: true,
          can_view_own_attendance: true,
          can_export_attendance: true,
          can_manage_departments: true,
          can_create_departments: true,
          can_edit_departments: true,
          can_view_departments: true,
          can_manage_reports: true,
          can_view_reports: true,
          can_export_reports: true,
          can_manage_settings: true,
          can_view_settings: true,
          can_edit_user_roles: true,
          can_invite_users: true
        }
      })
      .eq('id', userId)
      .select();

    if (profileError) {
      console.error('❌ Error actualizando user_profiles:', profileError.message);
      return;
    }

    console.log('✅ user_profiles actualizado');
    console.log('👑 Rol:', profileUpdate[0]?.role);
    console.log('🏢 Company:', profileUpdate[0]?.company_id);
    console.log('✅ Activo:', profileUpdate[0]?.is_active);

    // PASO 2: Crear/verificar compañía por defecto
    console.log('\n📋 PASO 2: Verificando compañía por defecto...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .upsert({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Super Admin Company',
        subdomain: 'super-admin',
        plan_type: 'enterprise',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();

    if (companyError) {
      console.error('❌ Error con compañía:', companyError.message);
    } else {
      console.log('✅ Compañía por defecto configurada:', company[0]?.name);
    }

    // PASO 3: Verificar políticas RLS
    console.log('\n📋 PASO 3: Verificando políticas RLS...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT policyname, cmd, qual 
          FROM pg_policies 
          WHERE tablename = 'user_profiles'
          ORDER BY policyname;
        `
      });

    if (policiesError) {
      console.log('⚠️  No se pudieron verificar políticas RLS:', policiesError.message);
    } else {
      console.log('✅ Políticas RLS verificadas:', policies?.length || 0, 'políticas encontradas');
    }

    // PASO 4: Test de acceso
    console.log('\n📋 PASO 4: Probando acceso...');
    const { data: testAccess, error: accessError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (accessError) {
      console.error('❌ Error de acceso:', accessError.message);
    } else {
      console.log('✅ Acceso verificado');
      console.log('👤 Usuario:', email);
      console.log('🆔 ID:', testAccess.id);
      console.log('👑 Rol:', testAccess.role);
      console.log('🏢 Company:', testAccess.company_id);
      console.log('✅ Activo:', testAccess.is_active);
    }

    // PASO 5: Verificación final
    console.log('\n📋 PASO 5: Verificación final...');
    console.log('✅ CONFIGURACIÓN COMPLETADA');
    console.log('🎯 Credenciales de acceso:');
    console.log('   📧 Email:', email);
    console.log('   🔑 Password: jorgegoku07sisu');
    console.log('   👑 Rol: super_admin');
    console.log('   🏢 Company: Super Admin Company');
    console.log('\n🎉 El usuario debería poder acceder ahora');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar
fixUser().then(() => {
  console.log('\n✅ Script completado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
