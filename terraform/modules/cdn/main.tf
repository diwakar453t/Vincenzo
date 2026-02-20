# ═══════════════════════════════════════════════════════════════════════
# CDN Module — CloudFront + WAF + DDoS Protection + Edge Caching
# ═══════════════════════════════════════════════════════════════════════

variable "project_name" { type = string }
variable "environment" { type = string }
variable "domain_name" { type = string }
variable "alb_dns_name" { type = string }
variable "acm_certificate_arn" { type = string }

locals {
  identifier = "${var.project_name}-${var.environment}"
  subdomain  = var.environment == "production" ? "erp" : var.environment
  fqdn       = "${local.subdomain}.${var.domain_name}"
}

# ═══════════════════════════════════════════════════════════════════════
# WAF v2 — Web Application Firewall
# ═══════════════════════════════════════════════════════════════════════

resource "aws_wafv2_web_acl" "main" {
  name        = "${local.identifier}-waf"
  description = "PreSkool ERP WAF — rate limiting, bot protection, SQL injection, XSS"
  scope       = "CLOUDFRONT"
  provider    = aws.us_east_1  # WAF for CloudFront must be in us-east-1

  default_action {
    allow {}
  }

  # ── Rule 1: Rate Limiting (2000 req / 5 min per IP) ─────────────────
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.identifier}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 2: API Rate Limiting (stricter — 500 req / 5 min) ──────────
  rule {
    name     = "api-rate-limit"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/api/"
            positional_constraint = "STARTS_WITH"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.identifier}-api-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 3: AWS Managed — Common Rule Set (OWASP Top 10) ────────────
  rule {
    name     = "aws-common-rules"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use { allow {} }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.identifier}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 4: AWS Managed — SQL Injection Protection ──────────────────
  rule {
    name     = "aws-sqli-rules"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.identifier}-sqli-rules"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 5: AWS Managed — Known Bad Inputs ──────────────────────────
  rule {
    name     = "aws-bad-inputs"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.identifier}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 6: AWS Managed — Bot Control ───────────────────────────────
  rule {
    name     = "aws-bot-control"
    priority = 40

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "COMMON"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.identifier}-bot-control"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 7: Block Bad User Agents ───────────────────────────────────
  rule {
    name     = "block-bad-user-agents"
    priority = 50

    action {
      block {}
    }

    statement {
      or_statement {
        statement {
          byte_match_statement {
            search_string         = "curl"
            positional_constraint = "CONTAINS"
            field_to_match { single_header { name = "user-agent" } }
            text_transformation { priority = 0; type = "LOWERCASE" }
          }
        }
        statement {
          byte_match_statement {
            search_string         = "wget"
            positional_constraint = "CONTAINS"
            field_to_match { single_header { name = "user-agent" } }
            text_transformation { priority = 0; type = "LOWERCASE" }
          }
        }
        statement {
          byte_match_statement {
            search_string         = "python-requests"
            positional_constraint = "CONTAINS"
            field_to_match { single_header { name = "user-agent" } }
            text_transformation { priority = 0; type = "LOWERCASE" }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.identifier}-bad-ua"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 8: Geo-blocking (optional — restrict to India) ─────────────
  rule {
    name     = "geo-restrict"
    priority = 60

    action {
      count {}  # Count mode — switch to block{} to enforce
    }

    statement {
      not_statement {
        statement {
          geo_match_statement {
            country_codes = ["IN", "US", "GB", "AE", "SG"]  # Allowed countries
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.identifier}-geo-restrict"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.identifier}-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${local.identifier}-waf"
  }
}

# ═══════════════════════════════════════════════════════════════════════
# CloudFront Distribution
# ═══════════════════════════════════════════════════════════════════════

# ── Cache Policies ────────────────────────────────────────────────────

# Static assets: aggressive caching (1 year)
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${local.identifier}-static-cache"
  min_ttl     = 86400       # 1 day minimum
  default_ttl = 2592000     # 30 days
  max_ttl     = 31536000    # 1 year

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# API: no caching (pass everything through)
resource "aws_cloudfront_cache_policy" "api_no_cache" {
  name        = "${local.identifier}-api-no-cache"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "whitelist"
      headers { items = ["Authorization", "Content-Type", "Accept", "Origin"] }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# HTML pages: short cache with revalidation
resource "aws_cloudfront_cache_policy" "html_pages" {
  name        = "${local.identifier}-html-cache"
  min_ttl     = 0
  default_ttl = 300      # 5 minutes
  max_ttl     = 3600     # 1 hour

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# ── Origin Request Policy ─────────────────────────────────────────────
resource "aws_cloudfront_origin_request_policy" "api_forward_all" {
  name = "${local.identifier}-api-forward"

  cookies_config { cookie_behavior = "all" }
  headers_config {
    header_behavior = "whitelist"
    headers { items = ["Authorization", "Content-Type", "Accept", "Origin", "Referer", "X-Requested-With"] }
  }
  query_strings_config { query_string_behavior = "all" }
}

# ── Response Headers Policy (security) ────────────────────────────────
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${local.identifier}-security-headers"

  security_headers_config {
    content_type_options { override = true }
    frame_options { frame_option = "SAMEORIGIN"; override = true }
    xss_protection { mode_block = true; protection = true; override = true }
    referrer_policy { referrer_policy = "strict-origin-when-cross-origin"; override = true }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.razorpay.com"
      override = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=(self)"
      override = true
    }
  }
}

# ── CloudFront Distribution ──────────────────────────────────────────
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "PreSkool ERP ${var.environment}"
  default_root_object = "index.html"
  price_class         = var.environment == "production" ? "PriceClass_200" : "PriceClass_100"
  web_acl_id          = aws_wafv2_web_acl.main.arn
  aliases             = [local.fqdn]
  http_version        = "http2and3"

  # ── Origin: ALB ────────────────────────────────────────────────────
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 60
    }

    custom_header {
      name  = "X-Custom-Origin-Key"
      value = "preskool-${var.environment}-secret"
    }
  }

  # ── Default Behavior (Frontend — HTML/SPA) ─────────────────────────
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    cache_policy_id            = aws_cloudfront_cache_policy.html_pages.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # ── Behavior: API (no cache, forward everything) ────────────────────
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    cache_policy_id          = aws_cloudfront_cache_policy.api_no_cache.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward_all.id

    viewer_protocol_policy = "https-only"
    compress               = true
  }

  # ── Behavior: WebSocket ─────────────────────────────────────────────
  ordered_cache_behavior {
    path_pattern     = "/ws/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    cache_policy_id          = aws_cloudfront_cache_policy.api_no_cache.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward_all.id

    viewer_protocol_policy = "https-only"
    compress               = false
  }

  # ── Behavior: Static Assets (long cache) ────────────────────────────
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    cache_policy_id            = aws_cloudfront_cache_policy.static_assets.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # ── Custom Error Responses (SPA fallback) ───────────────────────────
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  # ── TLS ─────────────────────────────────────────────────────────────
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # ── Geo Restriction ─────────────────────────────────────────────────
  restrictions {
    geo_restriction {
      restriction_type = "none"  # Set to "whitelist" and add locations to restrict
    }
  }

  tags = {
    Name = "${local.identifier}-cdn"
  }
}

# ═══════════════════════════════════════════════════════════════════════
# AWS Shield Advanced (DDoS Protection) — optional, costs $3000/mo
# Uncomment for production with high-value targets
# ═══════════════════════════════════════════════════════════════════════
# resource "aws_shield_protection" "cloudfront" {
#   name         = "${local.identifier}-cf-shield"
#   resource_arn = aws_cloudfront_distribution.main.arn
# }
#
# resource "aws_shield_protection" "alb" {
#   name         = "${local.identifier}-alb-shield"
#   resource_arn = var.alb_arn
# }

# ═══════════════════════════════════════════════════════════════════════
# CloudWatch Alarms for WAF/CDN
# ═══════════════════════════════════════════════════════════════════════

resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "${local.identifier}-waf-high-blocks"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "High number of WAF blocked requests — possible attack"

  dimensions = {
    WebACL = aws_wafv2_web_acl.main.name
    Rule   = "ALL"
    Region = "us-east-1"
  }

  tags = {
    Name = "${local.identifier}-waf-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "cdn_5xx_errors" {
  alarm_name          = "${local.identifier}-cdn-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "CloudFront 5xx error rate exceeded 5%"

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
    Region         = "Global"
  }

  tags = {
    Name = "${local.identifier}-cdn-5xx-alarm"
  }
}

# ── Outputs ───────────────────────────────────────────────────────────
output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_url" {
  value = "https://${local.fqdn}"
}

output "waf_web_acl_arn" {
  value = aws_wafv2_web_acl.main.arn
}
