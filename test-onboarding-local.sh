#!/bin/bash

# Script para simular el sistema de onboarding localmente
# Muestra los mensajes que verán los empleados mañana

echo "🎯 SIMULACIÓN ONBOARDING SYSTEM - PRIMER REGISTRO DE EMPLEADOS"
echo "=============================================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para simular el onboarding
simulate_onboarding() {
    local dni=$1
    local name=$2
    local employee_code=$3
    local department=$4
    local schedule_start=$5
    local schedule_end=$6
    
    echo -e "${BLUE}🧪 SIMULANDO Onboarding para:${NC}"
    echo -e "   👤 Nombre: ${GREEN}$name${NC}"
    echo -e "   🆔 Código: ${YELLOW}$employee_code${NC}"
    echo -e "   📋 DNI: ${PURPLE}$dni${NC}"
    echo -e "   🏢 Departamento: ${YELLOW}$department${NC}"
    echo ""
    
    # Extraer últimos 5 dígitos del DNI
    local last5=${dni: -5}
    echo -e "${YELLOW}📝 Últimos 5 dígitos del DNI: ${PURPLE}$last5${NC}"
    echo ""
    
    echo -e "${GREEN}🎉 ¡Es tu primer registro! Bienvenido al sistema.${NC}"
    echo ""
    
    # Simular respuesta del servidor
    echo -e "${CYAN}📡 Respuesta del servidor (simulada):${NC}"
    cat << EOF
{
  "isFirstTime": true,
  "employee": {
    "id": "uuid-empleado",
    "name": "$name",
    "employee_code": "$employee_code",
    "department": "$department",
    "department_id": "dept-uuid"
  },
  "currentSchedule": null,
  "defaultSchedule": {
    "start": "$schedule_start",
    "end": "$schedule_end"
  },
  "needsScheduleVerification": true,
  "welcomeMessage": "¡Bienvenido $name! Es un placer tenerte en nuestro equipo. Vamos a configurar tu horario de trabajo para que puedas comenzar a registrar tu asistencia de manera eficiente."
}
EOF
    echo ""
    
    # Mostrar mensajes que verá el empleado
    echo -e "${PURPLE}💬 MENSAJES QUE VERÁ EL EMPLEADO:${NC}"
    echo ""
    
    echo -e "${GREEN}🎉 PASO 1: BIENVENIDA${NC}"
    echo -e "   ┌─────────────────────────────────────────────────────────┐"
    echo -e "   │                    🎉 ¡BIENVENIDO! 🎉                    │"
    echo -e "   │                                                         │"
    echo -e "   │  ¡Hola $name!                                           │"
    echo -e "   │                                                         │"
    echo -e "   │  Es un placer tenerte en nuestro equipo. Vamos a       │"
    echo -e "   │  configurar tu horario de trabajo para que puedas      │"
    echo -e "   │  comenzar a registrar tu asistencia de manera          │"
    echo -e "   │  eficiente.                                             │"
    echo -e "   │                                                         │"
    echo -e "   │  📋 Información del Empleado:                          │"
    echo -e "   │     • Nombre: $name                                    │"
    echo -e "   │     • Código: $employee_code                           │"
    echo -e "   │     • Departamento: $department                        │"
    echo -e "   └─────────────────────────────────────────────────────────┘"
    echo ""
    
    echo -e "${YELLOW}⏰ PASO 2: CONFIGURACIÓN DE HORARIO${NC}"
    echo -e "   ┌─────────────────────────────────────────────────────────┐"
    echo -e "   │                ⏰ CONFIGURACIÓN DE HORARIO               │"
    echo -e "   │                                                         │"
    echo -e "   │  Basado en tu departamento ($department),               │"
    echo -e "   │  tu horario sugerido es:                               │"
    echo -e "   │                                                         │"
    echo -e "   │  🕐 $schedule_start - $schedule_end                    │"
    echo -e "   │                                                         │"
    echo -e "   │  ¿Es correcto tu horario de trabajo?                   │"
    echo -e "   │  Puedes ajustarlo si es necesario.                     │"
    echo -e "   └─────────────────────────────────────────────────────────┘"
    echo ""
    
    echo -e "${PURPLE}🏆 PASO 3: SISTEMA DE GAMIFICACIÓN${NC}"
    echo -e "   ┌─────────────────────────────────────────────────────────┐"
    echo -e "   │              🏆 SISTEMA DE GAMIFICACIÓN                 │"
    echo -e "   │                                                         │"
    echo -e "   │  ¡Gana puntos y logros por tu puntualidad!             │"
    echo -e "   │                                                         │"
    echo -e "   │  🎯 CÓMO GANAR PUNTOS:                                 │"
    echo -e "   │     ✅ +5 puntos por registrar asistencia              │"
    echo -e "   │     ⏰ +3 puntos por llegar temprano (5+ min antes)     │"
    echo -e "   │     🎯 +2 puntos por puntualidad (máximo 5 min tarde)  │"
    echo -e "   │     ⭐ +5 puntos por asistencia perfecta               │"
    echo -e "   │                                                         │"
    echo -e "   │  🏅 LOGROS ESPECIALES:                                 │"
    echo -e "   │     📅 Semana Perfecta: 5 días puntuales = +50 puntos  │"
    echo -e "   │     🌅 Early Bird: 3 días temprano = +30 puntos        │"
    echo -e "   │     📊 Consistencia: 30 días sin tardanzas = +100 pts  │"
    echo -e "   │                                                         │"
    echo -e "   │  📈 BENEFICIOS:                                        │"
    echo -e "   │     🏆 Acceso a leaderboards de empleados destacados   │"
    echo -e "   │     🎁 Posibilidad de reconocimientos y premios        │"
    echo -e "   │     📊 Seguimiento de tu progreso personal             │"
    echo -e "   └─────────────────────────────────────────────────────────┘"
    echo ""
    
    echo "=============================================================="
    echo ""
}

