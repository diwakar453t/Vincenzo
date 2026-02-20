# ═══════════════════════════════════════════════════════════════════════
# Staging Environment — terraform.tfvars
# Usage: terraform apply -var-file=environments/staging/terraform.tfvars
# ═══════════════════════════════════════════════════════════════════════

aws_region  = "ap-south-1"
environment = "staging"
project_name = "preskool"

# VPC
vpc_cidr                 = "10.0.0.0/16"
availability_zones_count = 2  # 2 AZs for staging (cost saving)

# EKS — smaller for staging
eks_cluster_version     = "1.29"
eks_node_instance_types = ["t3.medium"]
eks_node_min_size       = 1
eks_node_max_size       = 3
eks_node_desired_size   = 1

# RDS — minimal for staging
rds_instance_class    = "db.t3.micro"
rds_allocated_storage = 20
rds_db_name           = "preskool"
rds_db_username       = "preskool"
# rds_db_password     = "SET_VIA_ENV_OR_SECRETS"  # TF_VAR_rds_db_password

# Redis — minimal
redis_node_type = "cache.t3.micro"

# DNS
domain_name = "preskool.com"
# route53_zone_id = "Z1234567890"  # Set if zone already exists
