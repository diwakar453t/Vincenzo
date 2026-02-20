# ═══════════════════════════════════════════════════════════════════════
# Production Backend Config — S3 state
# Usage: terraform init -backend-config=environments/production/backend.hcl
# ═══════════════════════════════════════════════════════════════════════

bucket         = "preskool-terraform-state"
key            = "production/terraform.tfstate"
region         = "ap-south-1"
dynamodb_table = "preskool-terraform-locks"
encrypt        = true
