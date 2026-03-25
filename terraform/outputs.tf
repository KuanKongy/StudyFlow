output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  value = module.vpc.private_subnet_ids
}

output "ecr_api_repository_url" {
  value = module.ecr.api_repository_url
}

output "ecr_worker_repository_url" {
  value = module.ecr.worker_repository_url
}

output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "cloudfront_domain_name" {
  value = module.frontend.cloudfront_domain_name
}

output "frontend_bucket_name" {
  value = module.frontend.bucket_name
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "api_service_name" {
  value = module.ecs.api_service_name
}

output "worker_service_name" {
  value = module.ecs.worker_service_name
}
