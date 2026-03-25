# GitHub Actions CI/CD

These workflows assume **this repository root is the StudyFlow app** (`api/`, `worker/`, `terraform/`, etc.). In a capstone monorepo that nests this tree under another folder, either copy this subtree to its own repo for deployment or adjust paths in each YAML file.

Documentation for Terraform and AWS setup: [`../../terraform/MANUAL_SETUP_TFC_GHA.md`](../../terraform/MANUAL_SETUP_TFC_GHA.md) and [`../../terraform/README.md`](../../terraform/README.md).

## Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [`pr-checks.yml`](./pr-checks.yml) | Pull request to `main` | API + Worker lint/test; Terraform **plan** only (no apply). |
| [`build-images.yml`](./build-images.yml) | Push to `main` | Build/push API and Worker Docker images to ECR; write image URIs and deploy metadata to **SSM**. |
| [`deploy-frontend.yml`](./deploy-frontend.yml) | Push to `main` (paths: `frontend/**`) or **manual** | `npm run build`, **`aws s3 sync`** to the Terraform frontend bucket, **CloudFront invalidation**. Requires `FRONTEND_AUTH0_*` secrets for Vite env. |
| [`deploy-terraform.yml`](./deploy-terraform.yml) | Push to **`main`** + optional **manual** (`workflow_dispatch`) | Terraform **plan** → artifacts → **`production` environment** gate (required reviewers) → **apply** saved plan → ECS force deploy → health check. |

**Authentication**

- **AWS:** OIDC via `aws-actions/configure-aws-credentials`. Repository secret **`AWS_ROLE_TO_ASSUME`**: IAM role ARN trusted by GitHub’s OIDC provider.
- **Terraform Cloud:** Remote state only; `terraform init` / `plan` / `apply` run on the runner. Set **`TF_TOKEN`** in GitHub secrets; workflows expose it as `TF_TOKEN_app_terraform_io` in `env`.

**Region:** `ca-central-1` (`AWS_REGION`).

## `pr-checks.yml`

1. **`api-test`** — under `api/`: generate lockfile if needed, `npm ci`, `lint`, `test`.
2. **`worker-test`** — same under `worker/`.
3. **`terraform-plan`** — after both pass: assume AWS role, `terraform init` in `terraform/`, emit **`terraform.tfvars`** from GitHub secrets, **placeholder** image URIs for plan-only validation.

**Artifact:** `pr-tfplan-artifacts` (`tfplan`, `plan.txt`). **No apply.**

## `build-images.yml`

Runs on push to **`main`**.

1. OIDC + `terraform init` in `terraform/`.
2. `terraform output` for ECR repository URLs (stack must already be in state).
3. ECR login; `docker build` / `push` for `api/` and `worker/` with tag **`github.sha`** and `latest`.
4. **SSM Parameter Store** (overwrite):
   - `/studyflow/prod/api_image_uri`
   - `/studyflow/prod/worker_image_uri`
   - `/studyflow/prod/last_deploy` — JSON `sha`, `actor`, `time`.

**Bootstrap:** Run an initial **`terraform apply`** (local or deploy workflow) so ECR outputs exist before the first successful `main` image build.

## `deploy-frontend.yml`

The S3 bucket behind CloudFront starts **empty**; Terraform does not upload the SPA. This workflow fills it.

1. **`terraform init`** → read **`frontend_bucket_name`** and **`frontend_cloudfront_distribution_id`** (new Terraform outputs).
2. **`npm ci` / `npm run build`** in `frontend/` with **`VITE_AUTH0_*`** from GitHub secrets (same values as in your Auth0 app / `terraform.tfvars` secrets).
3. **`aws s3 sync dist/`** to the bucket with **`--delete`**.
4. **`aws cloudfront create-invalidation`** for `/*`.

**First run:** Use **Actions → Deploy frontend to S3 → Run workflow** if you have not changed `frontend/` since adding this file (path filters would otherwise skip a push-only trigger).

**Note:** Image vulnerability scanning (e.g. Trivy) is not in this workflow; add a step if your process requires it.

## `deploy-terraform.yml`

Runs on **every push to `main`**. You can also **Run workflow** manually for ad-hoc deploys or rollbacks.

**`production` environment:** In **Settings → Environments → production**, enable **Required reviewers** so the workflow pauses after **`plan`** finishes (artifacts include human-readable `plan.txt`). Approve the pending **`apply`** job to continue.

**Input `rollback_sha` (`workflow_dispatch` only, optional):** If set, images are `ECR_REPO:rollback_sha`. On push (or if empty), image URIs come from **SSM** as written by `build-images.yml`.

**Jobs**

1. **`plan`** — resolve images, write `terraform.tfvars`, `terraform plan -var-file=config.tfvars -var-file=terraform.tfvars -out=tfplan`, upload `deploy-tfplan-artifacts` (includes `tfplan`, `plan.txt`, `terraform.tfvars`).
2. **`apply`** — `environment: production` (configure reviewers under repo **Settings → Environments**), download artifact, `terraform apply -auto-approve tfplan`, force ECS deployments, wait stable, `curl https://<alb>/health`.

## GitHub secrets

Listed in [`MANUAL_SETUP_TFC_GHA.md`](../../terraform/MANUAL_SETUP_TFC_GHA.md) §3. Terraform jobs need at least `TF_TOKEN`, `AWS_ROLE_TO_ASSUME`, and the variables used in generated `terraform.tfvars`.

## Operations quick reference

- Deploy latest images from last `main` build: run deploy workflow, leave `rollback_sha` empty.
- Roll back: run deploy with `rollback_sha` set to a commit that was built (tag must exist in ECR).
- Last recorded build metadata: `aws ssm get-parameter --name /studyflow/prod/last_deploy --query Parameter.Value --output text`

## Related

- OIDC IAM policy template: [`../../terraform/iam/github-oidc-ci-policy.json`](../../terraform/iam/github-oidc-ci-policy.json)
