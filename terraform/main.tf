provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "./modules/vpc"
  
  environment      = var.environment
  project_name     = var.project_name
  vpc_cidr         = var.vpc_cidr
  azs              = var.azs
  private_subnets  = var.private_subnets
  public_subnets   = var.public_subnets
  database_subnets = var.database_subnets
}

module "eks" {
  source = "./modules/eks"
  
  environment     = var.environment
  project_name    = var.project_name
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  
  cluster_version = var.cluster_version
  instance_types  = var.instance_types
  min_size        = var.min_size
  max_size        = var.max_size
  desired_size    = var.desired_size

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

module "rds" {
  source = "./modules/rds"
  
  environment              = var.environment
  project_name             = var.project_name
  vpc_id                  = module.vpc.vpc_id
  subnets                 = module.vpc.private_subnets
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  backup_retention_period = var.db_backup_retention_period

  tags = {
    Environment = var.environment_tag
    Team        = var.team_tag
    CostCenter  = var.cost_center_tag
  }
}

module "elasticache" {
  source = "./modules/elasticache"
  
  environment       = var.environment
  project_name      = var.project_name
  vpc_id            = module.vpc.vpc_id
  subnets           = module.vpc.private_subnets
  node_type         = var.cache_node_type
  num_cache_nodes   = var.cache_num_cache_nodes

  tags = {
    Environment = var.environment_tag
    Team        = var.team_tag
    CostCenter  = var.cost_center_tag
  }
}

module "monitoring" {
  source = "./modules/monitoring"

  environment  = var.environment
  project_name = var.project_name
  aws_region   = var.aws_region

  depends_on = [module.eks, module.rds, module.elasticache]
}
