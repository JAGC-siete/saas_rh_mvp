# Importación de Datos - Setup Completo

## Archivos Generados

- `companies.json`: Datos de empresas
- `departments.json`: Datos de departamentos  
- `employees.json`: Datos de empleados
- `import.js`: Script de importación básico
- `final-import.js`: Script de importación final (recomendado)

## Pasos para Importar

### 1. Corregir Migraciones (si es necesario)
```bash
# Si hay problemas con supabase db pull
node scripts/fix-migration-issue.js
supabase db reset
supabase db push
```

### 2. Importar Datos
```bash
cd import-data
node final-import.js
```

### 3. Verificar Importación
```bash
# Verificar en Supabase Dashboard
# O usar el script de verificación
node scripts/verify-data-import.js
```

## Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Estructura de Datos

### Companies
- 1 empresa principal con configuración completa

### Departments  
- Recursos Humanos
- Tecnología
- Administración
- Ventas
- Marketing

### Employees
- 10 empleados de ejemplo con datos realistas
- DNIs únicos
- Emails corporativos
- Salarios apropiados
- Fechas de contratación variadas

## Notas Importantes

- Los datos son de ejemplo y pueden ser modificados
- Todos los UUIDs son generados automáticamente
- Los datos están relacionados correctamente (company_id, department_id)
- El script maneja duplicados automáticamente

## Troubleshooting

### Error: Variables de entorno no encontradas
Verifica que el archivo .env contenga las variables requeridas

### Error: Problemas de migración
Ejecuta: `node scripts/fix-migration-issue.js`

### Error: Conexión a Supabase
Verifica las credenciales y la conectividad de red
