# Temporarily commented out until EKS module outputs are properly configured
# output "cluster_endpoint" {
#   description = "Endpoint for EKS control plane"
#   value       = module.eks.cluster_endpoint
# }
#
# output "cluster_name" {
#   description = "Name of the EKS cluster"
#   value       = module.eks.cluster_name
# }
#
# output "cluster_security_group_id" {
#   description = "Security group ID for the cluster"
#   value       = module.eks.cluster_security_group_id
# }
#
# output "node_security_group_id" {
#   description = "Security group ID for the node groups"
#   value       = module.eks.node_security_group_id
# }
