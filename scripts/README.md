# 🔧 HERRAMIENTAS DE CREACIÓN DE CLIENTES HR SAAS

Este directorio contiene herramientas para crear rápidamente nuevos clientes en el sistema HR SAAS con datos realistas de prueba.

## 📋 HERRAMIENTAS DISPONIBLES

### 1. 🚀 **create-new-client.mjs** - Herramienta Completa
Crea un cliente completo con toda la estructura necesaria.

**Uso:**
```bash
node scripts/create-new-client.mjs "Nombre Empresa" <empleados> <departamentos>
```

**Ejemplo:**
```bash
node scripts/create-new-client.mjs "Distribuidora La Ceiba S.A." 15 4
```

**Lo que crea:**
- ✅ **Empresa** con configuraciones básicas
- ✅ **Horario de trabajo** estándar (8:00-17:00 L-V, 8:00-12:00 S)
- ✅ **Departamentos** con nombres de equipos de fútbol
- ✅ **Empleados** con nombres bíblicos y datos realistas
- ✅ **Usuario administrador** en Supabase Auth
- ✅ **Perfil de usuario** con permisos completos
- ✅ **Tipos de permisos** estándar (vacaciones, enfermedad, etc.)
- ✅ **Sistema de gamificación** inicializado
- ✅ **Gerentes asignados** a departamentos

---

### 2. ⚡ **quick-client.sh** - Herramienta Rápida
Script bash para creación rápida con menos configuraciones.

**Uso:**
```bash
./scripts/quick-client.sh "Nombre Empresa" <empleados> <departamentos>
```

**Ejemplo:**
```bash
./scripts/quick-client.sh "Ferretería El Martillo" 8 2
```

---

## 📊 DATOS GENERADOS AUTOMÁTICAMENTE

### 👥 **Empleados**
- **Nombres**: Bíblicos realistas (David González, María Rodríguez, etc.)
- **DNI**: Formato hondureño (0801-YYYY-XXXXX)
- **Salarios**: Aleatorios entre L. 15,000 - L. 45,000
- **Emails**: Basados en nombre y empresa
- **Teléfonos**: Formato hondureño (+504 XXXX-XXXX)
- **Bancos**: Bancos hondureños reales
- **Cuentas bancarias**: Números de 9 dígitos

### 🏬 **Departamentos**
- **Nombres**: Equipos de fútbol famosos (Real Madrid, Barcelona, etc.)
- **Gerentes**: Asignados automáticamente
- **Descripciones**: Generadas automáticamente

### 🕐 **Horarios de Trabajo**
- **Lunes-Viernes**: 8:00 AM - 5:00 PM
- **Sábado**: 8:00 AM - 12:00 PM  
- **Domingo**: Descanso
- **Almuerzo**: 60 minutos
- **Zona horaria**: America/Tegucigalpa

### 📋 **Tipos de Permisos**
- 🌴 **Vacaciones**: 15 días/año, pagadas, requieren aprobación
- 🤒 **Enfermedad**: 10 días/año, pagadas, no requieren aprobación
- 👤 **Personal**: 5 días/año, no pagadas, requieren aprobación
- 👶 **Paternidad/Maternidad**: 30 días/año, pagadas, requieren aprobación

### 🎮 **Sistema de Gamificación**
- **Puntajes iniciales**: Aleatorios para simular actividad previa
- **Logros disponibles**: 7 tipos de achievements
- **Streaks**: Rachas de puntualidad inicializadas
- **Historial**: Preparado para registrar actividad

---

## 🔐 CREDENCIALES GENERADAS

### 👤 **Usuario Administrador**
- **Email**: `admin@[empresa-sin-espacios].com`
- **Password**: `Admin123!`
- **Rol**: `company_admin`
- **Permisos**: Acceso completo a todas las funciones

### 📧 **Emails de Empleados**
- **Formato**: `[nombre].[apellido]@[empresa].com`
- **Ejemplo**: `david.gonzalez@distribuidoralaceiba.com`

---

## 🛠️ CONFIGURACIÓN REQUERIDA

### Variables de Entorno (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ[clave-servicio]
```

### Permisos Necesarios
- ✅ Acceso de escritura a todas las tablas
- ✅ Capacidad de crear usuarios en Supabase Auth
- ✅ Service Role Key configurada

---

## 📈 EJEMPLOS DE USO

### Caso 1: Empresa Pequeña
```bash
node scripts/create-new-client.mjs "Taller Mecánico López" 5 2
```
**Resultado:**
- 5 empleados (1 admin + 4 empleados)
- 2 departamentos (Real Madrid, Barcelona)
- 2 gerentes de departamento

### Caso 2: Empresa Mediana
```bash
node scripts/create-new-client.mjs "Supermercado La Bendición" 25 5
```
**Resultado:**
- 25 empleados (1 admin + 24 empleados)
- 5 departamentos con equipos de fútbol
- 5 gerentes de departamento

### Caso 3: Empresa Grande
```bash
node scripts/create-new-client.mjs "Corporación Industrial del Norte" 50 8
```
**Resultado:**
- 50 empleados distribuidos en 8 departamentos
- Estructura organizacional completa
- Sistema de gamificación con datos iniciales

---

## 🔍 VERIFICACIÓN POST-CREACIÓN

### Comprobar en Supabase Dashboard:
1. **companies** - Empresa creada ✅
2. **employees** - Empleados con datos completos ✅
3. **departments** - Departamentos con gerentes ✅
4. **work_schedules** - Horario estándar ✅
5. **user_profiles** - Admin con permisos ✅
6. **leave_types** - Tipos de permisos ✅
7. **employee_scores** - Gamificación inicializada ✅

### Probar Login:
```
URL: /app/login
Email: admin@[empresa].com  
Password: Admin123!
```

---

## 🚨 NOTAS IMPORTANTES

### ⚠️ Datos de Prueba
- Los datos son **FICTICIOS** y para **DESARROLLO/DEMO**
- DNI y números de cuenta **NO SON REALES**
- Usar solo en entornos de desarrollo

### 🔒 Seguridad
- Cambiar passwords por defecto en producción
- Usar emails reales del cliente
- Validar datos antes de crear en producción

### 📱 Compatibilidad
- Funciona con Supabase PostgreSQL
- Requiere Node.js 16+ con ES modules
- Compatible con sistema HR SAAS v2.0+

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "Variables de entorno no configuradas"
```bash
# Verificar .env.local
cat .env.local | grep SUPABASE
```

### Error: "Cannot find module"
```bash
# Instalar dependencias
npm install
```

### Error: "Permission denied"
```bash
# Dar permisos al script bash
chmod +x scripts/quick-client.sh
```

### Error: "Invalid JWT"
```bash
# Verificar Service Role Key
echo $SUPABASE_SERVICE_ROLE_KEY
```

---

## 📞 SOPORTE

Para problemas o mejoras:
1. Verificar logs de Supabase
2. Comprobar RLS policies
3. Validar estructura de tablas
4. Contactar al equipo de desarrollo
