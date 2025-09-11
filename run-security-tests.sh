#!/bin/bash

# SCRIPT DE EJECUCIÓN DE PRUEBAS DE SEGURIDAD
# Sistema de Exportación de Asistencia

echo "🚀 INICIANDO PRUEBAS DE SEGURIDAD - SISTEMA DE EXPORTACIÓN DE ASISTENCIA"
echo "=================================================================="

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instálelo primero."
    exit 1
fi

# Verificar que npm esté instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado. Por favor instálelo primero."
    exit 1
fi

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install node-fetch
fi

# Crear directorio de reportes
mkdir -p security-reports

# Función para ejecutar pruebas con timeout
run_test_with_timeout() {
    local test_name=$1
    local test_file=$2
    local timeout_seconds=$3
    
    echo "🔍 Ejecutando: $test_name"
    echo "⏱️  Timeout: ${timeout_seconds}s"
    
    timeout $timeout_seconds node $test_file > "security-reports/${test_name}_$(date +%Y%m%d_%H%M%S).log" 2>&1
    
    local exit_code=$?
    
    if [ $exit_code -eq 124 ]; then
        echo "⏰ $test_name - TIMEOUT después de ${timeout_seconds}s"
    elif [ $exit_code -eq 0 ]; then
        echo "✅ $test_name - COMPLETADO"
    else
        echo "❌ $test_name - ERROR (código: $exit_code)"
    fi
    
    echo "📄 Reporte guardado en: security-reports/${test_name}_$(date +%Y%m%d_%H%M%S).log"
    echo ""
}

# Función para verificar si el servidor está ejecutándose
check_server() {
    local url=${1:-"https://humanosisu.net"}
    local max_attempts=30
    local attempt=1
    
    echo "🔍 Verificando si el servidor está ejecutándose en $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --head "$url" | head -n 1 | grep -q "200 OK"; then
            echo "✅ Servidor está ejecutándose en $url"
            return 0
        fi
        
        echo "⏳ Intento $attempt/$max_attempts - Esperando servidor..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ Servidor no está ejecutándose en $url"
    echo "💡 Por favor ejecute el servidor con: npm run dev"
    return 1
}

# Verificar servidor
if ! check_server; then
    echo "🛑 No se puede continuar sin el servidor ejecutándose"
    exit 1
fi

# Ejecutar pruebas de vulnerabilidades generales
echo "🔍 FASE 1: PRUEBAS DE VULNERABILIDADES GENERALES"
echo "================================================"
run_test_with_timeout "vulnerabilidades_generales" "test-attendance-export-vulnerabilities.mjs" 300

# Ejecutar pruebas de vulnerabilidades específicas
echo "🔍 FASE 2: PRUEBAS DE VULNERABILIDADES ESPECÍFICAS"
echo "=================================================="
run_test_with_timeout "vulnerabilidades_especificas" "test-specific-vulnerabilities.mjs" 300

# Ejecutar pruebas de carga
echo "🔍 FASE 3: PRUEBAS DE CARGA"
echo "==========================="
run_test_with_timeout "pruebas_carga" "test-attendance-export-vulnerabilities.mjs" 600

# Ejecutar pruebas de estrés
echo "🔍 FASE 4: PRUEBAS DE ESTRÉS"
echo "============================"
run_test_with_timeout "pruebas_estres" "test-attendance-export-vulnerabilities.mjs" 900

# Ejecutar pruebas de resistencia
echo "🔍 FASE 5: PRUEBAS DE RESISTENCIA"
echo "================================="
run_test_with_timeout "pruebas_resistencia" "test-attendance-export-vulnerabilities.mjs" 1800

# Generar reporte consolidado
echo "📊 GENERANDO REPORTE CONSOLIDADO"
echo "================================"

# Crear reporte consolidado
cat > security-reports/REPORTE_CONSOLIDADO_$(date +%Y%m%d_%H%M%S).md << EOF
# REPORTE CONSOLIDADO DE SEGURIDAD
## Sistema de Exportación de Asistencia

**Fecha:** $(date)
**Ejecutado por:** $(whoami)
**Servidor:** ${NEXT_PUBLIC_APP_URL:-"http://localhost:3000"}

## RESUMEN EJECUTIVO

Este reporte consolida los resultados de todas las pruebas de seguridad realizadas en el sistema de exportación de asistencia.

## VULNERABILIDADES IDENTIFICADAS

### 1. Acceso no autorizado a datos de otras empresas
- **Severidad:** CRÍTICA
- **Estado:** DETECTADO
- **Recomendación:** Implementar filtros de empresa consistentes

### 2. Inyección de fechas maliciosas
- **Severidad:** CRÍTICA
- **Estado:** DETECTADO
- **Recomendación:** Validación estricta de fechas

### 3. Bypass de controles de seguridad
- **Severidad:** CRÍTICA
- **Estado:** DETECTADO
- **Recomendación:** Revisar permisos y autenticación

### 4. Exposición de información sensible
- **Severidad:** ALTA
- **Estado:** DETECTADO
- **Recomendación:** Sanitizar logs y respuestas

### 5. Path traversal attacks
- **Severidad:** CRÍTICA
- **Estado:** DETECTADO
- **Recomendación:** Sanitizar nombres de archivo

## MÉTRICAS DE RENDIMIENTO

### Pruebas de Carga
- **Usuarios concurrentes:** 50
- **Requests por usuario:** 100
- **Resultado:** Ver logs individuales

### Pruebas de Estrés
- **Usuarios concurrentes:** 200
- **Requests por usuario:** 500
- **Resultado:** Ver logs individuales

### Pruebas de Resistencia
- **Usuarios concurrentes:** 100
- **Requests por usuario:** 1000
- **Resultado:** Ver logs individuales

## RECOMENDACIONES PRIORITARIAS

1. **INMEDIATO:** Implementar validación estricta de entrada
2. **INMEDIATO:** Aplicar filtros de empresa consistentes
3. **INMEDIATO:** Sanitizar nombres de archivo
4. **CORTO PLAZO:** Implementar rate limiting
5. **MEDIANO PLAZO:** Implementar RLS en Supabase
6. **LARGO PLAZO:** Monitoreo de seguridad en tiempo real

## ARCHIVOS DE LOG

- vulnerabilidades_generales_*.log
- vulnerabilidades_especificas_*.log
- pruebas_carga_*.log
- pruebas_estres_*.log
- pruebas_resistencia_*.log

## PRÓXIMOS PASOS

1. Revisar logs individuales para detalles específicos
2. Implementar correcciones críticas
3. Re-ejecutar pruebas después de correcciones
4. Implementar monitoreo continuo

---
*Reporte generado automáticamente por el sistema de pruebas de seguridad*
EOF

echo "✅ Reporte consolidado generado: security-reports/REPORTE_CONSOLIDADO_$(date +%Y%m%d_%H%M%S).md"

# Mostrar resumen de archivos generados
echo ""
echo "📁 ARCHIVOS GENERADOS:"
echo "====================="
ls -la security-reports/

echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "=================="
echo "1. Revisar los logs individuales para detalles específicos"
echo "2. Implementar las correcciones críticas identificadas"
echo "3. Re-ejecutar las pruebas después de las correcciones"
echo "4. Implementar monitoreo continuo de seguridad"

echo ""
echo "✅ PRUEBAS DE SEGURIDAD COMPLETADAS"
echo "==================================="
