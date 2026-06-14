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

`terraform.tfvars` is generated at runtime from GitHub secrets and resolved image URIs (including optional `observability_alert_email` from secret `OBSERVABILITY_ALERT_EMAIL`).

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

### Optional GitHub secrets

- **`OBSERVABILITY_ALERT_EMAIL`** — Email address for Terraform variable `observability_alert_email`. The deploy and PR Terraform jobs write this into generated `terraform.tfvars`. If you **omit** this secret or leave it empty, Terraform still creates the SNS topic and CloudWatch alarms, but **no** SNS email subscription is created. If you **set** it, Terraform creates an email subscription; the recipient must **confirm** it (email link or SNS console) before notifications are delivered. See also `terraform.tfvars.example`.

## 4) GitHub OIDC role in AWS

- Create an IAM OIDC provider for GitHub (if not already present).
- Create an IAM role trusted by GitHub OIDC and set its ARN in `AWS_ROLE_TO_ASSUME`.
- Restrict trust policy to this repository and branch as needed.

## 5) IAM permissions for the OIDC role

Create **one** customer-managed IAM policy from [`terraform/iam/github-oidc-ci-policy.json`](iam/github-oidc-ci-policy.json):

1. Replace `YOUR_ACCOUNT_ID` in the JSON with your AWS account ID.
2. IAM → Policies → Create policy → JSON tab → paste the contents.
3. Attach that policy to the GitHub OIDC role referenced by `AWS_ROLE_TO_ASSUME`.

The policy covers all services managed by this Terraform stack (VPC, ALB, ECR, ECS, autoscaling, CloudFront, S3, Route53, CloudWatch Logs and alarms/dashboards, SNS for observability alerts, IAM, ACM read-only), scoped Secrets Manager reads for app secrets, and scoped SSM for deploy parameters.

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

## 10) Migration to Railway

Use Railway for the backend runtime services:

- `api` service from this repository with Root Directory `/api`.
- `worker` service from this repository with Root Directory `/worker`.

Keep the existing external data services:

- MongoDB Atlas for persistent data.
- Upstash Redis for caching and the worker queue.

API service variables:

- `NODE_ENV=production`
- `MONGO_URL=<mongodb-atlas-connection-string>`
- `REDIS_URL=<upstash-redis-connection-string>`
- `AUTH0_DOMAIN=<auth0-tenant-domain>`
- `AUTH0_AUDIENCE=<auth0-api-audience>`
- `CORS_ORIGIN=<vercel-frontend-origin>`

Worker service variables:

- `NODE_ENV=production`
- `MONGO_URL=<mongodb-atlas-connection-string>`
- `REDIS_URL=<upstash-redis-connection-string>`
- `OPENAI_API_KEY=<openai-api-key>`

Railway setup checklist:

1. Create a Railway project.
2. Add the API service from GitHub and set Root Directory to `/api`.
3. Add the worker service from GitHub and set Root Directory to `/worker`.
4. Set both services' `MONGO_URL` to the existing MongoDB Atlas connection string. Include the application database name in the URI.
5. Set both services' `REDIS_URL` to the existing Upstash Redis TLS connection string, normally beginning with `rediss://`.
6. Allow Railway outbound access in MongoDB Atlas Network Access. Prefer a narrowly scoped rule when Railway provides stable egress; otherwise Atlas may require `0.0.0.0/0` with strong credentials.
7. Generate a public domain for the API service only.
8. Do not generate a public domain for the worker; it only needs Atlas, Upstash, and outbound OpenAI access.
9. Set the API health check path to `/health`.
10. After Vercel deployment, set `CORS_ORIGIN` on the API to the exact frontend origin, for example `https://studyflow.example.com`.
11. Verify `GET https://<railway-api-domain>/health` returns `{ "ok": true }`.

Notes:

- The API listens on Railway's runtime `PORT`; keep the fallback `4000` only for local development.
- Browser-side frontend code cannot call Railway private networking. The Vercel frontend must call the API public domain.
- Keep the AWS Terraform stack available until the Railway and Vercel production path has been verified end to end.
- The AWS GitHub Actions workflows are archived and guarded by repository variable `ENABLE_AWS_CICD == true`. Leave that variable unset while AWS/Terraform resources are being removed.

## 11) Migration to Vercel

Use Vercel for the Vite frontend:

- Import this repository into Vercel.
- Set the frontend Root Directory to `frontend`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Keep `frontend/vercel.json` in place so Vercel rewrites client-side routes to `index.html`.

Frontend environment variables:

- `VITE_AUTH0_DOMAIN=<auth0-tenant-domain>`
- `VITE_AUTH0_CLIENT_ID=<auth0-spa-client-id>`
- `VITE_AUTH0_AUDIENCE=<auth0-api-audience>`
- `VITE_API_BASE_URL=https://<railway-api-domain>`

Vercel setup checklist:

1. Deploy the frontend from `frontend/`.
2. Add the Vercel production domain to Auth0:
   - Allowed Callback URLs
   - Allowed Logout URLs
   - Allowed Web Origins
3. Set the Railway API `CORS_ORIGIN` to the Vercel production origin.
4. Redeploy the Vercel frontend after setting `VITE_API_BASE_URL`.
5. Run an end-to-end smoke test:
   - Load the frontend.
   - Log in with Auth0.
   - Fetch `/api/me`.
   - Create a note.
   - Trigger an AI job.
   - Confirm the worker consumes the Redis job and writes the generated material to MongoDB.
