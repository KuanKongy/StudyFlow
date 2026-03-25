# Terraform (AWS infrastructure)

This directory is the **root Terraform module** for StudyFlow’s AWS footprint. It is meant to live at **`terraform/`** in the StudyFlow deployment repository (sibling to `api/`, `worker/`, `.github/`).

Companion docs:

- **Workflows** (how CI runs this code): [`../.github/workflows/README.md`](../.github/workflows/README.md)
- **Operator checklist** (TFC, secrets, OIDC): [`MANUAL_SETUP_TFC_GHA.md`](MANUAL_SETUP_TFC_GHA.md)

## What is provisioned

The root module ([`main.tf`](./main.tf)) composes:

| Module | Role |
|--------|------|
| `vpc` | VPC, subnets, NAT, routing (`ca-central-1`). |
| `ecr` | API and Worker image repositories. |
| `security_groups` | ALB and ECS security groups. |
| `alb` | Public ALB, HTTPS, target group (API port 4000), `/health` checks. |
| `ecs` | Fargate cluster, API + worker services, IAM roles, autoscaling, logs; task **secrets** from Secrets Manager for Mongo, Redis, OpenAI. |
| `frontend` | S3 + CloudFront (SPA + `/api/*` to ALB); CloudFront cert in `us-east-1`. |
| `route53` | DNS for CloudFront (and optional API patterns per variables). |

**Out of scope here:** MongoDB Atlas, Redis hosts (e.g. Upstash), OpenAI accounts. Store URLs/keys in **AWS Secrets Manager** and pass **ARNs** into Terraform.

Terraform **`.tf` files** do not depend on a parent monorepo folder name; only workflow **paths** must match repo layout.

## State and execution

[`versions.tf`](./versions.tf) uses **Terraform Cloud** for **remote state**. Plans and applies run via the **CLI** on your machine or in GitHub Actions with **`TF_TOKEN`**. The workspace should allow CLI-driven runs if you apply from Actions.

## Variables

| File | Purpose |
|------|---------|
| [`config.tfvars`](./config.tfvars) | Committed defaults (names, CIDRs, scaling, domain flags). |
| `terraform.tfvars` | **Local or CI-generated** (gitignored): ARNs, Auth0 strings, image URIs. See [`terraform.tfvars.example`](./terraform.tfvars.example). |

Typical invocation:

`terraform plan|apply -var-file=config.tfvars -var-file=terraform.tfvars`

## Secrets at runtime

ECS uses **Secrets Manager ARNs** in task definitions (`valueFrom`). Terraform stores references only; **ECS** reads secret values when tasks start. The **GitHub OIDC role** is separate from ECS task roles; its policy template is [`iam/github-oidc-ci-policy.json`](./iam/github-oidc-ci-policy.json) (applied manually in AWS, not by this stack).

## Repo hygiene

- Commit [`.terraform.lock.hcl`](./.terraform.lock.hcl).
- Do not commit [`.terraform/`](./.gitignore) or local `terraform.tfvars` — see [`.gitignore`](./.gitignore).

## Bootstrap order

1. Terraform Cloud workspace + token; align `organization` / `workspace` in `versions.tf`.
2. Create Secrets Manager secrets, ACM certs, Route53 zone as needed.
3. `terraform init` + `terraform apply` with a real `terraform.tfvars` (creates VPC, ECR, ECS, etc.).
4. Configure GitHub secrets, OIDC role, `production` environment.
5. Push `main` to run image build (needs ECR outputs).
6. Run **deploy** workflow when you want gated apply + ECS roll.

## Broader design context

If this repo is embedded in a course monorepo, high-level rationale may also live in sibling documents such as `docs/proposal.md` and `docs/design_choices.md` in that parent project.
