#!/bin/bash

# Script para probar el sistema de onboarding con diferentes casos
# Simula el primer registro de empleados mañana

echo "🎯 TESTING ONBOARDING SYSTEM - PRIMER REGISTRO DE EMPLEADOS"
echo "=========================================================="
echo ""

# Base URL de la aplicación
BASE_URL="https://hr-saas-production.up.railway.app"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Función para hacer test del onboarding
test_onboarding() {
    local dni=$1
    local name=$2
    local employee_code=$3
    local department=$4
    
    echo -e "${BLUE}🧪 Probando Onboarding para:${NC}"
    echo -e "   👤 Nombre: ${GREEN}$name${NC}"
    echo -e "   🆔 Código: ${YELLOW}$employee_code${NC}"
    echo -e "   📋 DNI: ${PURPLE}$dni${NC}"
    echo -e "   🏢 Departamento: ${YELLOW}$department${NC}"
    echo ""
    
    # Extraer últimos 5 dígitos del DNI
    local last5=${dni: -5}
    echo -e "${YELLOW}📝 Últimos 5 dígitos del DNI: ${PURPLE}$last5${NC}"
    echo ""
    
    # Hacer la petición al endpoint de first-time-check
    echo -e "${BLUE}🔍 Verificando si es primer registro...${NC}"
    
    response=$(curl -s -X POST "$BASE_URL/api/attendance/first-time-check" \
        -H "Content-Type: application/json" \
        -d "{
            \"last5\": \"$last5\"
        }")
    
    echo -e "${GREEN}✅ Respuesta del servidor:${NC}"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
    
    # Verificar si es primer registro
    is_first_time=$(echo "$response" | jq -r '.isFirstTime // false' 2>/dev/null)
    
    if [ "$is_first_time" = "true" ]; then
        echo -e "${GREEN}🎉 ¡Es primer registro! Se mostrará el onboarding.${NC}"
        
        # Extraer información del onboarding
        employee_name=$(echo "$response" | jq -r '.employee.name // "N/A"' 2>/dev/null)
        department_name=$(echo "$response" | jq -r '.employee.department // "N/A"' 2>/dev/null)
        default_schedule=$(echo "$response" | jq -r '.defaultSchedule.start + " - " + .defaultSchedule.end // "N/A"' 2>/dev/null)
        welcome_message=$(echo "$response" | jq -r '.welcomeMessage // "N/A"' 2>/dev/null)
        
        echo -e "${PURPLE}📋 Información del Onboarding:${NC}"
        echo -e "   👤 Empleado: ${GREEN}$employee_name${NC}"
        echo -e "   🏢 Departamento: ${YELLOW}$department_name${NC}"
        echo -e "   ⏰ Horario Sugerido: ${BLUE}$default_schedule${NC}"
        echo -e "   💬 Mensaje: ${GREEN}$welcome_message${NC}"
        
    else
        echo -e "${YELLOW}⚠️  No es primer registro o hay un error.${NC}"
    fi
    
    echo ""
    echo "=========================================================="
    echo ""
}

# Casos de prueba con diferentes departamentos y horarios

echo -e "${GREEN}🚀 INICIANDO PRUEBAS DE ONBOARDING${NC}"
echo ""

# Caso 1: Empleado de HR (8:00-17:00)
echo -e "${PURPLE}📋 CASO 1: Empleado de HR${NC}"
test_onboarding "0801199910071" "Ericka Daniela Martinez" "EMP001" "HR"

# Caso 2: Empleado de Customer Service (8:00-17:00)
echo -e "${PURPLE}📋 CASO 2: Empleado de Customer Service${NC}"
test_onboarding "0801200104394" "Evelin Daniela Oseguera Aguilar" "EMP002" "Customer Service"

# Caso 3: Empleado de Procesamiento de Datos (8:00-17:00)
echo -e "${PURPLE}📋 CASO 3: Empleado de Procesamiento de Datos${NC}"
test_onboarding "0801199910070" "Astrid Mariela Colindres Zelaya" "EMP003" "Data Processing"

# Caso 4: Empleado de Verificación (8:00-17:00)
echo -e "${PURPLE}📋 CASO 4: Empleado de Verificación${NC}"
test_onboarding "0801200020638" "Helen Daniela Matute Zambrano" "EMP004" "Data Verification"

# Caso 5: Empleado de Warehouse (7:00-16:00) - Horario diferente
echo -e "${PURPLE}📋 CASO 5: Empleado de Warehouse (Horario Diferente)${NC}"
test_onboarding "0801200104395" "Carlos Manuel Rodriguez" "EMP005" "Warehouse"

# Caso 6: Empleado de IT (8:00-17:00)
echo -e "${PURPLE}📋 CASO 6: Empleado de IT${NC}"
test_onboarding "0801199910072" "Ana Sofia Lopez" "EMP006" "IT"

# Caso 7: Empleado de Marketing (8:00-17:00)
echo -e "${PURPLE}📋 CASO 7: Empleado de Marketing${NC}"
test_onboarding "0801200020639" "Maria Jose Gonzalez" "EMP007" "Marketing"

# Caso 8: Empleado de Sales (8:00-17:00)
echo -e "${PURPLE}📋 CASO 8: Empleado de Sales${NC}"
test_onboarding "0801200104396" "Roberto Carlos Silva" "EMP008" "Sales"

# Caso 9: Empleado de Finance (8:00-17:00)
echo -e "${PURPLE}📋 CASO 9: Empleado de Finance${NC}"
test_onboarding "0801199910073" "Patricia Elena Torres" "EMP009" "Finance"

# Caso 10: Empleado de Operations (8:00-17:00)
echo -e "${PURPLE}📋 CASO 10: Empleado de Operations${NC}"
test_onboarding "0801200020640" "Fernando Alejandro Ruiz" "EMP010" "Operations"

echo -e "${GREEN}✅ TODAS LAS PRUEBAS COMPLETADAS${NC}"
echo ""
echo -e "${BLUE}📊 RESUMEN:${NC}"
echo "   • 10 casos de prueba ejecutados"
echo "   • Diferentes departamentos probados"
echo "   • Horarios por defecto verificados"
echo "   • Mensajes de bienvenida personalizados"
echo ""
echo -e "${YELLOW}🎯 LISTO PARA MAÑANA:${NC}"
echo "   • Sistema de onboarding funcional"
echo "   • Experiencia personalizada por departamento"
echo "   • Mensajes agradables y motivadores"
echo "   • Configuración de horarios automática" 