# ═══════════════════════════════════════════════════════════════════════
# Root Outputs
# ═══════════════════════════════════════════════════════════════════════

# ── VPC ───────────────────────────────────────────────────────────────
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

# ── EKS ───────────────────────────────────────────────────────────────
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_connect_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}"
}

# ── RDS ───────────────────────────────────────────────────────────────
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.endpoint
}

output "database_url" {
  description = "Full database connection URL"
  value       = module.rds.database_url
  sensitive   = true
}

# ── Redis ─────────────────────────────────────────────────────────────
output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.redis.endpoint
}

output "redis_url" {
  description = "Redis connection URL"
  value       = module.redis.redis_url
}

# ── DNS / ALB ─────────────────────────────────────────────────────────
output "app_url" {
  description = "Application URL"
  value       = module.dns.app_url
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.dns.alb_dns_name
}
