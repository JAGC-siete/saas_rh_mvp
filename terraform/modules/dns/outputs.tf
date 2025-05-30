output "zone_id" {
  description = "Zone ID of the Route53 zone"
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "Name servers for the Route53 zone"
  value       = aws_route53_zone.main.name_servers
}
