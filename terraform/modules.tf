# ═══════════════════════════════════════════════════════════════════════
# Module Orchestration — wire all modules together
# ═══════════════════════════════════════════════════════════════════════

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.availability_zones_count)
}

# ── VPC ───────────────────────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = local.azs
}

# ── EKS ───────────────────────────────────────────────────────────────
module "eks" {
  source = "./modules/eks"

  project_name           = var.project_name
  environment            = var.environment
  cluster_version        = var.eks_cluster_version
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.private_subnet_ids
  node_security_group_id = module.vpc.eks_nodes_security_group_id
  node_instance_types    = var.eks_node_instance_types
  node_min_size          = var.eks_node_min_size
  node_max_size          = var.eks_node_max_size
  node_desired_size      = var.eks_node_desired_size
}

# ── RDS (PostgreSQL) ─────────────────────────────────────────────────
module "rds" {
  source = "./modules/rds"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.vpc.rds_security_group_id
  instance_class    = var.rds_instance_class
  allocated_storage = var.rds_allocated_storage
  db_name           = var.rds_db_name
  db_username       = var.rds_db_username
  db_password       = var.rds_db_password
}

# ── Redis (ElastiCache) ──────────────────────────────────────────────
module "redis" {
  source = "./modules/redis"

  project_name      = var.project_name
  environment       = var.environment
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.vpc.redis_security_group_id
  node_type         = var.redis_node_type
}

# ── DNS + ALB ─────────────────────────────────────────────────────────
module "dns" {
  source = "./modules/dns"

  project_name          = var.project_name
  environment           = var.environment
  domain_name           = var.domain_name
  route53_zone_id       = var.route53_zone_id
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.vpc.alb_security_group_id
}

# ── CDN + WAF (CloudFront + WAFv2) ───────────────────────────────────
module "cdn" {
  source = "./modules/cdn"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  project_name        = var.project_name
  environment         = var.environment
  domain_name         = var.domain_name
  alb_dns_name        = module.dns.alb_dns_name
  acm_certificate_arn = module.dns.certificate_arn
}

# ── Kubernetes Provider (post-EKS) ───────────────────────────────────
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# ── Install AWS Load Balancer Controller via Helm ─────────────────────
resource "helm_release" "aws_lb_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.7.1"

  set {
    name  = "clusterName"
    value = module.eks.cluster_name
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = module.vpc.vpc_id
  }

  depends_on = [module.eks]
}

# ── Install cert-manager via Helm ─────────────────────────────────────
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"
  version    = "1.14.4"

  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }

  depends_on = [module.eks]
}

# ── Install metrics-server for HPA ────────────────────────────────────
resource "helm_release" "metrics_server" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server"
  chart      = "metrics-server"
  namespace  = "kube-system"
  version    = "3.12.0"

  depends_on = [module.eks]
}
