#!/bin/bash

# INSTRUCCIONES PARA COPILOT - DIAGNÓSTICO COMPLETO DEL PROYECTO
# Ejecutar desde: /Users/jorgearturo/saas-proyecto/

echo "🔍 DIAGNÓSTICO COMPLETO DEL PROYECTO SAAS"
echo "========================================"
echo "Ejecutando desde: $(pwd)"
echo "Fecha: $(date)"
echo ""

# ============================================================================
# FASE 1: ANÁLISIS DE TERRAFORM STATE vs AWS REAL
# ============================================================================

echo "📊 FASE 1: TERRAFORM STATE vs AWS REALITY"
echo "=========================================="

cd terraform 2>/dev/null || { echo "❌ Error: No se puede acceder a directorio terraform"; exit 1; }

echo ""
echo "1.1 🗂️ TERRAFORM STATE ACTUAL:"
echo "Recursos en Terraform State:"
terraform state list | head -20
echo "Total recursos en state: $(terraform state list | wc -l)"

echo ""
echo "1.2 ☁️ RECURSOS REALES EN AWS:"

# EKS Clusters
echo "EKS Clusters en AWS:"
aws eks list-clusters --query 'clusters' --output table 2>/dev/null || echo "❌ Error listando clusters EKS"

# EKS Node Groups
echo ""
echo "EKS Node Groups:"
CLUSTER_NAME="saas-hr-staging-eks"
aws eks list-nodegroups --cluster-name $CLUSTER_NAME --query 'nodegroups' --output table 2>/dev/null || echo "❌ No se pueden listar node groups"

# RDS Instances
echo ""
echo "RDS Instances:"
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus,Engine]' --output table 2>/dev/null || echo "❌ Error listando RDS"

# ElastiCache
echo ""
echo "ElastiCache Clusters:"
aws elasticache describe-replication-groups --query 'ReplicationGroups[*].[ReplicationGroupId,Status]' --output table 2>/dev/null || echo "❌ Error listando ElastiCache"

# VPCs
echo ""
echo "VPCs:"
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,State,Tags[?Key==`Name`].Value|[0]]' --output table 2>/dev/null || echo "❌ Error listando VPCs"

echo ""
echo "1.3 🔍 DISCREPANCIAS IDENTIFICADAS:"

# Verificar si el cluster EKS está en el state
if terraform state list | grep -q "aws_eks_cluster"; then
    echo "✅ EKS Cluster está en Terraform state"
else
    echo "❌ EKS Cluster NO está en Terraform state pero existe en AWS"
fi

# Verificar node groups
if terraform state list | grep -q "aws_eks_node_group"; then
    echo "✅ EKS Node Groups están en Terraform state"
else
    echo "❌ EKS Node Groups NO están en Terraform state"
fi

# ============================================================================
# FASE 2: ANÁLISIS DE KUBERNETES
# ============================================================================

echo ""
echo "📊 FASE 2: ESTADO DE KUBERNETES"
echo "==============================="

echo ""
echo "2.1 🎯 CONFIGURACIÓN DE KUBECTL:"
kubectl config current-context || echo "❌ kubectl no configurado"

echo ""
echo "2.2 🖥️ NODOS DEL CLUSTER:"
kubectl get nodes 2>/dev/null || echo "❌ No se pueden obtener nodos"

echo ""
echo "2.3 📦 PODS EN EL CLUSTER:"
kubectl get pods --all-namespaces | head -10 2>/dev/null || echo "❌ No se pueden obtener pods"

echo ""
echo "2.4 🔍 PODS PROBLEMÁTICOS:"
kubectl get pods --all-namespaces | grep -E "(Pending|Error|CrashLoopBackOff|Failed)" 2>/dev/null || echo "No hay pods problemáticos o kubectl no funciona"

echo ""
echo "2.5 📝 EVENTOS RECIENTES:"
kubectl get events --sort-by=.metadata.creationTimestamp | tail -10 2>/dev/null || echo "❌ No se pueden obtener eventos"

# ============================================================================
# FASE 3: ANÁLISIS DE DOCKER LOCAL
# ============================================================================

echo ""
echo "📊 FASE 3: ESTADO DE DOCKER LOCAL"
echo "================================="

cd .. 2>/dev/null || echo "❌ No se puede volver al directorio raíz"

echo ""
echo "3.1 🐳 CONTENEDORES CORRIENDO:"
docker ps

echo ""
echo "3.2 🖼️ IMÁGENES DISPONIBLES:"
docker images | grep -E "(saas|asistencia|nomina|bases)" 2>/dev/null || echo "No hay imágenes del proyecto"

echo ""
echo "3.3 🌐 NETWORKS DE DOCKER:"
docker network ls | grep saas 2>/dev/null || echo "No hay networks del proyecto"

echo ""
echo "3.4 💾 VOLUMES DE DOCKER:"
docker volume ls | grep saas 2>/dev/null || echo "No hay volumes del proyecto"

