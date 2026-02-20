# ═══════════════════════════════════════════════════════════════════════
# RDS Module — Managed PostgreSQL
# ═══════════════════════════════════════════════════════════════════════

variable "project_name" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_id" { type = string }
variable "instance_class" { type = string; default = "db.t3.micro" }
variable "allocated_storage" { type = number; default = 20 }
variable "db_name" { type = string; default = "preskool" }
variable "db_username" { type = string; default = "preskool" }
variable "db_password" { type = string; sensitive = true }

locals {
  identifier = "${var.project_name}-${var.environment}"
}

# ── Subnet Group ──────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "${local.identifier}-db-subnet"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${local.identifier}-db-subnet"
  }
}

# ── Parameter Group ───────────────────────────────────────────────────
resource "aws_db_parameter_group" "main" {
  name   = "${local.identifier}-pg16"
  family = "postgres16"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Name = "${local.identifier}-pg16-params"
  }
}

# ── RDS Instance ──────────────────────────────────────────────────────
resource "aws_db_instance" "main" {
  identifier = "${local.identifier}-postgres"

  engine               = "postgres"
  engine_version       = "16.3"
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  max_allocated_storage = var.allocated_storage * 4  # Auto-scaling up to 4x
  storage_type         = "gp3"
  storage_encrypted    = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  vpc_security_group_ids = [var.security_group_id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name

  # Backups
  backup_retention_period = var.environment == "production" ? 14 : 3
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Availability
  multi_az = var.environment == "production" ? true : false

  # Snapshots
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.identifier}-final-snapshot" : null
  copy_tags_to_snapshot     = true

  # Monitoring
  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  # Upgrades
  auto_minor_version_upgrade = true
  apply_immediately          = var.environment == "staging"

  # Deletion protection (production only)
  deletion_protection = var.environment == "production"

  tags = {
    Name = "${local.identifier}-postgres"
  }
}

# ── Enhanced Monitoring IAM Role ──────────────────────────────────────
resource "aws_iam_role" "rds_monitoring" {
  name = "${local.identifier}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_monitoring.name
}

# ── Outputs ───────────────────────────────────────────────────────────
output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "address" {
  value = aws_db_instance.main.address
}

output "port" {
  value = aws_db_instance.main.port
}

output "database_url" {
  value     = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive = true
}
