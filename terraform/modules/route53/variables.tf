variable "hosted_zone_id" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "cloudfront_domain_name" {
  type = string
}

variable "cloudfront_hosted_zone_id" {
  type = string
}

variable "create_api_subdomain_record" {
  type = bool
}

variable "api_subdomain_name" {
  type = string
}

variable "alb_dns_name" {
  type = string
}

variable "alb_zone_id" {
  type = string
}
