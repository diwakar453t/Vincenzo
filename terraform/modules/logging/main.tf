# ═══════════════════════════════════════════════════════════════════════
# Terraform Module — CloudWatch Logging (AWS Production)
# Log groups, retention policies, metric filters, alarms
# ═══════════════════════════════════════════════════════════════════════

variable "project_name" { type = string }
variable "environment" { type = string }
variable "eks_cluster_name" { type = string }

locals {
  identifier = "${var.project_name}-${var.environment}"
  log_prefix = "/${var.project_name}/${var.environment}"
}

# ── Log Groups with Retention Policies ────────────────────────────────

resource "aws_cloudwatch_log_group" "backend" {
  name              = "${local.log_prefix}/backend"
  retention_in_days = var.environment == "production" ? 90 : 14

  tags = { Name = "${local.identifier}-backend-logs" }
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "${local.log_prefix}/frontend"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = { Name = "${local.identifier}-frontend-logs" }
}

resource "aws_cloudwatch_log_group" "celery" {
  name              = "${local.log_prefix}/celery"
  retention_in_days = var.environment == "production" ? 60 : 14

  tags = { Name = "${local.identifier}-celery-logs" }
}

resource "aws_cloudwatch_log_group" "postgres" {
  name              = "${local.log_prefix}/postgres"
  retention_in_days = var.environment == "production" ? 60 : 14

  tags = { Name = "${local.identifier}-postgres-logs" }
}

resource "aws_cloudwatch_log_group" "redis" {
  name              = "${local.log_prefix}/redis"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = { Name = "${local.identifier}-redis-logs" }
}

resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${var.eks_cluster_name}/cluster"
  retention_in_days = var.environment == "production" ? 90 : 14

  tags = { Name = "${local.identifier}-eks-logs" }
}

resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-${local.identifier}"
  retention_in_days = var.environment == "production" ? 90 : 30

  tags = { Name = "${local.identifier}-waf-logs" }
}

# ── Metric Filters (extract metrics from structured logs) ─────────────

resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "${local.identifier}-error-count"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "{ $.level = \"ERROR\" }"

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "PreSkool/${var.environment}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "slow_requests" {
  name           = "${local.identifier}-slow-requests"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "{ $.duration_ms > 1000 }"

  metric_transformation {
    name          = "SlowRequestCount"
    namespace     = "PreSkool/${var.environment}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "auth_failures" {
  name           = "${local.identifier}-auth-failures"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "{ $.status_code = 401 || $.status_code = 403 }"

  metric_transformation {
    name          = "AuthFailureCount"
    namespace     = "PreSkool/${var.environment}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "tenant_errors" {
  name           = "${local.identifier}-tenant-errors"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "{ $.level = \"ERROR\" && $.tenant_id = \"*\" }"

  metric_transformation {
    name          = "TenantErrorCount"
    namespace     = "PreSkool/${var.environment}"
    value         = "1"
    default_value = "0"
    dimensions = {
      TenantId = "$.tenant_id"
    }
  }
}

# ── CloudWatch Alarms ─────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${local.identifier}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ErrorCount"
  namespace           = "PreSkool/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "More than 50 errors in 5 minutes"

  tags = { Name = "${local.identifier}-error-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "slow_request_alarm" {
  alarm_name          = "${local.identifier}-slow-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SlowRequestCount"
  namespace           = "PreSkool/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "More than 100 slow requests (>1s) in 5 minutes"

  tags = { Name = "${local.identifier}-slow-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "auth_failure_alarm" {
  alarm_name          = "${local.identifier}-auth-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "AuthFailureCount"
  namespace           = "PreSkool/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 200
  alarm_description   = "More than 200 auth failures in 5 minutes — possible brute force"

  tags = { Name = "${local.identifier}-auth-alarm" }
}

# ── S3 Log Archive (long-term compliance) ─────────────────────────────

resource "aws_s3_bucket" "log_archive" {
  bucket = "${local.identifier}-log-archive"

  tags = { Name = "${local.identifier}-log-archive" }
}

resource "aws_s3_bucket_lifecycle_configuration" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2555  # 7 years (compliance)
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# ── Outputs ───────────────────────────────────────────────────────────
output "backend_log_group" {
  value = aws_cloudwatch_log_group.backend.name
}

output "log_archive_bucket" {
  value = aws_s3_bucket.log_archive.bucket
}
