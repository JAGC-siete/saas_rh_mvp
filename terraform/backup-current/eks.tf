locals {
  cluster_name = "sisu-cluster"
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  depends_on = [module.vpc]

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
      
      # Configuración explícita de IAM para evitar el error for_each
      iam_role_additional_policies = {
        AmazonEKSWorkerNodePolicy          = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
        AmazonEC2ContainerRegistryReadOnly = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
        AmazonEKS_CNI_Policy               = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
      }
      
      create_iam_role          = true
      iam_role_use_name_prefix = false
      iam_role_name           = "eks-node-group-sisu"
      
      # Mantener las etiquetas existentes
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
