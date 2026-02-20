# Data Flow — PreSkool ERP

This document describes how data flows through the PreSkool ERP system from browser to database and back, covering authentication, multi-tenancy, validation, and plugin hook dispatch.

---

## Full Request Lifecycle

```mermaid
flowchart TD
    Browser["🌐 Browser\nReact + Redux"] 
    
    subgraph Interceptor["Axios Interceptor"]
        AttachAuth["Attach Authorization: Bearer token\nAttach X-Tenant-ID header"]
    end
    
    subgraph NginxProxy["Nginx Reverse Proxy"]
        SSL["TLS Termination"]
        Route["Route: /api → backend\nRoute: / → frontend"]
    end
    
    subgraph Middleware["FastAPI Middleware Stack"]
        EH["ExceptionHandlerMiddleware\n(try-catch wrapper)"]
        CORS["CORSMiddleware\n(origin allowlist)"]
        THM["TrustedHostMiddleware\n(prod only)"]
        TM["TenantMiddleware\n→ resolves X-Tenant-ID\n→ injects tenant in request.state"]
        LM["LoggingMiddleware\n→ logs method, path, status, latency"]
    end
    
    subgraph FastAPICore["FastAPI Core"]
        RMatch["Router Match\n/api/v1/{module}/{path}"]
        JWTDep["JWT Dependency\nget_current_user()\n→ decode HS256 token\n→ extract sub, role, tenant_id"]
        Pydantic["Pydantic v2 Validator\n→ request body / query params\n→ 422 on validation failure"]
    end
    
    subgraph ServiceLayer["Service Layer"]
        BizLogic["Business Logic\n→ domain rules\n→ authorization (role check)"]
        HookBefore["Plugin Hook: BEFORE_*\n(optional, non-blocking)"]
        SQLAlchemy["SQLAlchemy ORM\n→ build query\n→ execute SQL"]
        HookAfter["Plugin Hook: AFTER_*\n(optional, async-compatible)"]
    end
    
    subgraph Database["Database"]
        Postgres["PostgreSQL / SQLite\n58 tables"]
    end
    
    Browser -->|"HTTP Request"| AttachAuth
    AttachAuth --> SSL
    SSL --> Route --> EH
    EH --> CORS --> THM --> TM --> LM
    LM --> RMatch --> JWTDep --> Pydantic
    Pydantic --> BizLogic
    BizLogic --> HookBefore --> SQLAlchemy
    SQLAlchemy <--> Postgres
    SQLAlchemy --> HookAfter
    HookAfter -->|"Pydantic response model\nJSON serialization"| Browser
```

---

## Authentication Token Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React App
    participant Redux as Redux Store
    participant API as FastAPI
    participant DB as Database

    Note over U,DB: Initial Login
    U->>FE: Enter credentials
    FE->>API: POST /auth/login { email, password }
    API->>DB: SELECT user WHERE email=?
    DB-->>API: User record
    API->>API: bcrypt.verify(password, hashed)
    API->>API: jwt.encode({ sub: user_id, role, exp })
    API-->>FE: { access_token, refresh_token }
    FE->>Redux: dispatch(setToken(access_token))
    Redux->>FE: Store token in state (not localStorage)

    Note over U,DB: Subsequent Requests
    FE->>API: GET /students\nAuthorization: Bearer <token>
    API->>API: jwt.decode(token, SECRET_KEY)
    API->>API: Inject current_user = { id, role }
    API->>DB: SELECT students WHERE tenant_id=?
    DB-->>API: Student list
    API-->>FE: 200 { data: [...] }

    Note over U,DB: Token Expiry (401)
    FE->>API: GET /students (expired token)
    API-->>FE: 401 Unauthorized
    FE->>API: POST /auth/refresh { refresh_token }
    API-->>FE: { access_token } (new token)
    FE->>Redux: dispatch(setToken(new_token))
    FE->>API: Retry: GET /students (new token)
    API-->>FE: 200 { data: [...] }
```

---

## Tenant Isolation Flow

```mermaid
flowchart LR
    R1["Request from School A\nX-Tenant-ID: school-a"] --> TM
    R2["Request from School B\nX-Tenant-ID: school-b"] --> TM
    TM["TenantMiddleware\nresolves tenant"] --> SA["Service A\ndb.query().filter(tenant_id='school-a')"]
    TM --> SB["Service B\ndb.query().filter(tenant_id='school-b')"]
    SA --> DBA["School A data only"]
    SB --> DBB["School B data only"]
```

---

## File Upload Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as FastAPI /files/upload
    participant FS as Local Filesystem
    participant DB as Database

    C->>API: POST /files/upload\nmultipart/form-data { file, doc_type }
    API->>API: Validate MIME type + size limit
    API->>FS: Save to /uploads/{uuid}.{ext}
    API->>DB: INSERT uploaded_files\n{ path, name, size, owner_id }
    DB-->>API: File record
    API-->>C: 201 { id, url: /uploads/{uuid}.{ext} }
    C->>API: GET /uploads/{uuid}.{ext}
    API-->>C: StaticFiles serve binary
```

---

## Payment Flow

```mermaid
sequenceDiagram
    participant P as Parent
    participant FE as React App
    participant API as FastAPI
    participant RZ as Razorpay
    participant DB as Database

    P->>FE: Click "Pay Fee" button
    FE->>API: POST /payments/initiate\n{ amount, fee_invoice_id }
    API->>RZ: razorpay.orders.create({ amount })
    RZ-->>API: { order_id }
    API-->>FE: { order_id, key_id }
    FE->>RZ: Open Razorpay Checkout modal
    P->>RZ: Enter card/UPI details
    RZ-->>FE: { payment_id, signature }
    FE->>API: POST /payments/verify\n{ order_id, payment_id, signature }
    API->>API: HMAC signature verify
    API->>DB: UPDATE payment status = SUCCESS
    API->>DB: UPDATE fee invoice = PAID
    API-->>FE: 200 { receipt_url }
    FE->>P: Show success + receipt link
```

---

## Notification Fan-out

```mermaid
flowchart TD
    Trigger["System Event\n(e.g., attendance marked)"] --> Plugin
    Plugin["attendance_alerts plugin\nAFTER_ATTENDANCE_MARK hook"] --> Filter
    Filter["Filter absent students"] --> Q

    subgraph Q["Notification Creation"]
        CreateN["INSERT notification\nfor each parent"]
    end

    Q --> Poll
    Poll["Frontend 30s poll\nGET /notifications/unread/count"] --> FE
    FE["NotificationDropdown badge\n(unread count)"] --> User
```

> **Note:** Real-time WebSocket delivery is tracked as a future enhancement. Currently, frontend polls `/notifications/unread/count` every 30 seconds.
