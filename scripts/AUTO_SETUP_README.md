# 🚀 Scripts de Configuración Automática para Clientes HR SaaS

Este directorio contiene scripts que permiten configurar automáticamente un nuevo cliente en el sistema HR SaaS, generando datos de prueba completos basados en parámetros de entrada.

## 📋 Características

- ✅ **Configuración completa de empresa** con subdomain automático
- ✅ **Generación de departamentos** con nombres y descripciones apropiados
- ✅ **Creación de empleados** con nombres bíblicos y datos realistas
- ✅ **Horarios de trabajo** estándar configurados
- ✅ **Sistema de permisos** predefinido
- ✅ **Gamificación** configurada automáticamente
- ✅ **Datos hondureños** (DNI, teléfonos, bancos)
- ✅ **Distribución inteligente** de empleados por departamentos

## 🛠️ Scripts Disponibles

### 1. Script Bash (`auto-setup-client.sh`)
Script en Bash para sistemas Unix/Linux/macOS.

**Uso:**
```bash
./auto-setup-client.sh "Nombre Empresa" "Numero Empleados" "Numero Departamentos"
```

**Ejemplo:**
```bash
./auto-setup-client.sh "TechCorp" 25 5
```

### 2. Script JavaScript (`auto-setup-client.js`)
Script en Node.js para mayor flexibilidad y mejor manejo de errores.

**Uso:**
```bash
node auto-setup-client.js "Nombre Empresa" "Numero Empleados" "Numero Departamentos"
```

**Ejemplo:**
```bash
node auto-setup-client.js "TechCorp" 25 5
```

## 📊 Parámetros de Entrada

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `Nombre Empresa` | Nombre completo de la empresa | "TechCorp S.A." |
| `Numero Empleados` | Total de empleados a crear | 25 |
| `Numero Departamentos` | Cantidad de departamentos | 5 |

## 🎯 Cómo Funciona

1. **Validación de parámetros** - Verifica que los números sean válidos
2. **Cálculo automático** - Distribuye empleados equitativamente entre departamentos
3. **Generación de datos** - Crea empleados con nombres bíblicos y datos realistas
4. **Configuración completa** - Establece horarios, permisos y gamificación
5. **Archivo SQL** - Genera un archivo SQL listo para ejecutar

## 🏢 Departamentos Predefinidos

El sistema incluye 10 departamentos estándar:

1. **Recursos Humanos** - Gestión de personal y desarrollo organizacional
2. **Tecnología** - Desarrollo de software y soporte técnico
3. **Ventas y Marketing** - Estrategias de venta y posicionamiento
4. **Operaciones** - Gestión de procesos y eficiencia operativa
5. **Finanzas** - Contabilidad y gestión financiera
6. **Servicio al Cliente** - Atención y satisfacción del cliente
7. **Logística** - Gestión de inventarios y distribución
8. **Calidad** - Control de calidad y mejora continua
9. **Administración** - Administración general y soporte
10. **Compras** - Adquisiciones y gestión de proveedores

## 👥 Estructura de Empleados

### Por Departamento (5 empleados estándar):
1. **Gerente** - Líder del departamento
2. **Supervisor** - Supervisión operativa
3. **Especialista** - Experto en área específica
4. **Asistente** - Soporte administrativo
5. **Analista** - Análisis y reportes

### Nombres Bíblicos Utilizados:
- **Masculinos**: José David, Daniel Samuel, Isaías Miguel, Josué Caleb, Ezequiel Joel, etc.
- **Femeninos**: María Esther, Ana Ruth, Sara Beth, Rebeca Grace, Hannah Faith, etc.

## 💰 Salarios y Beneficios

- **Salario base**: L. 15,000 (ajustado por departamento y posición)
- **Ajustes por departamento**: +L. 1,000 por nivel de departamento
- **Ajustes por posición**: +L. 20,000 para Gerentes, +L. 15,000 para Supervisores, etc.
- **Ajustes por antigüedad**: +L. 500 por empleado

## 🏦 Bancos Hondureños

- Banco Atlántida
- Banco Ficohsa
- Banco BAC
- Banco Azteca
- Banco Popular

## 📱 Datos de Contacto

- **DNI**: Formato hondureño estándar (0801-YYYY-MM-DD-XXXXX)
- **Teléfonos**: Formato +504 9XXX-XXXX o +504 8XXX-XXXX
- **Emails**: empleadoXXX@subdomain.com

## 🎮 Sistema de Gamificación

