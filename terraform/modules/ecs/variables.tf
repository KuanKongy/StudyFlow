variable "name_prefix" {
  type = string
}

variable "region" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "ecs_security_group_id" {
  type = string
}

variable "target_group_arn" {
  type = string
}

variable "api_image_uri" {
  type = string
}

variable "worker_image_uri" {
  type = string
}

variable "api_cpu" {
  type = number
}

variable "api_memory" {
  type = number
}

variable "worker_cpu" {
  type = number
}

variable "worker_memory" {
  type = number
}

variable "api_desired_count" {
  type = number
}

variable "worker_desired_count" {
  type = number
}

variable "api_min_capacity" {
  type = number
}

variable "api_max_capacity" {
  type = number
}

variable "worker_min_capacity" {
  type = number
}

variable "worker_max_capacity" {
  type = number
}

variable "api_cpu_target_utilization" {
  type = number
}

variable "worker_cpu_target_utilization" {
  type = number
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

variable "log_retention_days" {
  type = number
}

variable "tags" {
  type = map(string)
}
