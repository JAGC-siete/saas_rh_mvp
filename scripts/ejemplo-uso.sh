#!/bin/bash

# SCRIPT DE EJEMPLO: Configuración Automática de Clientes HR SaaS
# Este script demuestra cómo usar los scripts de configuración automática

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 EJEMPLO DE CONFIGURACIÓN AUTOMÁTICA PARA CLIENTES HR SaaS${NC}"
echo ""

# Ejemplo 1: Empresa pequeña (10 empleados, 2 departamentos)
echo -e "${GREEN}📋 Ejemplo 1: Empresa Pequeña${NC}"
echo "Empresa: 'Startup Tech'"
echo "Empleados: 10"
echo "Departamentos: 2"
echo ""

echo -e "${YELLOW}Ejecutando script JavaScript...${NC}"
node scripts/auto-setup-client.js "Startup Tech" 10 2

echo ""
echo -e "${YELLOW}Ejecutando script Bash...${NC}"
./scripts/auto-setup-client.sh "Startup Tech" 10 2

echo ""
echo ""

# Ejemplo 2: Empresa mediana (25 empleados, 5 departamentos)
echo -e "${GREEN}📋 Ejemplo 2: Empresa Mediana${NC}"
echo "Empresa: 'Corporación Industrial'"
echo "Empleados: 25"
echo "Departamentos: 5"
echo ""

echo -e "${YELLOW}Ejecutando script JavaScript...${NC}"
node scripts/auto-setup-client.js "Corporación Industrial" 25 5

echo ""
echo -e "${YELLOW}Ejecutando script Bash...${NC}"
./scripts/auto-setup-client.sh "Corporación Industrial" 25 5

echo ""
echo ""

# Ejemplo 3: Empresa grande (50 empleados, 8 departamentos)
echo -e "${GREEN}📋 Ejemplo 3: Empresa Grande${NC}"
echo "Empresa: 'Multinacional S.A.'"
echo "Empleados: 50"
echo "Departamentos: 8"
echo ""

echo -e "${YELLOW}Ejecutando script JavaScript...${NC}"
node scripts/auto-setup-client.js "Multinacional S.A." 50 8

echo ""
echo -e "${YELLOW}Ejecutando script Bash...${NC}"
./scripts/auto-setup-client.sh "Multinacional S.A." 50 8

echo ""
echo ""

# Mostrar archivos generados
echo -e "${BLUE}📁 Archivos SQL generados:${NC}"
ls -la setup-client-*.sql 2>/dev/null || echo "No se encontraron archivos SQL"

echo ""
echo -e "${BLUE}🎯 RESUMEN DE LA DEMOSTRACIÓN:${NC}"
echo "✅ Se han generado scripts SQL para 3 empresas de diferentes tamaños"
echo "✅ Cada script incluye:"
echo "   - Configuración de empresa con subdomain automático"
echo "   - Departamentos con nombres y descripciones apropiados"
echo "   - Empleados con nombres bíblicos y datos realistas"
echo "   - Horarios de trabajo estándar"
echo "   - Sistema de permisos predefinido"
echo "   - Gamificación configurada"
echo ""
echo -e "${YELLOW}📖 Para más información, consulta: scripts/AUTO_SETUP_README.md${NC}"
echo ""
echo -e "${GREEN}✨ Demostración completada exitosamente!${NC}"
