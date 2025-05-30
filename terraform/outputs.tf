output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "website_bucket_name" {
  description = "Name of the S3 bucket for website hosting"
  value       = module.website.website_bucket_name
}

output "website_endpoint" {
  description = "S3 website endpoint"
  value       = module.website.website_endpoint
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.website.cloudfront_distribution_id
}
