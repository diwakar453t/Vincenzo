# ═══════════════════════════════════════════════════════════════════════
# Root Variables
# ═══════════════════════════════════════════════════════════════════════

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"  # Mumbai — closest to Indian schools
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "preskool"
}

# ── VPC ───────────────────────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones_count" {
  description = "Number of AZs to use"
  type        = number
  default     = 3
}

# ── EKS ───────────────────────────────────────────────────────────────
variable "eks_cluster_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_node_min_size" {
  description = "Minimum number of EKS nodes"
  type        = number
  default     = 2
}

variable "eks_node_max_size" {
  description = "Maximum number of EKS nodes"
  type        = number
  default     = 6
}

variable "eks_node_desired_size" {
  description = "Desired number of EKS nodes"
  type        = number
  default     = 2
}

# ── RDS ───────────────────────────────────────────────────────────────
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS storage in GB"
  type        = number
  default     = 20
}

variable "rds_db_name" {
  description = "Database name"
  type        = string
  default     = "preskool"
}

variable "rds_db_username" {
  description = "Database master username"
  type        = string
  default     = "preskool"
}

variable "rds_db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# ── Redis ─────────────────────────────────────────────────────────────
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# ── DNS ───────────────────────────────────────────────────────────────
variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "preskool.com"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID (existing)"
  type        = string
  default     = ""
}
