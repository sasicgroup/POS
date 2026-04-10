-- =============================================================
-- MULTI-TENANT MIGRATION - SAFE & NON-DESTRUCTIVE
-- Run this in Supabase SQL Editor
-- Your existing store data is preserved and migrated automatically
-- =============================================================

-- STEP 1: Create super_admins table (separate from employees)
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- Store bcrypt hash; for MVP store plaintext until you add hashing
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- STEP 2: Create businesses table (one row per tenant/client)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,           -- URL-safe slug e.g. "johns-retail"
  owner_email TEXT,
  owner_phone TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#4f46e5',
  app_name TEXT,                        -- Custom app name for this business
  
  -- Subscription / Billing
  plan TEXT DEFAULT 'monthly',          -- 'monthly' | 'yearly' | 'forever' | 'trial'
  subscription_start TIMESTAMPTZ DEFAULT now(),
  subscription_end TIMESTAMPTZ,         -- NULL = forever / never expires
  grace_period_days INT DEFAULT 7,      -- Extra days after expiry before hard lockout
  is_active BOOLEAN DEFAULT true,

  -- Custom Domain
  custom_domain TEXT UNIQUE,            -- e.g. "pos.johnsretail.com" (optional)
  custom_subdomain TEXT UNIQUE,         -- e.g. "johnsretail" → johnsretail.sasicbusiness.com

  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES super_admins(id),
  notes TEXT
);

-- STEP 3: Create subscription audit log
CREATE TABLE IF NOT EXISTS business_subscription_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  action TEXT NOT NULL,                 -- 'created' | 'renewed' | 'suspended' | 'reactivated' | 'plan_changed'
  plan TEXT,
  subscription_end TIMESTAMPTZ,
  amount NUMERIC,
  note TEXT,
  actioned_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 4: Add business_id to stores (nullable = safe for existing data)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- STEP 5: Add business_id to employees (nullable = safe)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- =============================================================
-- STEP 6: MIGRATE EXISTING DATA
-- Creates a default "Sasic Group" business from your existing stores
-- and links all your current stores + employees to it.
-- SAFE: Does not modify any existing store/product/sales data.
-- =============================================================

-- 6a: Insert a default super admin (you)
-- Change email and password_hash before running!
INSERT INTO super_admins (name, email, password_hash, is_active)
VALUES ('Super Admin', 'admin@sasicgroup.com', 'changeme123', true)
ON CONFLICT (email) DO NOTHING;

-- 6b: Create the default "Sasic Group" business from your existing stores
-- We'll derive name from global_settings if available
WITH gs AS (
  SELECT app_name FROM global_settings LIMIT 1
),
inserted AS (
  INSERT INTO businesses (
    name, slug, plan, subscription_end, is_active,
    primary_color, created_at
  )
  SELECT
    COALESCE((SELECT app_name FROM gs), 'Sasic Group'),
    'sasic-group',         -- Default slug — change if you want
    'forever',             -- Your own business never expires
    NULL,                  -- NULL = forever
    true,
    '#4f46e5',
    now()
  WHERE NOT EXISTS (SELECT 1 FROM businesses WHERE slug = 'sasic-group')
  RETURNING id
)
SELECT id FROM inserted;

-- 6c: Link all existing stores to the default business
UPDATE stores
SET business_id = (SELECT id FROM businesses WHERE slug = 'sasic-group')
WHERE business_id IS NULL;

-- 6d: Link all existing employees to the default business
UPDATE employees
SET business_id = (SELECT id FROM businesses WHERE slug = 'sasic-group')
WHERE business_id IS NULL;

-- =============================================================
-- STEP 7: Verify migration results
-- =============================================================
-- Run these SELECT queries to confirm everything migrated correctly:

-- SELECT COUNT(*) as total_stores, COUNT(business_id) as linked_stores FROM stores;
-- SELECT COUNT(*) as total_employees, COUNT(business_id) as linked_employees FROM employees;
-- SELECT * FROM businesses;
-- SELECT * FROM super_admins;

-- =============================================================
-- OPTIONAL: Add indexes for performance
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_stores_business_id ON stores(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_business_id ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_custom_domain ON businesses(custom_domain);

-- =============================================================
-- DONE! Your existing data is fully preserved and migrated.
-- =============================================================
