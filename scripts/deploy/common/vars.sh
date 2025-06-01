#!/bin/zsh

# AWS Configuration
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="826726045450"
export CLUSTER_NAME="saas-rh-staging"

# Service Configuration
export SERVICES=("bases_de_datos" "asistencia" "nomina")
declare -A REPO_NAMES=(
  ["bases_de_datos"]="bases_de_datos"
  ["asistencia"]="asistencia"
  ["nomina"]="nomina"
)
export REPO_NAMES

# Docker Configuration
export DOCKER_PLATFORM="linux/amd64"  # For M1 Mac compatibility

# Kubernetes Configuration
export K8S_MANIFEST_PATH="k8s/base/services/"  # Path to k8s manifests
export K8S_NAMESPACE="saas-rh"        # Namespace for deployments
export DEPLOYMENT_TIMEOUT="300s"
