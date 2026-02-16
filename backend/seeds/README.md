# Database Seeds

This directory contains database seeding scripts for PreSkool ERP.

## Files

- `001_initial_data.sql` - SQL seed script with demo tenants
- `seed.py` - Python script to seed initial data with proper password hashing

## Usage

### Using Python Script (Recommended)

The Python script properly hashes passwords and handles all data creation:

```bash
cd backend
source venv/bin/activate
python seeds/seed.py
```

### Using SQL Script

The SQL script creates tenants only. Users must be created via the API for proper password hashing:

```bash
psql -h localhost -U preskool_user -d preskool_db -f seeds/001_initial_data.sql
```

## Seed Data

### Tenants
- **Demo School** (demo-school): `demo.preskool.local`
- **Test College** (test-college): `test.preskool.local`

### Admin Users
- **Demo School Admin**: `admin@demo.preskool.local` / `Admin@123`
- **Test College Admin**: `admin@test.preskool.local` / `Admin@123`

⚠️ **WARNING**: Change these passwords in production!

## Creating New Seeds

To add new seed data:

1. Add data to `seed.py` 
2. Run the script to apply changes
3. Update this README with new seed information
