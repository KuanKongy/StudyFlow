variable "aws_region" {
  type    = string
  default = "ca-central-1"
}

variable "project_name" {
  type    = string
  default = "studyflow"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.1.0/24", "10.20.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.11.0/24", "10.20.12.0/24"]
}

variable "domain_name" {
  type    = string
  default = "studyflow.biz"
}

variable "route53_hosted_zone_id" {
  type = string
}

variable "create_api_subdomain_record" {
  type    = bool
  default = false
}

variable "api_subdomain_name" {
  type    = string
  default = "api.studyflow.biz"
}

variable "alb_certificate_arn" {
  type = string
}

variable "cloudfront_certificate_arn" {
  type = string
}

variable "api_image_uri" {
  type = string
}

variable "worker_image_uri" {
  type = string
}

variable "api_cpu" {
  type    = number
  default = 512
}

variable "api_memory" {
  type    = number
  default = 1024
}

variable "worker_cpu" {
  type    = number
  default = 512
}

variable "worker_memory" {
  type    = number
  default = 1024
}

variable "api_desired_count" {
  type    = number
  default = 1
}

variable "worker_desired_count" {
  type    = number
  default = 1
}

variable "api_min_capacity" {
  type    = number
  default = 1
}

variable "api_max_capacity" {
  type    = number
  default = 4
}

variable "worker_min_capacity" {
  type    = number
  default = 1
}

variable "worker_max_capacity" {
  type    = number
  default = 2
}

variable "api_cpu_target_utilization" {
  type    = number
  default = 70
}

variable "worker_cpu_target_utilization" {
  type    = number
  default = 75
}

variable "mongodb_uri_secret_arn" {
  type = string
}

variable "redis_url_secret_arn" {
  type = string
}

variable "openai_api_key_secret_arn" {
  type = string
}

variable "auth0_domain" {
  type = string
}

variable "auth0_audience" {
  type = string
}

variable "frontend_auth0_domain" {
  type = string
}

variable "frontend_auth0_client_id" {
  type = string
}

variable "frontend_auth0_audience" {
  type = string
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "observability_alert_email" {
  type        = string
  default     = ""
  description = "Optional email for SNS subscription on CloudWatch alarms (confirm subscription in AWS console)"
}

variable "tags" {
  type    = map(string)
  default = {}
}
