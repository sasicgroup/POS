-- SUPABASE_SUPER_ADMIN_SMS.sql
-- Run this in Supabase SQL Editor ONCE to add SMS support for Super Admin
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

-- 1. Add super_admin_sms_config column to global_settings (or create table if it doesn't exist)
ALTER TABLE global_settings
    ADD COLUMN IF NOT EXISTS super_admin_sms_config JSONB DEFAULT '{}'::jsonb;

-- 2. Create super_admin_sms_logs table
CREATE TABLE IF NOT EXISTS super_admin_sms_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           TEXT NOT NULL,
    message         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
    business_id     UUID REFERENCES businesses(id) ON DELETE SET NULL,
    business_name   TEXT,
    reminder_type   TEXT,   -- '6m', '3m', '1m', '1w', 'manual'
    sent_by         UUID REFERENCES super_admins(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add owner_phone to businesses table if not already there
ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS owner_phone TEXT;

-- 4. Index for quick lookup by business and date
CREATE INDEX IF NOT EXISTS idx_sa_sms_logs_business_id ON super_admin_sms_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_sa_sms_logs_created_at  ON super_admin_sms_logs(created_at DESC);

-- 5. Verify
SELECT 'super_admin_sms_logs table ready ✓' AS status;
SELECT COUNT(*) AS log_count FROM super_admin_sms_logs;
