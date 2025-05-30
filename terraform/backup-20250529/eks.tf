locals {
  cluster_name = "sisu-cluster"
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = local.cluster_name
  cluster_version = "1.27"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  # Configuración mejorada para los nodos
  eks_managed_node_groups = {
    default = {
      min_size     = 1
      max_size     = 3
      desired_size = 2

      instance_types = ["t3.medium"]
      
      # Evitar ciclos de dependencia con etiquetas explícitas
      labels = {
        Environment = "staging"
        Project     = "sisu"
      }

      tags = {
        ExtraTag = "managed-node-group"
      }
    }
  }

  # Evitar ciclos de dependencia en la gestión de roles IAM
  manage_aws_auth_configmap = true
  
  # Configuración de logging
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  tags = {
    Environment = "staging"
    Project     = "sisu"
    Terraform   = "true"
  }
}

# Esperar a que el cluster esté listo antes de continuar
resource "time_sleep" "wait_for_cluster" {
  depends_on = [module.eks]
  create_duration = "30s"
}
