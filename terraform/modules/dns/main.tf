# ═══════════════════════════════════════════════════════════════════════
# DNS Module — Route53 + ACM Certificate + ALB
# ═══════════════════════════════════════════════════════════════════════

variable "project_name" { type = string }
variable "environment" { type = string }
variable "domain_name" { type = string }
variable "route53_zone_id" { type = string; default = "" }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "alb_security_group_id" { type = string }

locals {
  identifier = "${var.project_name}-${var.environment}"
  subdomain  = var.environment == "production" ? "erp" : var.environment
  fqdn       = "${local.subdomain}.${var.domain_name}"
  create_zone = var.route53_zone_id == ""
}

# ── Route53 Hosted Zone (create if not provided) ─────────────────────
resource "aws_route53_zone" "main" {
  count = local.create_zone ? 1 : 0
  name  = var.domain_name

  tags = {
    Name = "${var.domain_name}-zone"
  }
}

locals {
  zone_id = local.create_zone ? aws_route53_zone.main[0].zone_id : var.route53_zone_id
}

# ── ACM Certificate (with DNS validation) ─────────────────────────────
resource "aws_acm_certificate" "main" {
  domain_name               = local.fqdn
  subject_alternative_names = ["*.${local.fqdn}"]
  validation_method         = "DNS"

  tags = {
    Name = "${local.identifier}-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = local.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ── Application Load Balancer ─────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "${local.identifier}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production"
  enable_http2               = true

  tags = {
    Name = "${local.identifier}-alb"
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# HTTP → HTTPS redirect
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# API path-based routing rule
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/ws/*"]
    }
  }
}

# ── Target Groups ────────────────────────────────────────────────────

resource "aws_lb_target_group" "backend" {
  name        = "${local.identifier}-backend-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/v1/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "${local.identifier}-backend-tg"
  }
}

resource "aws_lb_target_group" "frontend" {
  name        = "${local.identifier}-frontend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "${local.identifier}-frontend-tg"
  }
}

# ── DNS Record (A alias to ALB) ───────────────────────────────────────
resource "aws_route53_record" "app" {
  zone_id = local.zone_id
  name    = local.fqdn
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# ── Outputs ───────────────────────────────────────────────────────────
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_arn" {
  value = aws_lb.main.arn
}

output "app_url" {
  value = "https://${local.fqdn}"
}

output "certificate_arn" {
  value = aws_acm_certificate.main.arn
}

output "backend_target_group_arn" {
  value = aws_lb_target_group.backend.arn
}

output "frontend_target_group_arn" {
  value = aws_lb_target_group.frontend.arn
}
