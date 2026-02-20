# ═══════════════════════════════════════════════════════════════════════
# Staging Backend Config — S3 state
# Usage: terraform init -backend-config=environments/staging/backend.hcl
# ═══════════════════════════════════════════════════════════════════════

bucket         = "preskool-terraform-state"
key            = "staging/terraform.tfstate"
region         = "ap-south-1"
dynamodb_table = "preskool-terraform-locks"
encrypt        = true
