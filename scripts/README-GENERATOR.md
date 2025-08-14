# 🏗️ Generador de Clientes HR SAAS

Herramientas para crear rápidamente empresas completas con datos de prueba realistas.

## 🚀 Uso Rápido

### Opción 1: Script Rápido (Recomendado)
```bash
# Crear empresa con valores por defecto
./scripts/quick-client.sh

# Personalizar empresa
./scripts/quick-client.sh "Mi Empresa S.A." 20 5
#                         ^empresa     ^empleados ^departamentos
```

### Opción 2: Script Avanzado
```bash
# Usar configuración por defecto
node scripts/create-new-client.mjs --force

# Personalizar todos los valores
node scripts/create-new-client.mjs \
  --empresa "Distribuidora El Progreso" \
  --admin "María Rodríguez" \
  --email "maria@elprogreso.hn" \
  --password "MiPassword123!" \
  --empleados 25 \
  --departamentos 6 \
  --force
```

## 📊 Qué Se Crea Automáticamente

### 🏢 **Empresa Completa**
- ✅ Registro en tabla `companies`
- ✅ Información básica (nombre, email, teléfono, dirección)
- ✅ ID único de empresa

### 👥 **Empleados Realistas**
- ✅ **Nombres bíblicos** (Abraham, Sara, David, etc.)
- ✅ **Apellidos hondureños** (García, López, Hernández, etc.)
- ✅ **DNI hondureño** formato real (0801-1990-12345)
- ✅ **Emails corporativos** (nombre.apellido@empresa.hn)
- ✅ **Teléfonos hondureños** (9xxx-xxxx, 8xxx-xxxx)
- ✅ **Salarios aleatorios** (L15,000 - L45,000)
- ✅ **Fechas de contratación** realistas
- ✅ **Posiciones** automáticas por departamento

### 🏛️ **Departamentos (Equipos de Fútbol)**
- ✅ **Nombres de equipos hondureños** (Olimpia, Motagua, Real España, etc.)
- ✅ **Distribución automática** de empleados
- ✅ **Descripción** de cada departamento

### 👑 **Usuario Administrador**
- ✅ **Usuario en Supabase Auth** 
- ✅ **Perfil de empleado** con rol `company_admin`
- ✅ **Acceso completo** a la plataforma
- ✅ **Credenciales** listas para usar

### ⏰ **Horarios de Trabajo**
- ✅ **Horario estándar** 8:00 AM - 5:00 PM
- ✅ **Lunes a Viernes**
- ✅ **Fines de semana libres**

### 📋 **Registro de Activación**
- ✅ **Entrada en tabla `activaciones`**
- ✅ **Estado `active`**
- ✅ **Monto calculado** (empleados × L300)
- ✅ **Información completa** del contrato

## 💡 Ejemplos de Uso

### Crear Cliente Demo Rápido
```bash
./scripts/quick-client.sh "Supermercados La Popular" 18 4
```
**Resultado:**
- 18 empleados con nombres bíblicos
- 4 departamentos (equipos de fútbol)
- Admin con credenciales auto-generadas
- Listo para usar en segundos

### Crear Cliente Personalizado
```bash
node scripts/create-new-client.mjs \
  --empresa "Ferretería Industrial SOSA" \
  --admin "Carlos Sosa" \
  --email "carlos@ferreteriasos.hn" \
  --password "Ferreteria2025!" \
  --empleados 30 \
  --departamentos 7 \
  --force
```

## 🎯 Datos Generados

### 👨‍💼 Empleados Ejemplo:
```
Abraham García - Analista de Equipo Olimpia
Sara López - Coordinadora de Equipo Motagua  
David Hernández - Especialista de Equipo Real España
Rebeca González - Supervisora de Equipo Marathon
```

### 🏛️ Departamentos Ejemplo:
```
Equipo Olimpia (5 empleados)
Equipo Motagua (4 empleados)
Equipo Real España (6 empleados) 
Equipo Marathon (3 empleados)
```

### 💰 Salarios Realistas:
```
Total mensual: L456,750
Promedio: L25,375
Rango: L15,000 - L45,000
```

## 🔧 Configuración

### Variables de Entorno Necesarias:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Tablas Requeridas:
- ✅ `companies`
- ✅ `departments` 
- ✅ `employees`
- ✅ `work_schedules`
- ✅ `user_profiles`
- ✅ `activaciones`

## 🎉 Resultado Final

Al completarse, obtienes:
```
🏢 Empresa: Distribuidora La Ceiba S.A.
👥 Empleados: 15
🏛️ Departamentos: 4
👑 Admin: Carlos Mendoza
📧 Email: admin@distribuidoralaceiba.hn
🔑 Password: Admin123!
🆔 Company ID: uuid-generado

🔗 PRÓXIMOS PASOS:
1. Cliente ingresa a: https://tu-app.railway.app/app/login
2. Usuario: admin@distribuidoralaceiba.hn
3. Password: Admin123!
4. Tendrá acceso completo para customizar datos
```

## ⚡ Tips de Uso

- 🚀 Usa `quick-client.sh` para demos rápidos
- 🎯 Usa `create-new-client.mjs` para control total
- 📱 Los clientes pueden cambiar datos después
- 🔄 Cada ejecución genera datos únicos
- 💾 Todo queda registrado en la base de datos

## 🆘 Troubleshooting

### Error de conexión:
```bash
# Verificar variables de entorno
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Error de permisos:
```bash
# Dar permisos de ejecución
chmod +x scripts/quick-client.sh
```

### Ver logs detallados:
```bash
# El script muestra progreso paso a paso
node scripts/create-new-client.mjs --empresa "Test" --force
```
