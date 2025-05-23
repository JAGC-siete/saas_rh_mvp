environment = "staging"
project_name = "saas-rh"
aws_region = "us-east-1"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
azs = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnets = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

# EKS Configuration
cluster_version = "1.27"
instance_types = ["t3.medium"]
min_size = 2
max_size = 5
desired_size = 2

# RDS Configuration
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_max_allocated_storage = 100
db_backup_retention_period = 7

# ElastiCache Configuration
cache_node_type = "cache.t3.micro"
cache_num_cache_nodes = 1

# Monitoring Configuration
enable_detailed_monitoring = true
log_retention_in_days = 30

# Tags
environment_tag = "staging"
team_tag = "devops"
cost_center_tag = "saas-rh-staging"
