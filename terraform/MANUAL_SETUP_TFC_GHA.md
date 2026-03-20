# Manual Setup Checklist (Terraform Cloud + GitHub Actions)

For CI/CD and Terraform orientation, see [`../.github/workflows/README.md`](../.github/workflows/README.md) and [`README.md`](README.md) in this directory.

This project uses Terraform Cloud for remote state plus CLI-driven local execution in GitHub Actions.
Terraform commands run in GitHub runners, while state is stored in Terraform Cloud.

## 1) Terraform Cloud workspace

- Create or select the Terraform Cloud workspace referenced by `terraform/versions.tf`.
- Keep remote state enabled.
- Add GitHub secret `TF_TOKEN` with a Terraform Cloud user/team token that can access this workspace.

## 2) Terraform var-file model

Two var-files are used during CI/CD:

- `config.tfvars` (committed): source-of-truth for stable non-secret configuration.
- `terraform.tfvars` (generated in workflow): dynamic/manual-setup values.

`terraform.tfvars` is generated at runtime from GitHub secrets and resolved image URIs.

## 3) Required GitHub secrets

Add these repository secrets:

- `AWS_ROLE_TO_ASSUME`
- `TF_TOKEN`
- `ROUTE53_ZONE_ID`
- `ALB_CERT_ARN`
- `CF_CERT_ARN`
- `MONGODB_SECRET_ARN`
- `REDIS_SECRET_ARN`
- `OPENAI_SECRET_ARN`
- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `FRONTEND_AUTH0_DOMAIN`
- `FRONTEND_AUTH0_CLIENT_ID`
- `FRONTEND_AUTH0_AUDIENCE`

## 4) GitHub OIDC role in AWS

- Create an IAM OIDC provider for GitHub (if not already present).
- Create an IAM role trusted by GitHub OIDC and set its ARN in `AWS_ROLE_TO_ASSUME`.
- Restrict trust policy to this repository and branch as needed.

## 5) IAM permissions for the OIDC role

Create **one** customer-managed IAM policy from [`terraform/iam/github-oidc-ci-policy.json`](iam/github-oidc-ci-policy.json):

1. Replace `YOUR_ACCOUNT_ID` in the JSON with your AWS account ID.
2. IAM → Policies → Create policy → JSON tab → paste the contents.
3. Attach that policy to the GitHub OIDC role referenced by `AWS_ROLE_TO_ASSUME`.

The policy covers all services managed by this Terraform stack (VPC, ALB, ECR, ECS, autoscaling, CloudFront, S3, Route53, CloudWatch Logs, IAM, ACM read-only), scoped Secrets Manager reads for app secrets, and scoped SSM for deploy parameters.

Notes:

- The trust policy (who can assume the role) stays on the role itself, configured in step 4.
- **IAM** is split by resource: role CRUD and inline policies only on `arn:aws:iam::…:role/studyflow-*`; `AttachRolePolicy`/`DetachRolePolicy` use `studyflow-*` roles as the `Resource` and restrict the allowed managed policy via `iam:PolicyARN` condition (only `AmazonECSTaskExecutionRolePolicy`); `ListAttachedRolePolicies` is only on roles; `GetPolicy`/`GetPolicyVersion` only on that AWS managed policy ARN. **`PassRole`** stays scoped to `studyflow-*` and `iam:PassedToService = ecs-tasks.amazonaws.com`. If you change `project_name` in `config.tfvars`, update the `studyflow-*` patterns to match Terraform role names.
- **`CreateServiceLinkedRole`** remains scoped by `iam:AWSServiceName` (ECS, ELB, Application Auto Scaling). If apply fails with an SLR error for another service, add that service name to the list.
- **Secrets Manager**: `DescribeSecret` and `GetSecretValue` apply to secrets whose names match `studyflow/mongo`, `studyflow/redis`, and `studyflow/openai` (each with AWS’s random suffix in the ARN—see the `-*` patterns in the JSON). If your secret names differ, edit the `Resource` list in `SecretsManagerReadForStudyFlow` to match your ARNs or add entries.

## 6) SSM parameters used by workflows

Build and deploy workflows use these parameters:

- `/studyflow/prod/api_image_uri`
- `/studyflow/prod/worker_image_uri`
- `/studyflow/prod/last_deploy`

`/studyflow/prod/last_deploy` stores JSON metadata (`sha`, `actor`, `time`).

## 7) Workflow split

- `pr-checks.yml` (`pull_request`):
  - API lint/test
  - Worker lint/test
  - Terraform plan with placeholder image URIs
- `build-images.yml` (`push` to `main`):
  - Build and push API/Worker images
  - Save image URIs and deploy metadata to SSM
- `deploy-terraform.yml` (`workflow_dispatch`):
  - Plan + artifact upload
  - Manual approval gate (`environment: production`) before apply
  - Apply + ECS force deployment + health check

## 8) Rollback behavior

`deploy-terraform.yml` accepts optional input `rollback_sha`:

- Input provided: deploy image tags for that exact SHA (rollback).
- Input empty: deploy image URIs read from SSM (normal latest deploy path).

## 9) First run checklist

1. Ensure Route53 zone and ACM certs already exist.
2. Ensure MongoDB/Redis/OpenAI secrets already exist in Secrets Manager.
3. Run a Terraform apply once to create core infrastructure and ECR repositories.
4. Push to `main` so image URIs are written to SSM.
5. Run `deploy-terraform.yml` and approve the production environment gate to apply.
