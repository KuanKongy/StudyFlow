# GitHub Actions CI/CD

These workflows assume **this repository root is the StudyFlow app** (`api/`, `worker/`, `terraform/`, etc.). In a capstone monorepo that nests this tree under another folder, either copy this subtree to its own repo for deployment or adjust paths in each YAML file.

Documentation for Terraform and AWS setup: [`../../terraform/MANUAL_SETUP_TFC_GHA.md`](../../terraform/MANUAL_SETUP_TFC_GHA.md) and [`../../terraform/README.md`](../../terraform/README.md).

## Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [`pr-checks.yml`](./pr-checks.yml) | Pull request to `main` | API + Worker lint/test; Terraform **plan** only (no apply). |
| [`main-branch.yml`](./main-branch.yml) | Push to **`main`** | Orchestrates **`build-images` → `deploy-frontend` → `deploy-terraform`** (Terraform only after the first two succeed). |
| [`build-images.yml`](./build-images.yml) | **`workflow_call`** (from main pipeline) or **manual** | Build/push API and Worker Docker images to ECR; write image URIs and deploy metadata to **SSM**. |
| [`deploy-frontend.yml`](./deploy-frontend.yml) | **`workflow_call`** (from main pipeline) or **manual** | `npm run build`, **`aws s3 sync`**, **CloudFront invalidation**. Requires **`frontend/package-lock.json`** in git and `FRONTEND_AUTH0_*` secrets. |
| [`deploy-terraform.yml`](./deploy-terraform.yml) | **`workflow_call`** (from main pipeline) or **manual** | Terraform **plan** → artifacts → **`production` environment** gate → **apply** → ECS + health check. |

**Authentication**

- **AWS:** OIDC via `aws-actions/configure-aws-credentials`. Repository secret **`AWS_ROLE_TO_ASSUME`**: IAM role ARN trusted by GitHub’s OIDC provider.
- **Terraform Cloud:** Remote state only; `terraform init` / `plan` / `apply` run on the runner. Set **`TF_TOKEN`** in GitHub secrets; workflows expose it as `TF_TOKEN_app_terraform_io` in `env`.

**Region:** `ca-central-1` (`AWS_REGION`).

## `main-branch.yml`

1. **`build-images`** and **`deploy-frontend`** run **in parallel**.
2. **`deploy-terraform`** runs only when **both** succeed (`needs`), so SSM has the new image URIs and the S3 bucket is updated before Terraform plan/apply.

Concurrency: `studyflow-main-pipeline` with `cancel-in-progress: false` so in-flight deploys are not cancelled mid-run.

## `pr-checks.yml`

1. **`api-test`** — under `api/`: generate lockfile if needed, `npm ci`, `lint`, `test`.
2. **`worker-test`** — same under `worker/`.
3. **`terraform-plan`** — after both pass: assume AWS role, `terraform init` in `terraform/`, emit **`terraform.tfvars`** from GitHub secrets, **placeholder** image URIs for plan-only validation.

**Artifact:** `pr-tfplan-artifacts` (`tfplan`, `plan.txt`). **No apply.**

## `build-images.yml`

1. OIDC + `terraform init` in `terraform/`.
2. `terraform output` for ECR repository URLs (stack must already be in state).
3. ECR login; `docker build` / `push` for `api/` and `worker/` with tag **`github.sha`** and `latest`.
4. **SSM Parameter Store** (overwrite):
   - `/studyflow/prod/api_image_uri`
   - `/studyflow/prod/worker_image_uri`
   - `/studyflow/prod/last_deploy` — JSON `sha`, `actor`, `time`.

**Bootstrap:** Run an initial **`terraform apply`** (local or deploy workflow) so ECR outputs exist before the first successful `main` image build.

**Note:** Image vulnerability scanning (e.g. Trivy) is not in this workflow; add a step if your process requires it.

## `deploy-frontend.yml`

The S3 bucket behind CloudFront starts **empty**; Terraform does not upload the SPA. This workflow fills it.

1. **`terraform init`** → read **`frontend_bucket_name`** and **`frontend_cloudfront_distribution_id`**.
2. **`npm ci` / `npm run build`** in `frontend/` with **`VITE_AUTH0_*`** from GitHub secrets.
3. **`aws s3 sync dist/`** to the bucket with **`--delete`**.
4. **`aws cloudfront create-invalidation`** for `/*`.

`actions/setup-node` **npm cache** requires **`frontend/package-lock.json`** to be **committed** (it is no longer gitignored).

## `deploy-terraform.yml`

**`production` environment:** In **Settings → Environments → production**, enable **Required reviewers** so the workflow pauses after **`plan`** finishes (artifacts include `plan.txt`). Approve **`apply`** to continue.

**Input `rollback_sha` (`workflow_dispatch` only, optional):** If set, images are `ECR_REPO:rollback_sha`. When run from the main pipeline (`workflow_call`), image URIs always come from **SSM** (written by `build-images` in the same pipeline).

**Jobs**

1. **`plan`** — resolve images, write `terraform.tfvars`, `terraform plan … -out=tfplan`, upload `deploy-tfplan-artifacts`.
2. **`apply`** — download artifact, `terraform apply -auto-approve tfplan`, force ECS deployments, wait stable, `curl https://<alb>/health`.

## GitHub secrets

Listed in [`MANUAL_SETUP_TFC_GHA.md`](../../terraform/MANUAL_SETUP_TFC_GHA.md) §3. Terraform jobs need at least `TF_TOKEN`, `AWS_ROLE_TO_ASSUME`, and the variables used in generated `terraform.tfvars`.

## Operations quick reference

- **Full main deploy:** Push to `main` (runs `main-branch` pipeline).
- **Terraform only:** Actions → **Deploy Terraform** → Run workflow; optional **`rollback_sha`**.
- **Frontend or images only:** Run **Deploy frontend to S3** or **Build and Publish Images** manually.
- Last recorded build metadata: `aws ssm get-parameter --name /studyflow/prod/last_deploy --query Parameter.Value --output text`

## Related

- OIDC IAM policy template: [`../../terraform/iam/github-oidc-ci-policy.json`](../../terraform/iam/github-oidc-ci-policy.json)
