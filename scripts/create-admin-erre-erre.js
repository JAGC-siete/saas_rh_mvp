const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
    try {
        const companyId = '33db1f7b-3129-40f1-9443-851ab2f20ca0';
        const adminEmail = 'admin@erreerre.com';
        const adminPassword = 'AdminErre2025!';
        const adminName = 'Administrador Erre & Erre';
        
        console.log('🔐 Creando usuario administrador para Erre & Erre...');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🏢 Company ID: ${companyId}`);
        
        // Verificar que la empresa existe
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();
            
        if (companyError || !company) {
            console.error('❌ Empresa no encontrada:', companyError);
            return false;
        }
        
        console.log('✅ Empresa verificada:', company.name);
        
        // Crear usuario en Supabase Auth
        console.log('🔄 Verificando usuario existente...');
        
        // Primero verificar si el email ya existe
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);
        
        let authUser;
        
        if (existingUser) {
            console.log('✅ Usuario ya existe:', existingUser.id);
            authUser = { user: existingUser };
        } else {
            console.log('🔄 Creando nuevo usuario en Supabase Auth...');
            
            const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
                email: adminEmail,
                password: adminPassword,
                email_confirm: true,
                user_metadata: {
                    role: 'company_admin',
                    company_id: companyId,
                    full_name: adminName
                }
            });
            
            if (authError) {
                console.error('❌ Error creando usuario auth:', authError);
                return false;
            }
            
            console.log('✅ Usuario auth creado:', newAuthUser.user.id);
            authUser = newAuthUser;
        }
        
        // Crear perfil de usuario
        console.log('🔄 Verificando perfil de usuario...');
        
        const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authUser.user.id)
            .single();
            
        if (existingProfile) {
            console.log('✅ Perfil ya existe');
        } else {
            console.log('🔄 Creando perfil de usuario...');
            
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    id: authUser.user.id,
                    company_id: companyId,
                    role: 'company_admin',
                    permissions: ['all'],
                    is_active: true
                });
                
            if (profileError) {
                console.error('❌ Error creando perfil:', profileError);
                return false;
            }
            
            console.log('✅ Perfil de usuario creado exitosamente');
        }
        
        // Mostrar resumen
        console.log('\n🎉 ¡USUARIO ADMINISTRADOR CREADO EXITOSAMENTE!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 DATOS DE ACCESO:');
        console.log(`  📧 Email: ${adminEmail}`);
        console.log(`  🔑 Password: ${adminPassword}`);
        console.log(`  👤 Nombre: ${adminName}`);
        console.log(`  🏢 Empresa: ${company.name}`);
        console.log(`  🆔 User ID: ${authUser.user.id}`);
        console.log(`  🏢 Company ID: ${companyId}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log('\n🔗 ACCESO AL SISTEMA:');
        console.log('  URL: https://tu-app.railway.app/app/login');
        console.log(`  Email: ${adminEmail}`);
        console.log(`  Password: ${adminPassword}`);
        
        return {
            success: true,
            userId: authUser.user.id,
            email: adminEmail,
            password: adminPassword,
            companyId: companyId
        };
        
    } catch (error) {
        console.error('❌ Error inesperado:', error);
        return { success: false, error };
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createAdminUser()
        .then((result) => {
            if (result.success) {
                console.log('\n✅ ¡ADMINISTRADOR CREADO EXITOSAMENTE!');
                process.exit(0);
            } else {
                console.log('\n❌ ERROR CREANDO ADMINISTRADOR');
                console.error(result.error);
                process.exit(1);
            }
        });
}

module.exports = { createAdminUser };
