# Developer Onboarding Guide — PreSkool ERP

Welcome to PreSkool ERP! This guide gets you from zero to a running development environment and code-ready in under 30 minutes.

---

## Prerequisites

Install these tools before starting:

```bash
# Check versions
python3 --version    # Need 3.11+
node --version       # Need 18+
npm --version        # Need 9+
docker --version     # Need 24+
git --version        # Need 2.40+
```

---

## 1. Clone and Set Up

```bash
# Clone the repository
git clone <repo_url> preskool-erp
cd preskool-erp

# Copy environment file
cp .env.example .env
# Edit .env and set SECRET_KEY (required for local dev)
echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env
```

---

## 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up local SQLite database (auto-created on first run)
# No need for PostgreSQL in development!

# Run migrations
alembic upgrade head

# Seed demo data (creates admin/teacher/student/parent users)
python seeds/seed_data.py

# Start the backend dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend is now available at: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

---

## 3. Frontend Setup

```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend is now available at: `http://localhost:5173`

---

## 4. Log In

After seeding, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@preskool.com` | `Admin@123` |
| Teacher | `teacher@preskool.com` | `Teacher@123` |
| Student | `student@preskool.com` | `Student@123` |
| Parent | `parent@preskool.com` | `Parent@123` |

---

## Project Structure Tour

```
preskool-erp/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── api/v1/            # API routes (35 files, one per module)
│   │   ├── models/            # SQLAlchemy ORM models (32 files)
│   │   ├── schemas/           # Pydantic request/response schemas (31 files)
│   │   ├── services/          # Business logic (30 files)
│   │   ├── core/              # Config, DB, auth, middleware, logging
│   │   └── plugins/           # Microkernel plugin system
│   ├── alembic/               # Database migrations (22 versions)
│   ├── seeds/                 # Demo data scripts
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Root router (46+ routes)
│   │   ├── layouts/           # DashboardLayout (sidebar + appbar)
│   │   ├── pages/             # 39 page components
│   │   ├── store/             # Redux store + 32 slices
│   │   ├── components/        # Shared components
│   │   └── services/api.ts    # Axios client + interceptors
│   └── package.json
├── docs/                      # Documentation (this folder!)
├── docker-compose.yml         # Local services
├── k8s/                       # Kubernetes manifests
├── helm/                      # Helm chart
├── terraform/                 # Infrastructure as code
└── .gitlab-ci.yml             # CI/CD pipeline
```

---

## Adding a New Module

Follow this pattern when adding a new feature module:

### Step 1: Create the Model
```bash
# backend/app/models/my_module.py
```
```python
from app.models.base import BaseModel
from sqlalchemy import Column, String

class MyEntity(BaseModel):
    __tablename__ = "my_entities"
    name = Column(String(100), nullable=False)
```

### Step 2: Create a Migration
```bash
cd backend
alembic revision --autogenerate -m "add_my_module"
alembic upgrade head
```

### Step 3: Create Pydantic Schemas
```bash
# backend/app/schemas/my_module.py
```

### Step 4: Create the Service
```bash
# backend/app/services/my_module_service.py
# Functions: get_all, get_by_id, create, update, delete
```

### Step 5: Create the API Router
```bash
# backend/app/api/v1/my_module.py
# Register routes using FastAPI router
```

### Step 6: Register the Router
```python
# backend/app/api/v1/__init__.py
from app.api.v1 import my_module
api_router.include_router(my_module.router, prefix="/my-module", tags=["my-module"])
```

### Step 7: Create Redux Slice
```bash
# frontend/src/store/myModuleSlice.ts
```

### Step 8: Create the Page
```bash
# frontend/src/pages/my-module/MyModulePage.tsx
```

### Step 9: Add Route
```typescript
// frontend/src/App.tsx
<Route path="/my-module" element={<MyModulePage />} />
```

---

## Code Conventions

### Python (Backend)

| Convention | Rule |
|-----------|------|
| Style | PEP 8, Black formatter |
| Naming | `snake_case` for functions/variables, `PascalCase` for classes |
| Type hints | Required on all function signatures |
| Docstrings | Required on all public functions and classes |
| Max line length | 100 chars |
| Imports | Sorted: stdlib → third-party → local |

### TypeScript (Frontend)

| Convention | Rule |
|-----------|------|
| Style | ESLint + Prettier |
| Naming | `camelCase` for functions/variables, `PascalCase` for components/types |
| Props | Always type with `interface` (not `type`) |
| Components | Functional components only (no class components) |
| State | Redux Toolkit for global state, `useState` for local state |
| API calls | Via thunks in slice files only (no direct axios in components) |

---

## Running Tests

### Backend Tests
```bash
cd backend
source venv/bin/activate

# Run all tests
pytest

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test file
pytest app/tests/test_students.py -v

# Run specific test
pytest app/tests/test_auth.py::test_login_success -v
```

### Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

---

## Git Workflow

```bash
# 1. Always branch from main
git checkout main && git pull
git checkout -b feature/your-feature-name

# 2. Make your changes with atomic commits
git add <files>
git commit -m "feat(students): add bulk import endpoint"

# 3. Push and open a PR/MR
git push origin feature/your-feature-name
```

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <summary>

Types: feat | fix | docs | style | refactor | test | chore
Scope: module name (students, auth, fees, etc.) or "frontend"/"backend"

Examples:
  feat(fees): add overdue fee reminders
  fix(auth): handle expired refresh token gracefully
  docs(api): add request examples to students endpoints
  test(grades): add bulk grade upload tests
```

---

## Useful Commands

```bash
# Format Python code
cd backend && black app/

# Check Python linting
cd backend && flake8 app/

# Format TypeScript
cd frontend && npm run lint:fix

# Generate new migration
cd backend && alembic revision --autogenerate -m "<description>"

# View current migration version
cd backend && alembic current

# Open API docs in browser
open http://localhost:8000/docs

# View running processes
docker compose ps

# Stop all services
docker compose down

# Full reset (delete volumes)
docker compose down -v
```

---

## IDE Setup (VS Code)

Install these extensions:

- **Python** (Microsoft) — language support
- **Pylance** — type checking
- **Black Formatter** — auto-format on save
- **ESLint** — JS/TS linting
- **Prettier** — code formatter
- **Mermaid Preview** — view diagram docs
- **REST Client** — test API endpoints

Recommended `settings.json`:
```json
{
  "editor.formatOnSave": true,
  "[python]": { "editor.defaultFormatter": "ms-python.black-formatter" },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```
