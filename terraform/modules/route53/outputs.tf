output "apex_record_fqdn" {
  value = aws_route53_record.apex_cloudfront.fqdn
}

output "api_record_fqdn" {
  value = try(aws_route53_record.api_alb[0].fqdn, null)
}
