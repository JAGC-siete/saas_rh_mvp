resource "aws_route53_zone" "main" {
  name = var.domain_name
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# This resource will be populated when ALB is created
resource "aws_route53_record" "alb" {
  count = var.alb_dns_name != "" ? 1 : 0
  
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
