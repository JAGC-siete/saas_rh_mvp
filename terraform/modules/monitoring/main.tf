terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["SAAS-RH", "ResponseTime", "Service", "bases_de_datos"],
            ["SAAS-RH", "ResponseTime", "Service", "asistencia"],
            ["SAAS-RH", "ResponseTime", "Service", "nomina"]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Response Times"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["SAAS-RH", "ErrorCount", "Service", "bases_de_datos"],
            ["SAAS-RH", "ErrorCount", "Service", "asistencia"],
            ["SAAS-RH", "ErrorCount", "Service", "nomina"]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Error Count"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["SAAS-RH", "MemoryUsageMB", "Service", "bases_de_datos"],
            ["SAAS-RH", "MemoryUsageMB", "Service", "asistencia"],
            ["SAAS-RH", "MemoryUsageMB", "Service", "nomina"]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Memory Usage"
        }
      }
    ]
  })
}

# Critical Alarms
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.project_name}-high-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "ErrorCount"
  namespace          = "SAAS-RH"
  period             = "300"
  statistic          = "Sum"
  threshold          = "10"
  alarm_description  = "This metric monitors error rate across all services"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    Service = "bases_de_datos"
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts-${var.environment}"
}

# Log Group for each service
resource "aws_cloudwatch_log_group" "services" {
  for_each = toset(["bases-de-datos", "asistencia", "nomina"])

  name              = "/saas-rh/${each.key}"
  retention_in_days = 30  # MVP: 30 days retention

  tags = {
    Environment = var.environment
    Service     = each.key
  }
  }
