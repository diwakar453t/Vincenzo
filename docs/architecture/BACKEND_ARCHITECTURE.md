# Backend Architecture — PreSkool ERP

The FastAPI backend follows a **layered service architecture** with clear separation between API routing, business logic, data access, and infrastructure concerns.

---

## Layer Diagram

```mermaid
graph TB
    subgraph Client
        HTTP["HTTP Request\n(JSON + Bearer Token + X-Tenant-ID)"]
    end

    subgraph Middleware ["Middleware Stack (ordered)"]
        EH["ExceptionHandlerMiddleware\n(global error handling)"]
        CORS["CORSMiddleware\n(cross-origin control)"]
        TH["TrustedHostMiddleware\n(prod: hostname allowlist)"]
        TM["TenantMiddleware\n(resolve X-Tenant-ID → Tenant)"]
        LM["LoggingMiddleware\n(structured request logs)"]
    end

    subgraph API ["API Layer — /api/v1/*"]
        direction TB
        Router["APIRouter\n(35 route files)"]
        Auth["JWT Dependency\ncurrent_user extraction"]
        Val["Pydantic v2\nRequest Validation"]
    end

    subgraph Services ["Service Layer — 30 services"]
        S["Business Logic\n(CRUD + domain rules)"]
    end

    subgraph Data ["Data Layer"]
        ORM["SQLAlchemy ORM\n(32 models)"]
        DB["Database\n(SQLite dev / PostgreSQL prod)"]
    end

    subgraph Cross["Cross-Cutting"]
        Plugins["Plugin System\n(18 hooks, microkernel)"]
        Metrics["Prometheus Metrics"]
        Traces["OpenTelemetry Traces"]
        Logs["Structured Logging"]
    end

    HTTP --> EH --> CORS --> TH --> TM --> LM --> Router
    Router --> Auth --> Val --> S
    S --> ORM --> DB
    S -->|hook dispatch| Plugins
    Router -->|instrument| Metrics
    Router -->|trace| Traces
    LM -->|emit| Logs
```

---

## Directory Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app factory + middleware registration
│   ├── api/
│   │   └── v1/                  # 35 route files (one per module)
│   │       ├── __init__.py      # api_router aggregation
│   │       ├── auth.py
│   │       ├── students.py
│   │       └── ...
│   ├── models/                  # SQLAlchemy ORM models (32 files)
│   ├── schemas/                 # Pydantic v2 request/response schemas (31 files)
│   ├── services/                # Business logic (30 files)
│   ├── core/
│   │   ├── config.py            # Settings (env vars via pydantic-settings)
│   │   ├── database.py          # Engine, SessionLocal, Base
│   │   ├── security.py          # JWT, bcrypt, rate limiting, CSRF
│   │   ├── middleware.py        # Custom middleware classes
│   │   ├── logging_config.py    # Structured logging setup
│   │   ├── metrics.py           # Prometheus setup
│   │   └── tracing.py           # OpenTelemetry setup
│   ├── plugins/                 # Microkernel plugin system
│   │   ├── __init__.py          # PluginBase, HookType, PluginContext
│   │   ├── registry.py          # Hook dispatch, singleton registry
│   │   ├── loader.py            # Filesystem discovery + dynamic import
│   │   ├── birthday_notifications.py
│   │   └── attendance_alerts.py
│   └── tests/                   # pytest test suite
├── alembic/                     # Database migrations (22 versions)
├── seeds/                       # Seed data scripts
└── requirements.txt
```

---

## Request Lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as Middleware Stack
    participant R as Router
    participant D as JWT Dependency
    participant S as Service
    participant DB as Database
    participant P as Plugin Hooks

    C->>MW: POST /api/v1/attendance/mark
    MW->>MW: 1. ExceptionHandlerMiddleware wraps
    MW->>MW: 2. CORS check
    MW->>MW: 3. TenantMiddleware: resolve X-Tenant-ID
    MW->>MW: 4. LoggingMiddleware: log request
    MW->>R: Route matched: attendance.mark()
    R->>D: Inject get_current_user()
    D->>D: Validate Bearer JWT
    D-->>R: user = {id, role, tenant_id}
    R->>R: Pydantic validates request body
    R->>S: attendance_service.mark(...)
    S->>P: dispatch BEFORE_ATTENDANCE hook
    S->>DB: INSERT attendance records
    DB-->>S: Committed records
    S->>P: dispatch AFTER_ATTENDANCE hook
    S-->>R: attendance_result
    R-->>C: 200 OK { data: ... }
```

---

## Authentication Flow

```mermaid
flowchart LR
    A[Client] -->|POST /auth/login| B[auth.py]
    B -->|verify password| C{bcrypt check}
    C -->|fail| D[401 Unauthorized]
    C -->|pass| E[Create JWT]
    E -->|HS256 + SECRET_KEY| F[access_token\n30min TTL]
    E --> G[refresh_token\n7day TTL]
    F --> A

    A -->|Subsequent requests\nAuthorization: Bearer token| H[JWT Dependency]
    H -->|decode + validate| I{Token valid?}
    I -->|expired| J[401 — use refresh]
    I -->|valid| K[Inject current_user]
    K --> L[Route Handler]
```

---

## Database Session Management

Each request gets an injected `db: Session` via FastAPI's dependency injection:

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Services receive the session, perform operations, and the session is committed (or rolled back) within the service method.

---

## Key Patterns

### Service Pattern
All business logic lives in `services/`. Services are stateless functions receiving `(db, **kwargs)`:

```python
# services/student_service.py
def get_students(db: Session, page: int, limit: int, search: str) -> dict:
    query = db.query(Student)
    if search:
        query = query.filter(Student.first_name.ilike(f"%{search}%"))
    total = query.count()
    students = query.offset((page-1)*limit).limit(limit).all()
    return {"data": students, "total": total, "page": page}
```

### Schema-Driven Validation
Every endpoint uses Pydantic v2 schemas for both request body validation and response serialization. Schemas live in `schemas/` mirroring the `models/` structure.

### Error Handling
All errors propagate through `ExceptionHandlerMiddleware` which catches:
- `HTTPException` — re-raised with structured JSON
- `SQLAlchemyError` — mapped to 500 with logging
- All unhandled exceptions — 500 with sanitized message (no stack traces in prod)
