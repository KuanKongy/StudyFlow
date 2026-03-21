locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )
}

module "vpc" {
  source = "./modules/vpc"

  name_prefix          = local.name_prefix
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  tags                 = local.common_tags
}

module "ecr" {
  source = "./modules/ecr"

  name_prefix = local.name_prefix
  tags        = local.common_tags
}

module "security_groups" {
  source = "./modules/security_groups"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  tags        = local.common_tags
}

module "alb" {
  source = "./modules/alb"

  name_prefix           = local.name_prefix
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.security_groups.alb_security_group_id
  certificate_arn       = var.alb_certificate_arn
  tags                  = local.common_tags
}

module "frontend" {
  source = "./modules/frontend"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name_prefix                = local.name_prefix
  domain_name                = var.domain_name
  cloudfront_certificate_arn = var.cloudfront_certificate_arn
  alb_dns_name               = module.alb.alb_dns_name
  alb_origin_id              = module.alb.alb_origin_id
  tags                       = local.common_tags
}

module "ecs" {
  source = "./modules/ecs"

  name_prefix                   = local.name_prefix
  region                        = var.aws_region
  private_subnet_ids            = module.vpc.private_subnet_ids
  ecs_security_group_id         = module.security_groups.ecs_security_group_id
  target_group_arn              = module.alb.target_group_arn
  api_image_uri                 = var.api_image_uri
  worker_image_uri              = var.worker_image_uri
  api_cpu                       = var.api_cpu
  api_memory                    = var.api_memory
  worker_cpu                    = var.worker_cpu
  worker_memory                 = var.worker_memory
  api_desired_count             = var.api_desired_count
  worker_desired_count          = var.worker_desired_count
  api_min_capacity              = var.api_min_capacity
  api_max_capacity              = var.api_max_capacity
  worker_min_capacity           = var.worker_min_capacity
  worker_max_capacity           = var.worker_max_capacity
  api_cpu_target_utilization    = var.api_cpu_target_utilization
  worker_cpu_target_utilization = var.worker_cpu_target_utilization
  mongodb_uri_secret_arn        = var.mongodb_uri_secret_arn
  redis_url_secret_arn          = var.redis_url_secret_arn
  openai_api_key_secret_arn     = var.openai_api_key_secret_arn
  auth0_domain                  = var.auth0_domain
  auth0_audience                = var.auth0_audience
  log_retention_days            = var.log_retention_days
  tags                          = local.common_tags
}

module "route53" {
  source = "./modules/route53"

  hosted_zone_id              = var.route53_hosted_zone_id
  domain_name                 = var.domain_name
  cloudfront_domain_name      = module.frontend.cloudfront_domain_name
  cloudfront_hosted_zone_id   = module.frontend.cloudfront_hosted_zone_id
  create_api_subdomain_record = var.create_api_subdomain_record
  api_subdomain_name          = var.api_subdomain_name
  alb_dns_name                = module.alb.alb_dns_name
  alb_zone_id                 = module.alb.alb_zone_id
}
