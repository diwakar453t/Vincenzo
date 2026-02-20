# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Terraform Root Configuration
# AWS Provider: EKS + RDS + ElastiCache + VPC + Route53 + ALB + CloudFront + WAF
# ═══════════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.25"
    }
  }

  # Remote state — override per environment
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "preskool-erp"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# AWS us-east-1 provider (required for CloudFront WAF & ACM)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "preskool-erp"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Cloudflare provider (optional — for Workers/DNS)
provider "cloudflare" {
  # Set CLOUDFLARE_API_TOKEN env var
}

# ── Data Sources ──────────────────────────────────────────────────────
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
