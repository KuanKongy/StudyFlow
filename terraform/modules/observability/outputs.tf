output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "Subscribe email in AWS console or add endpoints for alarm notifications"
}

output "dashboard_name" {
  value = aws_cloudwatch_dashboard.studyflow.dashboard_name
}
