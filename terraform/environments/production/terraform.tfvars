# ═══════════════════════════════════════════════════════════════════════
# Production Environment — terraform.tfvars
# Sized for 200+ colleges (multi-tenant SaaS)
# ═══════════════════════════════════════════════════════════════════════

aws_region  = "ap-south-1"
environment = "production"
project_name = "preskool"

# VPC
vpc_cidr                 = "10.1.0.0/16"
availability_zones_count = 3  # 3 AZs for high availability

# EKS — 200+ colleges need headroom for burst traffic
eks_cluster_version     = "1.29"
eks_node_instance_types = ["t3.xlarge", "t3.2xlarge"]  # 4-8 vCPU nodes
eks_node_min_size       = 3
eks_node_max_size       = 15     # Scale to 15 nodes during peak
eks_node_desired_size   = 5      # 5 nodes at steady state

# RDS — 200+ colleges, ~400K students, ~50K teachers
rds_instance_class    = "db.r6g.xlarge"   # 4 vCPU, 32GB RAM
rds_allocated_storage = 200                # 200GB (auto-scales to 800GB)
rds_db_name           = "preskool"
rds_db_username       = "preskool"
# rds_db_password     = "SET_VIA_ENV_OR_SECRETS"

# Redis — session cache + query cache for 200+ tenants
redis_node_type = "cache.r6g.xlarge"  # 4 vCPU, 26GB RAM

# DNS
domain_name = "preskool.com"
# route53_zone_id = "Z1234567890"