# Casos de prueba con diferentes departamentos

echo -e "${GREEN}🚀 INICIANDO SIMULACIÓN DE ONBOARDING${NC}"
echo ""

# Caso 1: Empleado de HR (8:00-17:00)
echo -e "${PURPLE}📋 CASO 1: Empleado de HR${NC}"
simulate_onboarding "0801199910071" "Ericka Daniela Martinez" "EMP001" "HR" "08:00" "17:00"

# Caso 2: Empleado de Customer Service (8:00-17:00)
echo -e "${PURPLE}📋 CASO 2: Empleado de Customer Service${NC}"
simulate_onboarding "0801200104394" "Evelin Daniela Oseguera Aguilar" "EMP002" "Customer Service" "08:00" "17:00"

# Caso 3: Empleado de Procesamiento de Datos (8:00-17:00)
echo -e "${PURPLE}📋 CASO 3: Empleado de Procesamiento de Datos${NC}"
simulate_onboarding "0801199910070" "Astrid Mariela Colindres Zelaya" "EMP003" "Data Processing" "08:00" "17:00"

# Caso 4: Empleado de Verificación (8:00-17:00)
echo -e "${PURPLE}📋 CASO 4: Empleado de Verificación${NC}"
simulate_onboarding "0801200020638" "Helen Daniela Matute Zambrano" "EMP004" "Data Verification" "08:00" "17:00"

# Caso 5: Empleado de Warehouse (7:00-16:00) - Horario diferente
echo -e "${PURPLE}📋 CASO 5: Empleado de Warehouse (Horario Diferente)${NC}"
simulate_onboarding "0801200104395" "Carlos Manuel Rodriguez" "EMP005" "Warehouse" "07:00" "16:00"

# Caso 6: Empleado de IT (8:00-17:00)
echo -e "${PURPLE}📋 CASO 6: Empleado de IT${NC}"
simulate_onboarding "0801199910072" "Ana Sofia Lopez" "EMP006" "IT" "08:00" "17:00"

# Caso 7: Empleado de Marketing (8:00-17:00)
echo -e "${PURPLE}📋 CASO 7: Empleado de Marketing${NC}"
simulate_onboarding "0801200020639" "Maria Jose Gonzalez" "EMP007" "Marketing" "08:00" "17:00"

# Caso 8: Empleado de Sales (8:00-17:00)
echo -e "${PURPLE}📋 CASO 8: Empleado de Sales${NC}"
simulate_onboarding "0801200104396" "Roberto Carlos Silva" "EMP008" "Sales" "08:00" "17:00"

# Caso 9: Empleado de Finance (8:00-17:00)
echo -e "${PURPLE}📋 CASO 9: Empleado de Finance${NC}"
simulate_onboarding "0801199910073" "Patricia Elena Torres" "EMP009" "Finance" "08:00" "17:00"

# Caso 10: Empleado de Operations (8:00-17:00)
echo -e "${PURPLE}📋 CASO 10: Empleado de Operations${NC}"
simulate_onboarding "0801200020640" "Fernando Alejandro Ruiz" "EMP010" "Operations" "08:00" "17:00"

echo -e "${GREEN}✅ SIMULACIÓN COMPLETADA${NC}"
echo ""
echo -e "${BLUE}📊 RESUMEN DE MENSAJES:${NC}"
echo "   • Mensajes personalizados por empleado"
echo "   • Horarios específicos por departamento"
echo "   • Explicación completa del sistema de gamificación"
echo "   • Experiencia agradable y motivadora"
echo ""
echo -e "${YELLOW}🎯 EXPERIENCIA DEL USUARIO:${NC}"
echo "   • Bienvenida cálida y personalizada"
echo "   • Configuración clara del horario"
echo "   • Motivación con sistema de puntos"
echo "   • Interfaz intuitiva y amigable"
echo ""
echo -e "${PURPLE}💡 ÚLTIMOS 5 DÍGITOS PARA PRUEBAS:${NC}"
echo "   • 0071 - Ericka Daniela Martinez (HR)"
echo "   • 4394 - Evelin Daniela Oseguera (Customer Service)"
echo "   • 0070 - Astrid Mariela Colindres (Data Processing)"
echo "   • 0638 - Helen Daniela Matute (Data Verification)"
echo "   • 4395 - Carlos Manuel Rodriguez (Warehouse)"
echo "   • 0072 - Ana Sofia Lopez (IT)"
echo "   • 0639 - Maria Jose Gonzalez (Marketing)"
echo "   • 4396 - Roberto Carlos Silva (Sales)"
echo "   • 0073 - Patricia Elena Torres (Finance)"
echo "   • 0640 - Fernando Alejandro Ruiz (Operations)" 