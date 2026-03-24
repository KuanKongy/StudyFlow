variable "name_prefix" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "cloudfront_certificate_arn" {
  type = string
}

variable "alb_dns_name" {
  type = string
}

variable "alb_origin_id" {
  type = string
}

variable "tags" {
  type = map(string)
}
