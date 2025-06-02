terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

locals {
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  )
}

# CloudWatch Dashboard for overall infrastructure monitoring
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-v2"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id],
            [".", "FreeableMemory", ".", "."],
            [".", "ReadIOPS", ".", "."],
            [".", "WriteIOPS", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Metrics"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", var.elasticache_cluster_id],
            [".", "FreeableMemory", ".", "."],
            [".", "CurrConnections", ".", "."],
            [".", "CacheHits", ".", "."],
            [".", "CacheMisses", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ElastiCache Metrics"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/EKS", "cluster_failed_node_count", "ClusterName", var.eks_cluster_name],
            [".", "cluster_node_count", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "EKS Node Metrics"
        }
      }
    ]
  })
}

# Create CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "rds" {
  name              = "/aws/rds/instance/${var.rds_instance_id}-v2/postgresql"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${var.eks_cluster_name}-v2/cluster"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "elasticache" {
  name              = "/aws/elasticache/${var.elasticache_cluster_id}-v2"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}
