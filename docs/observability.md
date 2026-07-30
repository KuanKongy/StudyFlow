# Observability (StudyFlow)

## Application logs

- **API** and **Worker** emit **JSON lines** to stdout (picked up by CloudWatch Logs in ECS). Each line includes `ts`, `level`, `service` (`api` or `worker`), and `msg`.
- **Request correlation:** HTTP requests get an `x-request-id` header (generated or forwarded). AI jobs store `requestId` on the job document; the worker logs `requestId` with job lifecycle messages so you can tie API → job → worker in CloudWatch Logs Insights.

### Example Log Insights queries

Filter API errors for a request:

```sql
fields @timestamp, @message
| filter @message like /"service":"api"/ and @message like /error/
| filter @message like /<request-id-here>/
| sort @timestamp desc
```

Filter worker lines for a job:

```sql
fields @timestamp, @message
| filter @message like /"service":"worker"/ and @message like /"jobId":"<job-id>"/
| sort @timestamp desc
```

## AWS (Terraform)

- Module **`modules/observability`**: CloudWatch **alarms** (ALB target 5xx, unhealthy targets), **SNS topic** for notifications, and a **dashboard** (ALB 5xx, latency, ECS CPU for API and worker).
- Set `observability_alert_email` in `terraform.tfvars` (or workspace variables) to subscribe an email to the SNS topic (confirm the subscription in the AWS console).
