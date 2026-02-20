# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Makefile for common Docker operations
# ═══════════════════════════════════════════════════════════════════════

.PHONY: help build up down restart logs status clean \
	security-audit performance-test load-test load-test-full load-test-stress load-test-spike \
	locust-ci backup restore-test cross-browser mobile-test uat

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Docker Commands ───────────────────────────────────────────────────

build: ## Build all containers
	docker compose build

build-no-cache: ## Build all containers (no cache)
	docker compose build --no-cache

up: ## Start all services
	docker compose up -d

up-build: ## Build and start all services
	docker compose up -d --build

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## Follow all service logs
	docker compose logs -f

logs-backend: ## Follow backend logs
	docker compose logs -f backend

logs-frontend: ## Follow frontend logs
	docker compose logs -f frontend

status: ## Show container status
	docker compose ps

# ── Database ──────────────────────────────────────────────────────────

db-shell: ## Open PostgreSQL shell
	docker compose exec postgres psql -U preskool -d preskool

db-backup: ## Backup database
	docker compose exec postgres pg_dump -U preskool preskool > backup_$$(date +%Y%m%d_%H%M%S).sql

db-migrate: ## Run Alembic migrations
	docker compose exec backend alembic upgrade head

backup: ## Run database backup
	DB_HOST=localhost DB_PORT=5432 DB_NAME=preskool_db DB_USER=preskool \
		bash backend/scripts/backup.sh

restore-test: ## Restore latest backup to test DB and verify
	DB_HOST=localhost bash backend/scripts/restore-test.sh

# ── Security & Quality ────────────────────────────────────────────────

security-audit: ## Run all security scans (Bandit, Trivy, secrets)
	bash security/scripts/scan.sh

security-frontend: ## Run frontend security audit (npm audit, secrets, headers)
	bash security/scripts/frontend-audit.sh

# ── Performance ───────────────────────────────────────────────────────

performance-test: ## Run Lighthouse + k6 smoke + bundle size checks
	SKIP_BUILD=false bash performance/scripts/run-performance-tests.sh

load-test: ## Run k6 smoke test (2 VUs / 30s — quick sanity check)
	bash performance/scripts/run-load-tests.sh smoke

load-test-full: ## Run all k6 scenarios: smoke → load → stress → spike → soak
	bash performance/scripts/run-load-tests.sh full

load-test-stress: ## Run k6 stress test (ramp to 300 VUs)
	bash performance/scripts/run-load-tests.sh stress

load-test-spike: ## Run k6 spike test (500 VU burst)
	bash performance/scripts/run-load-tests.sh spike

locust-ci: ## Run Locust headless (100 users, 5 minutes)
	locust -f performance/locustfile.py \
		--host=http://localhost:8000 \
		--users=100 --spawn-rate=10 \
		--run-time=5m --headless \
		--csv=performance/reports/locust_results \
		--html=performance/reports/locust_report.html

# ── Testing ───────────────────────────────────────────────────────────

cross-browser: ## Run cross-browser Playwright tests (Chrome, Firefox, Safari)
	cd frontend && npx playwright test \
		--project=chromium --project=firefox --project=webkit \
		src/tests/e2e/cross-browser.e2e.ts

mobile-test: ## Run mobile responsiveness Playwright tests
	cd frontend && npx playwright test \
		--project=mobile-chrome --project=mobile-safari \
		src/tests/e2e/mobile-responsiveness.e2e.ts

uat: ## Open UAT test plan and scenarios
	@echo "UAT Test Plan:   docs/uat/uat-test-plan.md"
	@echo "UAT Scenarios:   docs/uat/uat-scenarios.md"
	@open docs/uat/uat-test-plan.md 2>/dev/null || xdg-open docs/uat/uat-test-plan.md 2>/dev/null || true

# ── Development ───────────────────────────────────────────────────────

shell-backend: ## Open backend shell
	docker compose exec backend /bin/bash

shell-frontend: ## Open frontend shell
	docker compose exec frontend /bin/sh

# ── Cleanup ───────────────────────────────────────────────────────────

clean: ## Remove containers, volumes, and images
	docker compose down -v --rmi local

prune: ## Remove all unused Docker resources
	docker system prune -af
