resource "aws_route53_record" "apex_cloudfront" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_alb" {
  count   = var.create_api_subdomain_record ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.api_subdomain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
