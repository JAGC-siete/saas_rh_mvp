# 🧪 Pruebas Rápidas del Sistema de Reportes

## ✅ Migración Aplicada

Ahora vamos a verificar que todo funciona correctamente.

---

## 🔍 Verificación 1: Funciones Creadas

Ejecuta en Supabase SQL Editor:

```sql
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE 'reports_%'
ORDER BY proname;
```

**Resultado esperado**: Deberías ver 8 funciones:
- `reports_attendance`
- `reports_attendance_summary`
- `reports_payroll`
- `reports_payroll_summary`
- `reports_employees`
- `reports_employees_summary`
- `reports_work_certificate_data`
- `reports_calculate_severance`

---

## 🧪 Prueba 2: Test Básico de Empleados

**Reemplaza `TU_COMPANY_ID` con tu company_id real**

```sql
SELECT * FROM reports_employees_summary(
    p_company_id := 'TU_COMPANY_ID'::UUID
);
```

**Resultado esperado**: 
- 1 fila con columnas: `total_employees`, `active_employees`, etc.

---

## 🧪 Prueba 3: Test de Asistencia

```sql
SELECT * FROM reports_attendance_summary(
    p_company_id := 'TU_COMPANY_ID'::UUID,
    p_from := CURRENT_DATE - INTERVAL '30 days',
    p_to := CURRENT_DATE
);
```

**Resultado esperado**:
- 1 fila con KPIs de asistencia

---

## 🧪 Prueba 4: Test Frontend en Browser

1. Navega a: `https://humanosisu.net/app/reports`
2. Selecciona tab "Empleados"
3. **Esperado**: Se carga lista de empleados
4. Selecciona tab "Asistencia"
5. Cambia el preset a "Esta Quincena"
6. **Esperado**: Se carga reporte de asistencia con KPIs
7. Clic en "Excel" o "PDF"
8. **Esperado**: Descarga el archivo

---

## 📋 Checklist de Funcionalidades

### Asistencia ✅
- [ ] Tab se carga correctamente
- [ ] Filtros aplican fechas
- [ ] Se muestra preview de datos
- [ ] KPIs se muestran en cards
- [ ] Export Excel funciona
- [ ] Export PDF funciona

### Nómina ✅
- [ ] Tab se carga correctamente
- [ ] Filtros aplican correctamente
- [ ] Preview muestra datos
- [ ] KPIs financieros se muestran
- [ ] Exports funcionan

### Empleados ✅
- [ ] Tab se carga correctamente
- [ ] Lista completa de empleados
- [ ] Filtros por status funcionan
- [ ] Estadísticas correctas

---

## 🐛 Troubleshooting

### Error: "No se puede obtener Company ID"
- Verifica que estés autenticado
- Revisa que tu user_profile tenga company_id
- Confirma que tienes sesión activa

### Error: "Error fetching attendance data"
- Verifica que tengas datos de asistencia en el rango seleccionado
- Revisa logs del servidor en Railway
- Confirma que las funciones SQL se aplicaron

### Error: "Export failed"
- Verifica que ExcelJS y PDFKit estén instalados
- Revisa logs del endpoint /api/reports/export
- Confirma permisos de escritura

### Las funciones no se muestran
- Verifica que migración se aplicó sin errores
- Ejecuta manualmente la query de verificación
- Revisa logs en Supabase Dashboard

---

## 🎉 Próximos Pasos

Si todo funciona:
- ✅ Sistema de reportes listo para usar
- ✅ Documentar para usuarios finales
- ✅ Crear videotutorial si es necesario
- ✅ Monitorear uso y performance

Si hay errores:
- 🔍 Revisar logs detallados
- 🔧 Ajustar parámetros de funciones
- 📝 Documentar issues encontrados
- 🔄 Probar con datos de prueba

---

## 📞 Soporte

Para problemas:
1. Revisar logs de Next.js en Railway
2. Verificar logs de Supabase Dashboard
3. Ejecutar queries de verificación SQL
4. Probar endpoints con Postman/curl

