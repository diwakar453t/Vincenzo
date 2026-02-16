-- Seed script for initial database data
-- This will create a demo tenant and admin user for testing

-- Insert demo tenant
INSERT INTO tenants (id, name, domain, is_active) 
VALUES 
    ('demo-school', 'Demo School', 'demo.preskool.local', true),
    ('test-college', 'Test College', 'test.preskool.local', true)
ON CONFLICT (domain) DO NOTHING;

-- Note: User passwords need to be created via the API since they require bcrypt hashing
-- These are just placeholder records for testing the database structure

-- Set current tenant for RLS bypass during seeding
SET app.is_superadmin = true;

-- Insert demo admin user (password should be set via API)
-- Password note: Use the signup API to create users with proper password hashing

COMMENT ON TABLE tenants IS 'Stores school/college tenant information for multi-tenancy';
COMMENT ON TABLE users IS 'Stores user accounts with role-based access control';
COMMENT ON COLUMN users.tenant_id IS 'Foreign key to tenants table for data isolation';
COMMENT ON COLUMN users.role IS 'User role: admin, teacher, student, or parent';

-- Reset the session variable
RESET app.is_superadmin;
