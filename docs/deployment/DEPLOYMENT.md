# Deployment Guide — PreSkool ERP

This guide covers deploying PreSkool ERP using **Docker Compose** for local/staging and **Kubernetes** via Helm for production.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Docker Engine | 24+ | Container runtime |
| Docker Compose | v2 | Local orchestration |
| Node.js | 18+ | Frontend build |
| Python | 3.11+ | Backend (local dev only) |
| kubectl | 1.28+ | Kubernetes CLI (prod) |
| Helm | 3.12+ | k8s package manager (prod) |

---

## Quick Start (Local Dev — 5 Minutes)

```bash
# 1. Clone the repo
git clone <repo_url> preskool-erp
cd preskool-erp

# 2. Copy environment file
cp .env.example .env

# 3. Generate a secure secret key
openssl rand -hex 32
# → paste into SECRET_KEY in .env

# 4. Start all services
docker compose up -d

# 5. Verify containers are running
docker compose ps

# 6. Run database migrations
docker compose exec backend alembic upgrade head

# 7. (Optional) Seed demo data
docker compose exec backend python seeds/seed_data.py
```

**Access Points:**
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

---

## Environment Variables Reference

Create a `.env` file from `.env.example` and set these values:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_DB` | Yes | `preskool` | Database name |
| `POSTGRES_USER` | Yes | `preskool` | Database user |
| `POSTGRES_PASSWORD` | Yes | — | **Change in production!** |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `SECRET_KEY` | ✅ Critical | — | JWT signing key (min 32 chars) |
| `APP_ENV` | Yes | `production` | `development` or `production` |
| `ALLOWED_ORIGINS` | Yes | — | Comma-separated CORS origins |
| `REDIS_URL` | No | — | Redis for caching/rate limiting |
| `RAZORPAY_KEY_ID` | No | — | Payment gateway key |
| `RAZORPAY_KEY_SECRET` | No | — | Payment gateway secret |
| `RAZORPAY_ENABLED` | No | `false` | Enable payment module |
| `VITE_API_URL` | Yes | `/api/v1` | Frontend API base URL |
| `OTEL_ENABLED` | No | `false` | Enable distributed tracing |

---

## Docker Compose Architecture

```
docker-compose.yml (main services):
  backend   — FastAPI app (port 8000)
  frontend  — React app via Nginx (port 3000)
  db        — PostgreSQL 15 (port 5432)
  redis     — Redis 7 (port 6379)
  nginx     — Reverse proxy (port 80/443)

docker-compose.observability.yml (optional):
  prometheus  — Metrics (port 9090)
  grafana     — Dashboards (port 3001)
  jaeger      — Distributed tracing (port 16686)
```

To start with observability:
```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

---

## Database Migrations

PreSkool uses **Alembic** for versioned migrations. All 22 migrations are applied in order.

```bash
# Apply all pending migrations
alembic upgrade head

# Apply migrations up to a specific version
alembic upgrade 005_timetable

# Roll back last migration
alembic downgrade -1

# View migration history
alembic history

# Generate a new migration (after model changes)
alembic revision --autogenerate -m "add_new_table"
```

> **Important:** Always run migrations before starting the backend in production. The CI/CD pipeline includes a migration step before deployment.

---

## Seed Data (Demo)

```bash
# Seed the database with demo data (admin user, sample students, teachers, etc.)
cd backend
python seeds/seed_data.py
```

**Demo credentials after seeding:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@preskool.com` | `Admin@123` |
| Teacher | `teacher@preskool.com` | `Teacher@123` |
| Student | `student@preskool.com` | `Student@123` |
| Parent | `parent@preskool.com` | `Parent@123` |

---

## Production Checklist

Before going live, ensure:

- [ ] `SECRET_KEY` is a random 64-char hex string (`openssl rand -hex 32`)
- [ ] `POSTGRES_PASSWORD` is a strong unique password
- [ ] `APP_ENV=production` in `.env`
- [ ] `ALLOWED_ORIGINS` lists only your domain(s)
- [ ] `DEBUG=false` in backend config
- [ ] HTTPS is configured on the reverse proxy (SSL certificate)
- [ ] `RAZORPAY_KEY_ID/SECRET` are live keys (not test keys)
- [ ] PostgreSQL backups are scheduled (daily)
- [ ] Grafana admin password changed from default
- [ ] Rate limiting configured for `SECRET_KEY` endpoints

---

## Building Images Manually

```bash
# Build backend image
docker build -t preskool-backend:latest ./backend

# Build frontend image
docker build -t preskool-frontend:latest ./frontend

# Tag and push to registry
docker tag preskool-backend:latest registry.example.com/preskool/backend:v1.0.0
docker push registry.example.com/preskool/backend:v1.0.0
```

---

## Health Checks

The backend exposes a health endpoint at:
```
GET /health → 200 { status: "healthy", version: "1.0.0", db: "connected" }
```

Docker Compose and Kubernetes both use this endpoint for liveness/readiness probes.

---

## Logs

```bash
# View backend logs
docker compose logs -f backend

# View all service logs
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100 backend
```

Logs are structured JSON (via `logging_config.py`) and can be forwarded to any log aggregator (ELK, Loki, etc.).
