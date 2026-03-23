locals {
  api_log_group    = "/ecs/${var.name_prefix}-api"
  worker_log_group = "/ecs/${var.name_prefix}-worker"
  secret_arns      = [var.mongodb_uri_secret_arn, var.redis_url_secret_arn, var.openai_api_key_secret_arn]
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "api" {
  name              = local.api_log_group
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = local.worker_log_group
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_iam_role" "execution" {
  name = "${var.name_prefix}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "execution_default" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "${var.name_prefix}-ecs-secrets"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = local.secret_arns
      }
    ]
  })
}

resource "aws_iam_role" "task" {
  name = "${var.name_prefix}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name_prefix}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.api_cpu)
  memory                   = tostring(var.api_memory)
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.api_image_uri
      essential = true
      portMappings = [
        {
          containerPort = 4000
          hostPort      = 4000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "AUTH0_DOMAIN", value = var.auth0_domain },
        { name = "AUTH0_AUDIENCE", value = var.auth0_audience }
      ]
      secrets = [
        { name = "MONGO_URL", valueFrom = var.mongodb_uri_secret_arn },
        { name = "REDIS_URL", valueFrom = var.redis_url_secret_arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = local.api_log_group
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.name_prefix}-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.worker_cpu)
  memory                   = tostring(var.worker_memory)
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "worker"
      image     = var.worker_image_uri
      essential = true
      secrets = [
        { name = "MONGO_URL", valueFrom = var.mongodb_uri_secret_arn },
        { name = "REDIS_URL", valueFrom = var.redis_url_secret_arn },
        { name = "OPENAI_API_KEY", valueFrom = var.openai_api_key_secret_arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = local.worker_log_group
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_service" "api" {
  name            = "${var.name_prefix}-api"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  launch_type     = "FARGATE"
  desired_count   = var.api_desired_count

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "api"
    container_port   = 4000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [
    aws_cloudwatch_log_group.api
  ]

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = var.tags
}

resource "aws_ecs_service" "worker" {
  name            = "${var.name_prefix}-worker"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.worker.arn
  launch_type     = "FARGATE"
  desired_count   = var.worker_desired_count

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [
    aws_cloudwatch_log_group.worker
  ]

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = var.tags
}

resource "aws_appautoscaling_target" "api" {
  max_capacity       = var.api_max_capacity
  min_capacity       = var.api_min_capacity
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "${var.name_prefix}-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = var.api_cpu_target_utilization

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_target" "worker" {
  max_capacity       = var.worker_max_capacity
  min_capacity       = var.worker_min_capacity
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.worker.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "worker_cpu" {
  name               = "${var.name_prefix}-worker-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.worker.resource_id
  scalable_dimension = aws_appautoscaling_target.worker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = var.worker_cpu_target_utilization

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
