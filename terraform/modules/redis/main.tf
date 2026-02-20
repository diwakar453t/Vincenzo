# ═══════════════════════════════════════════════════════════════════════
# Redis Module — ElastiCache (Managed Redis)
# ═══════════════════════════════════════════════════════════════════════

variable "project_name" { type = string }
variable "environment" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_id" { type = string }
variable "node_type" { type = string; default = "cache.t3.micro" }

locals {
  identifier = "${var.project_name}-${var.environment}"
}

# ── Subnet Group ──────────────────────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.identifier}-redis-subnet"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${local.identifier}-redis-subnet"
  }
}

# ── Parameter Group ───────────────────────────────────────────────────
resource "aws_elasticache_parameter_group" "main" {
  name   = "${local.identifier}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = {
    Name = "${local.identifier}-redis-params"
  }
}

# ── ElastiCache Replication Group ─────────────────────────────────────
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.identifier}-redis"
  description          = "PreSkool ${var.environment} Redis cluster"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  # Single node for staging, multi-node for production
  num_cache_clusters = var.environment == "production" ? 2 : 1

  # Failover
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled           = var.environment == "production"

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.security_group_id]

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false  # Set true if app supports TLS

  # Backups
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window          = "02:00-03:00"
  maintenance_window       = "mon:03:00-mon:04:00"

  auto_minor_version_upgrade = true
  apply_immediately          = var.environment == "staging"

  tags = {
    Name = "${local.identifier}-redis"
  }
}

# ── Outputs ───────────────────────────────────────────────────────────
output "endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "port" {
  value = aws_elasticache_replication_group.main.port
}

output "redis_url" {
  value = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}/0"
}