# ============================================================================
# FASE 4: ANÁLISIS DE CONFIGURACIÓN
# ============================================================================

echo ""
echo "📊 FASE 4: CONFIGURACIÓN DEL PROYECTO"
echo "====================================="

echo ""
echo "4.1 📁 ESTRUCTURA DEL PROYECTO:"
find . -maxdepth 2 -type f -name "*.yml" -o -name "*.yaml" -o -name "*.tf" -o -name "docker-compose*" -o -name "Dockerfile" | head -20

echo ""
echo "4.2 🔧 ARCHIVOS DE CONFIGURACIÓN TERRAFORM:"
cd terraform 2>/dev/null || echo "❌ No se puede acceder a terraform"
ls -la *.tf *.tfvars 2>/dev/null || echo "❌ No hay archivos terraform"

echo ""
echo "4.3 ⚙️ VARIABLES DE TERRAFORM:"
if [ -f "staging.tfvars" ]; then
    echo "Contenido de staging.tfvars:"
    cat staging.tfvars | head -10
else
    echo "❌ No existe staging.tfvars"
fi

echo ""
echo "4.4 🐳 DOCKER COMPOSE:"
cd .. 2>/dev/null
if [ -f "docker-compose.yml" ]; then
    echo "Docker compose encontrado:"
    grep -E "^  [a-zA-Z]|^[a-zA-Z]" docker-compose.yml | head -10
else
    echo "❌ No existe docker-compose.yml"
fi

# ============================================================================
# FASE 5: DIAGNÓSTICO Y RECOMENDACIONES
# ============================================================================

echo ""
echo "📊 FASE 5: DIAGNÓSTICO Y RECOMENDACIONES"
echo "========================================"

echo ""
echo "5.1 🎯 PROBLEMAS IDENTIFICADOS:"

# Problema principal: Cluster existe pero no está en state
if aws eks describe-cluster --name saas-hr-staging-eks >/dev/null 2>&1; then
    if ! terraform state list | grep -q "aws_eks_cluster"; then
        echo "❌ CRÍTICO: EKS Cluster existe en AWS pero NO en Terraform state"
        echo "   Solución: terraform import module.eks.aws_eks_cluster.this[0] saas-hr-staging-eks"
    fi
fi

# Verificar si hay nodos
NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
if [ "$NODE_COUNT" -eq 0 ]; then
    echo "❌ CRÍTICO: No hay nodos worker en el cluster EKS"
    echo "   Solución: Verificar y crear node groups"
fi

# Verificar pods pending
PENDING_PODS=$(kubectl get pods --no-headers 2>/dev/null | grep Pending | wc -l)
if [ "$PENDING_PODS" -gt 0 ]; then
    echo "❌ PROBLEMA: $PENDING_PODS pods en estado Pending"
    echo "   Causa probable: No hay nodos disponibles"
fi

echo ""
echo "5.2 🚀 PLAN DE ACCIÓN RECOMENDADO:"
echo ""
echo "PASO 1: Importar recursos existentes a Terraform state"
echo "   cd terraform"
echo "   terraform import module.eks.aws_eks_cluster.this[0] saas-hr-staging-eks"
echo ""
echo "PASO 2: Sincronizar state con realidad"
echo "   terraform refresh -var-file=staging.tfvars"
echo ""
echo "PASO 3: Aplicar configuración completa"
echo "   terraform apply -var-file=staging.tfvars"
echo ""
echo "PASO 4: Verificar que los nodos se creen"
echo "   kubectl get nodes -w"
echo ""
echo "PASO 5: Verificar que los pods se ejecuten"
echo "   kubectl get pods -w"

echo ""
echo "5.3 📊 ESTADO ACTUAL RESUMIDO:"
echo "Docker Local: $(docker ps | grep -c saas 2>/dev/null || echo 0) contenedores corriendo"
echo "AWS EKS: $(aws eks list-clusters --query 'length(clusters)' --output text 2>/dev/null || echo 0) clusters"
echo "Kubernetes Nodos: $(kubectl get nodes --no-headers 2>/dev/null | wc -l || echo 0) nodos"
echo "Kubernetes Pods: $(kubectl get pods --no-headers 2>/dev/null | wc -l || echo 0) pods"
echo "Terraform Resources: $(terraform state list 2>/dev/null | wc -l || echo 0) recursos en state"

echo ""
echo "✅ DIAGNÓSTICO COMPLETO TERMINADO"
echo "================================="
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Revisar los problemas identificados arriba"
echo "2. Ejecutar el plan de acción paso a paso"
echo "3. Monitorear el progreso con los comandos watch"
echo ""
echo "🆘 SI NECESITAS AYUDA:"
echo "- Ejecuta cada paso del plan de acción uno por uno"
echo "- Verifica que no haya errores antes de continuar"
echo "- Usa 'terraform plan' antes de 'terraform apply'"
