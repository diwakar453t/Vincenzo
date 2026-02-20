# Admin Guide — PreSkool ERP

This guide covers advanced administrative topics for senior administrators and IT staff managing the PreSkool ERP platform.

---

## System Configuration

### Initial Setup Sequence

Follow this order for a clean first deployment:

1. **Create Tenant** — via API or database directly
2. **Settings → School Settings** — name, logo, contact
3. **Settings → Academic Years** — create and activate current year
4. **Settings → Preferences** — timezone, currency, date format
5. **Departments** — create all academic departments
6. **Rooms** — add all classrooms and labs
7. **Subjects & Subject Groups** — configure curriculum
8. **Classes** — create classes, assign rooms and teachers
9. **Teachers** — bulk add via CSV or manual entry
10. **Students** — bulk import via CSV with class assignments
11. **Fee Structures** — set up fee types and amounts
12. **Timetable** — create schedules for all classes
13. **Test** — log in as each role to verify access

---

## Multi-Tenancy Management

PreSkool supports multiple schools on one installation:

```
Tenant = School
Each tenant has: isolated data, own users, own settings
Tenants share: the same codebase and database (isolated by tenant_id)
```

**Provisioning a New Tenant:**
1. Insert a record into the `tenants` table:
   ```sql
   INSERT INTO tenants (id, name, domain, is_active)
   VALUES ('school-b', 'Springfield High', 'springfield.preskool.com', true);
   ```
2. Run the setup sequence above logged in as the new school's admin

**Tenant Switching (API):**  
Include `X-Tenant-ID: <tenant_id>` in all API requests.

---

## User & Role Management

### Role Capabilities

| Permission | Admin | Teacher | Student | Parent |
|-----------|-------|---------|---------|--------|
| View all student data | ✅ | ✅ (own classes) | ❌ | ❌ |
| Edit student records | ✅ | ❌ | ❌ | ❌ |
| Mark attendance | ✅ | ✅ | ❌ | ❌ |
| Enter grades | ✅ | ✅ | ❌ | ❌ |
| Manage fees | ✅ | ❌ | ❌ | View/Pay |
| Access reports | ✅ | ❌ | ❌ | ❌ |
| Manage plugins | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ |

### Deactivating a User

1. Go to the user's record (Students / Teachers)
2. Set **Status** to `Inactive`
3. They will be unable to log in but their data is preserved

---

## Plugin Administration

The plugin system allows extending PreSkool without code changes.

### Built-in Plugins

| Plugin | Default | Purpose |
|--------|---------|---------|
| `birthday_notifications` | Active | Sends birthday greetings daily |
| `attendance_alerts` | Active | Alerts parents when student absent |

### Managing Plugins

1. Go to **Plugins** in the sidebar
2. **Activate / Deactivate** — toggle any plugin
3. **Configure** — set plugin-specific parameters
4. **Hooks** tab — see which hooks are registered and active

### Installing a Custom Plugin

1. Place the plugin file in `backend/app/plugins/`
2. Restart the backend service
3. The plugin appears in the Plugins list
4. Activate it from the UI

---

## Observability & Monitoring

PreSkool exposes full observability via Prometheus and Grafana.

### Prometheus Metrics

Available at `http://localhost:9090`. Key metrics:

| Metric | Description |
|--------|-------------|
| `http_requests_total` | Request count by endpoint and status |
| `http_request_duration_seconds` | Latency histogram |
| `active_users_total` | Current active sessions |
| `db_query_duration_seconds` | Database query times |

### Grafana Dashboards

Available at `http://localhost:3001` (admin/admin).  
Pre-built dashboards:
- **System Overview** — CPU, memory, request rates
- **API Performance** — endpoint latency and error rates
- **Tracing Dashboard** — distributed trace visualization

### Distributed Tracing (Jaeger)

Available at `http://localhost:16686` when `OTEL_ENABLED=true`. Traces every request end-to-end through middleware, service, and database layers.

### Log Management

Backend logs are structured JSON, one event per line:
```json
{
  "timestamp": "2026-02-20T16:30:01Z",
  "level": "INFO",
  "method": "POST",
  "path": "/api/v1/attendance/mark",
  "status": 200,
  "duration_ms": 45,
  "tenant_id": "school-a",
  "user_id": 3
}
```

Forward logs to your log aggregator (ELK/Loki) via Docker log driver.

---

## Backup & Restore

### PostgreSQL Backup

```bash
# Create a backup
docker compose exec db pg_dump -U preskool preskool > backup_$(date +%Y%m%d).sql

# Schedule daily backups via cron
0 2 * * * cd /app && docker compose exec -T db pg_dump -U preskool preskool > /backups/db_$(date +\%Y\%m\%d).sql
```

### Restore from Backup

```bash
# Stop the backend
docker compose stop backend

# Restore database
docker compose exec -T db psql -U preskool preskool < backup_20260220.sql

# Restart
docker compose start backend
```

### File Uploads Backup

```bash
# Backup uploaded files
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/
```

---

## GDPR & Data Privacy

PreSkool is built with GDPR compliance in mind:

### Data Subject Rights (Admin actions)

| Right | Admin Action |
|-------|-------------|
| Right to Access | `GET /api/v1/gdpr/data/export/{user_id}` |
| Right to Erasure | `DELETE /api/v1/gdpr/data/delete/{user_id}` |
| Right to Portability | `POST /api/v1/gdpr/data/portability/{user_id}` |
| Right to Rectification | Edit user/student records directly |

### Audit Log

All admin actions are recorded in `audit_logs`. View via:
```
GET /api/v1/gdpr/audit-log
```

### Data Retention

Configure how long records are retained:
```
GET/PUT /api/v1/gdpr/retention-policy
```

Recommended minimums:
- Student records: 7 years after graduation
- Payment records: 7 years (tax compliance)
- Attendance records: 3 years
- Login logs: 1 year

---

## Security Hardening

### Rate Limiting

The backend applies rate limiting via `setup_security()`. Default limits:
- Auth endpoints: 5 req/min per IP
- API endpoints: 100 req/min per user

### CORS Configuration

Set `ALLOWED_ORIGINS` in `.env` to your exact domain:
```
ALLOWED_ORIGINS=https://school.preskool.com
```
Wildcard `*` is only safe for internal networks.

### SSL/HTTPS

Configure SSL in `nginx/nginx.conf`:
```nginx
listen 443 ssl;
ssl_certificate /etc/ssl/certs/preskool.crt;
ssl_certificate_key /etc/ssl/private/preskool.key;
```

Use Let's Encrypt for free SSL certificates.

### Security Scanning

The `security/` directory contains security scan configurations. Run:
```bash
cd backend
bandit -r app/ -f json -o security-reports/bandit.json
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Backend won't start | Check `.env` for missing `SECRET_KEY` |
| Database connection failed | Verify `POSTGRES_PASSWORD` in `.env` |
| CORS errors in browser | Verify `ALLOWED_ORIGINS` includes frontend URL |
| Payment webhook not firing | Check Razorpay webhook URL is publicly accessible |
| Plugin not appearing | Check Python syntax in plugin file; restart backend |
| Emails not sending | SMTP config is a stub — implement email provider in `notification_service.py` |
| 401 on all requests | `SECRET_KEY` changed — all old tokens are invalid, users must re-login |
