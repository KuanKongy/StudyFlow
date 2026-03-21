aws_region   = "ca-central-1"
project_name = "studyflow"
environment  = "prod"

vpc_cidr             = "10.20.0.0/16"
public_subnet_cidrs  = ["10.20.1.0/24", "10.20.2.0/24"]
private_subnet_cidrs = ["10.20.11.0/24", "10.20.12.0/24"]

domain_name                 = "studyflow.biz"
create_api_subdomain_record = false
api_subdomain_name          = "api.studyflow.biz"

api_cpu       = 512
api_memory    = 1024
worker_cpu    = 512
worker_memory = 1024

api_desired_count    = 1
worker_desired_count = 1
api_min_capacity     = 1
api_max_capacity     = 4
worker_min_capacity  = 1
worker_max_capacity  = 2

api_cpu_target_utilization    = 70
worker_cpu_target_utilization = 75

log_retention_days = 30