### Logros Predefinidos:
- 🏆 **Puntualidad Perfecta** (100 pts) - Llegar a tiempo 5 días consecutivos
- ⭐ **Primero en Llegar** (50 pts) - Ser el primer empleado en llegar
- 🏅 **Semana Perfecta** (200 pts) - Completar semana sin ausencias
- 🥇 **Meses de Servicio** (500 pts) - Completar 6 meses en la empresa
- 👑 **Colaborador del Mes** (1000 pts) - Mejor colaborador mensual

## 📋 Tipos de Permisos

- **Vacaciones** (15 días/año, pagado, requiere aprobación)
- **Enfermedad** (10 días/año, pagado, requiere aprobación)
- **Personal** (5 días/año, no pagado, requiere aprobación)
- **Maternidad** (90 días, pagado, no requiere aprobación)
- **Paternidad** (10 días, pagado, no requiere aprobación)

## 🚀 Instalación y Uso

### Prerrequisitos:
- **Para Bash**: Sistema Unix/Linux/macOS con permisos de ejecución
- **Para JavaScript**: Node.js instalado

### Instalación:
```bash
# Hacer ejecutable el script bash
chmod +x auto-setup-client.sh

# Verificar Node.js
node --version
```

### Ejecución:
```bash
# Usar script bash
./auto-setup-client.sh "Mi Empresa" 30 6

# Usar script JavaScript
node auto-setup-client.js "Mi Empresa" 30 6
```

## 📁 Archivos Generados

El script genera un archivo SQL con el formato:
```
setup-client-[NombreEmpresa]-[Fecha].sql
```

**Ejemplo:**
```
setup-client-TechCorp-2025-01-27.sql
```

## 🔧 Aplicación de la Configuración

### Opción 1: PostgreSQL Directo
```bash
psql -h tu-host -U tu-usuario -d tu-base-datos -f setup-client-TechCorp-2025-01-27.sql
```

### Opción 2: Supabase CLI
```bash
# Reset de base de datos (cuidado: elimina datos existentes)
supabase db reset --db-url tu-url-supabase

# Aplicar configuración
psql tu-url-supabase -f setup-client-TechCorp-2025-01-27.sql
```

### Opción 3: Supabase Dashboard
1. Ir a SQL Editor en Supabase
2. Copiar y pegar el contenido del archivo SQL
3. Ejecutar el script

## ⚠️ Consideraciones Importantes

### Antes de Ejecutar:
- ✅ **Backup** de la base de datos existente
- ✅ **Verificar** que las migraciones estén aplicadas
- ✅ **Revisar** el SQL generado antes de ejecutar
- ✅ **Probar** en ambiente de desarrollo primero

### Campos Opcionales:
- Los campos no críticos se dejan como `NULL` si es permitido
- Se generan valores genéricos para campos requeridos
- Los datos son ficticios y deben ser personalizados

### Personalización Post-Ejecución:
1. **Revisar** empleados generados
2. **Actualizar** datos específicos de la empresa
3. **Configurar** horarios personalizados si es necesario
4. **Ajustar** salarios según política de la empresa
5. **Crear** usuario administrador para la empresa

## 🐛 Solución de Problemas

### Error: "No se pudo crear la empresa"
- Verificar que la tabla `companies` existe
- Comprobar permisos de inserción
- Verificar que no hay restricciones únicas violadas

### Error: "Departamento no encontrado"
- Verificar que la tabla `departments` existe
- Comprobar que la empresa se creó correctamente
- Verificar las políticas RLS

### Error: "Empleado no se pudo crear"
- Verificar que la tabla `employees` existe
- Comprobar que el departamento existe
- Verificar que el horario de trabajo existe

## 📞 Soporte

Si encuentras problemas:

1. **Revisar logs** del script para identificar errores
2. **Verificar estructura** de la base de datos
3. **Comprobar permisos** y políticas RLS
4. **Revisar migraciones** aplicadas

## 🔄 Versiones y Actualizaciones

- **v1.0** - Configuración básica de empresa, departamentos y empleados
- **v1.1** - Agregado sistema de gamificación y permisos
- **v1.2** - Mejorado generación de datos hondureños
- **v1.3** - Agregado validaciones y mejor manejo de errores

## 📝 Notas de Desarrollo

- Los scripts están diseñados para ser **idempotentes**
- Se pueden ejecutar **múltiples veces** sin duplicar datos
- Los **UUIDs** se generan automáticamente
- Las **fechas** se basan en la fecha actual del sistema
- Los **nombres** se distribuyen de forma balanceada entre géneros

---

**⚠️ IMPORTANTE**: Este script genera datos de prueba. Revisa y personaliza todos los datos antes de usar en producción.
