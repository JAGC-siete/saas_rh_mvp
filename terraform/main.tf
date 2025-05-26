module "vpc" {
  source = "./modules/vpc"
  
  aws_region       = var.aws_region
  environment      = var.environment
  project_name     = var.project_name
  vpc_cidr         = var.vpc_cidr
  azs              = var.azs
  private_subnets  = var.private_subnets
  public_subnets   = var.public_subnets
  database_subnets = var.database_subnets
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

module "kms" {
  source = "./modules/kms"
  
  environment          = var.environment
  project_name         = var.project_name
  eks_cluster_role_arn = ""  # Will be updated after EKS is created
  
  tags = {
    Environment = var.environment_tag
    Team        = var.team_tag
    CostCenter  = var.cost_center_tag
  }
}

module "eks" {
  source = "./modules/eks"
  
  aws_region                  = var.aws_region
  environment                 = var.environment
  project_name                = var.project_name
  vpc_id                      = module.vpc.vpc_id
  private_subnets            = module.vpc.private_subnets
  kms_key_arn                = module.kms.key_arn
  
  cluster_version = var.cluster_version
  instance_types  = var.instance_types
  min_size        = var.min_size
  max_size        = var.max_size
  desired_size    = var.desired_size
}

module "rds" {
  source = "./modules/rds"
  
  environment              = var.environment
  project_name            = var.project_name
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnets
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  backup_retention_period = var.db_backup_retention_period
  kms_key_arn            = module.kms.key_arn
  monitoring_role_arn     = module.monitoring.rds_monitoring_role_arn

  depends_on = [module.vpc, module.kms, module.monitoring]
}

module "elasticache" {
  source = "./modules/elasticache"
  
  environment          = var.environment
  project_name         = var.project_name
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.database_subnets
  node_type            = var.cache_node_type
  num_cache_nodes      = var.cache_num_cache_nodes
  kms_key_arn          = module.kms.key_arn
  eks_security_group_id = module.eks.node_security_group_id
  tags                 = {
    Environment = var.environment_tag
    Team        = var.team_tag
    CostCenter  = var.cost_center_tag
  }

  depends_on = [module.vpc, module.kms, module.eks]
}

module "monitoring" {
  source = "./modules/monitoring"

  environment            = var.environment
  project_name          = var.project_name
  aws_region            = var.aws_region
  eks_cluster_name      = module.eks.cluster_name
  rds_instance_id       = module.rds.rds_id
  elasticache_cluster_id = module.elasticache.cluster_id
  alert_email           = var.alert_email

  depends_on = [module.eks, module.rds, module.elasticache]
}

# Add security group rules after all resources are created
module "security_rules" {
  source = "./modules/security_rules"
  
  eks_node_security_group_id    = module.eks.node_security_group_id
  rds_security_group_id        = module.rds.db_security_group_id
  elasticache_security_group_id = module.elasticache.redis_security_group_id

  depends_on = [
    module.eks,
    module.rds,
    module.elasticache
  ]
}

module "dns" {
  source = "./modules/dns"
  
  domain_name    = "humanosisu.com"
  alb_dns_name   = ""  # Empty for now
  alb_zone_id    = ""  # Empty for now
  environment    = var.environment
  project_name   = var.project_name
  
  depends_on = [module.eks]
}
