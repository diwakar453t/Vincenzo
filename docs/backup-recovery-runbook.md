# PreSkool ERP — Backup & Recovery Runbook

> **Audience**: Operations team, DevOps engineers, DBAs
> **Last Updated**: 2026-02-20
> **Classification**: Internal — Confidential

---

## 1. Backup Schedule

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full DB dump | Daily at 02:00 UTC | 30 days local, 90 days S3 | `/var/backups/preskool/` + S3 |
| Weekly archive | Every Sunday 01:00 UTC | 1 year | S3 Glacier |
| Pre-deployment | Before every release | 7 days | Local |

### Cron Setup (on DB host)
```cron
# Daily backup at 02:00 UTC
0 2 * * * /bin/bash /opt/preskool/backend/scripts/backup.sh >> /var/log/preskool-backup.log 2>&1

# Weekly restore-test (Sunday 03:00 UTC) — validates backup integrity
0 3 * * 0 /bin/bash /opt/preskool/backend/scripts/restore-test.sh >> /var/log/preskool-restore-test.log 2>&1
```

---

## 2. Manual Backup

```bash
# Run backup immediately
export DB_HOST=localhost DB_PORT=5432 DB_NAME=preskool_db DB_USER=preskool
export PGPASSWORD="$(cat /etc/preskool/db-password)"

bash /opt/preskool/backend/scripts/backup.sh

# With S3 upload
S3_BUCKET=preskool-prod-backups bash /opt/preskool/backend/scripts/backup.sh
```

**Expected output:**
```
════════════════════════════════════════════════════════
  PreSkool ERP — Database Backup | Thu Feb 20 02:00:00 UTC 2026
════════════════════════════════════════════════════════
[BACKUP] Dumping database 'preskool_db'...
[OK]    Backup created: /var/backups/preskool/preskool-backup-20260220_020000.sql.gz (14M)
[OK]    MD5: a3f5c8d2e1b4a7f9c2e5b8d1a4f7c0e3
[OK]    Checksum verified ✓
[OK]    Gzip integrity check passed
[OK]    Deleted 0 old backup(s)
```

---

## 3. Restore Procedure

### 3.1 Automated Restore Test (Weekly)
```bash
bash /opt/preskool/backend/scripts/restore-test.sh
```
- Creates DB `preskool_restore_test`
- Verifies all 15+ required tables exist
- Auto-drops the test DB when done

### 3.2 Full Production Restore (Disaster Recovery)

> ⚠️ **This overwrites the production database. Follow the DR checklist first.**

```bash
# Step 1: Take application offline (maintenance mode)
docker-compose stop frontend backend

# Step 2: Identify backup to restore
ls -lt /var/backups/preskool/*.sql.gz | head -5
# or from S3:
aws s3 ls s3://preskool-prod-backups/preskool-backups/ | sort | tail -10

# Step 3: Download from S3 (if needed)
aws s3 cp s3://preskool-prod-backups/preskool-backups/preskool-backup-20260220_020000.sql.gz \
  /var/backups/preskool/

# Step 4: Verify checksum
md5sum --check preskool-backup-20260220_020000.sql.gz.md5

# Step 5: Drop and recreate production DB
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='preskool_db';"
psql -U postgres -c "DROP DATABASE IF EXISTS preskool_db;"
psql -U postgres -c "CREATE DATABASE preskool_db OWNER preskool;"

# Step 6: Restore
gunzip -c preskool-backup-20260220_020000.sql.gz | psql -U preskool preskool_db

# Step 7: Run migrations (bring schema up to latest)
cd /opt/preskool/backend
alembic upgrade head

# Step 8: Bring application back online
docker-compose up -d frontend backend

# Step 9: Verify
curl http://localhost:8000/api/v1/health
```

---

## 4. Disaster Recovery Drill (Quarterly)

Run this checklist every quarter to validate the DR process:

- [ ] **Trigger**: Identify the backup to restore (simulate: "production DB lost")
- [ ] **Download**: Fetch backup from S3 to a DR host
- [ ] **Verify**: MD5 checksum matches
- [ ] **Restore**: Run `restore-test.sh` targeting the DR host
- [ ] **Validate**: All smoke queries pass (table count, row counts)
- [ ] **RTO**: Measure time from "incident declared" to "application accessible"
  - **Target RTO**: ≤ 2 hours
- [ ] **RPO**: Confirm data loss is within the last backup window
  - **Target RPO**: ≤ 24 hours (daily backup) / ≤ 1 hour (with WAL archiving)
- [ ] **Sign-off**: DR drill record signed by ops lead

### DR Drill Log

| Date | Performed By | Backup Used | RTO Achieved | RPO Window | Result |
|------|-------------|-------------|--------------|------------|--------|
| | | | | | |

---

## 5. Backup Monitoring & Alerts

### Check Backup Health
```bash
# List backups and sizes
ls -lh /var/backups/preskool/*.sql.gz

# Check last backup age (should be < 25h for daily schedule)
LATEST=$(ls -t /var/backups/preskool/*.sql.gz | head -1)
AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST")) / 3600 ))
echo "Latest backup: $LATEST (${AGE}h ago)"

# Verify S3 replication
aws s3 ls s3://preskool-prod-backups/preskool-backups/ | tail -5
```

### Alert Thresholds (configure in Grafana/PagerDuty)
| Alert | Condition | Severity |
|-------|-----------|----------|
| Backup missing | No new backup for > 26 hours | 🔴 Critical |
| Backup small | Backup < 1MB | 🟡 Warning |
| Restore test failed | restore-test.sh exit code ≠ 0 | 🟡 Warning |
| S3 upload failed | AWS CLI exit code ≠ 0 | 🟡 Warning |

---

## 6. Point-in-Time Recovery (PITR)

For sub-24-hour RPO, configure WAL archiving:

```conf
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://preskool-prod-backups/wal/%f'
```

```bash
# Restore to a specific point in time
pg_restore --target-time="2026-02-20 14:30:00 UTC" ...
```

---

## 7. Contacts

| Role | Name | Contact |
|------|------|---------|
| DBA / DB Owner | | |
| DevOps Lead | | |
| On-call Engineer | | |
| Cloud Admin (S3) | | |
