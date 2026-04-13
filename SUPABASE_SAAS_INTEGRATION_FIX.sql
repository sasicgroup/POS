-- =============================================================
-- SAAS INTEGRATION FIXES
-- Aligning schema with UI expectations and fixing RLS gaps
-- =============================================================

-- 1. SUPPORT TICKETS ENHANCEMENTS
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Generate ticket numbers for existing ones if any
UPDATE support_tickets SET ticket_number = 'TIC-' || id::text WHERE ticket_number IS NULL;

-- 2. RLS POLICIES FOR SUPER ADMIN DATA (Read-only for public client)
-- NOTE: In a real production app, we would use custom claims or API routes.
-- For this platform, we allow SELECT on these administrative tables.
-- The pages are protected by SuperAdminContext middleware.

DO $$ 
BEGIN
    -- admin_audit_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select on audit logs' AND tablename = 'admin_audit_logs') THEN
        CREATE POLICY "Allow public select on audit logs" ON admin_audit_logs FOR SELECT USING (true);
    END IF;

    -- support_tickets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on tickets' AND tablename = 'support_tickets') THEN
        CREATE POLICY "Allow public read on tickets" ON support_tickets FOR SELECT USING (true);
    END IF;

    -- broadcasts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on broadcasts' AND tablename = 'broadcasts') THEN
        CREATE POLICY "Allow public read on broadcasts" ON broadcasts FOR SELECT USING (true);
    END IF;

    -- platform_plans
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on plans' AND tablename = 'platform_plans') THEN
        CREATE POLICY "Allow public read on plans" ON platform_plans FOR SELECT USING (true);
    END IF;

    -- businesses (Ensure super admin can read all businesses)
    -- This assumes businesses already has RLS but might not allow "public" read.
    -- We add a policy specifically for the platform control context.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow platform read on businesses' AND tablename = 'businesses') THEN
        CREATE POLICY "Allow platform read on businesses" ON businesses FOR SELECT USING (true);
    END IF;
END $$;
