variable "name_prefix" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "alb_arn_suffix" {
  type        = string
  description = "aws_lb.this.arn_suffix for CloudWatch dimensions"
}

variable "target_group_arn_suffix" {
  type        = string
  description = "aws_lb_target_group.api.arn_suffix"
}

variable "alb_5xx_threshold" {
  type        = number
  default     = 5
  description = "Alarm when sum of target 5xx over 5m exceeds this"
}

variable "alert_email" {
  type        = string
  default     = ""
  description = "Optional email for SNS subscription (confirm in AWS console)"
}

variable "tags" {
  type    = map(string)
  default = {}
}
