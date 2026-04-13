-- =============================================================================
-- PLATFORM RLS (production) — run in Supabase SQL editor AFTER:
--   1. App env: SUPABASE_SERVICE_ROLE_KEY, SUPER_ADMIN_SESSION_SECRET (32+ chars)
--   2. Super-admin UI uses /api/super-admin/* (service role; bypasses RLS)
--   3. Public tenant branding uses GET /api/public/business?slug=|id=
--
-- Egress: RLS adds no extra round-trips; each query still returns only allowed rows.
-- Locking platform tables prevents anon key from reading super_admins / subscription logs.
--
-- TENANT TABLES (products, sales, employees, …): do NOT enable strict RLS here until
-- you use Supabase Auth JWT claims or route all tenant traffic through Next.js APIs.
-- Full tenant RLS with the current anon + localStorage auth would break the POS unless migrated.
-- =============================================================================

-- ─── super_admins ───────────────────────────────────────────────────────────
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admins_deny_anon" ON public.super_admins;
CREATE POLICY "super_admins_deny_anon"
  ON public.super_admins FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "super_admins_deny_authenticated" ON public.super_admins;
CREATE POLICY "super_admins_deny_authenticated"
  ON public.super_admins FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ─── business_subscription_logs ─────────────────────────────────────────────
ALTER TABLE public.business_subscription_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_logs_deny_anon" ON public.business_subscription_logs;
CREATE POLICY "sub_logs_deny_anon"
  ON public.business_subscription_logs FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "sub_logs_deny_auth" ON public.business_subscription_logs;
CREATE POLICY "sub_logs_deny_auth"
  ON public.business_subscription_logs FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ─── super_admin_sms_logs ───────────────────────────────────────────────────
ALTER TABLE public.super_admin_sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sa_sms_logs_deny_anon" ON public.super_admin_sms_logs;
CREATE POLICY "sa_sms_logs_deny_anon"
  ON public.super_admin_sms_logs FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "sa_sms_logs_deny_auth" ON public.super_admin_sms_logs;
CREATE POLICY "sa_sms_logs_deny_auth"
  ON public.super_admin_sms_logs FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ─── global_settings: marketing site may still SELECT with anon (optional) ───
-- Super-admin writes use service role via API. Anon cannot mutate.
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_settings_select_anon" ON public.global_settings;
CREATE POLICY "global_settings_select_anon"
  ON public.global_settings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "global_settings_select_auth" ON public.global_settings;
CREATE POLICY "global_settings_select_auth"
  ON public.global_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "global_settings_deny_insert_anon" ON public.global_settings;
CREATE POLICY "global_settings_deny_insert_anon"
  ON public.global_settings FOR INSERT TO anon WITH CHECK (false);

DROP POLICY IF EXISTS "global_settings_deny_update_anon" ON public.global_settings;
CREATE POLICY "global_settings_deny_update_anon"
  ON public.global_settings FOR UPDATE TO anon USING (false);

DROP POLICY IF EXISTS "global_settings_deny_delete_anon" ON public.global_settings;
CREATE POLICY "global_settings_deny_delete_anon"
  ON public.global_settings FOR DELETE TO anon USING (false);

DROP POLICY IF EXISTS "global_settings_deny_insert_auth" ON public.global_settings;
CREATE POLICY "global_settings_deny_insert_auth"
  ON public.global_settings FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "global_settings_deny_update_auth" ON public.global_settings;
CREATE POLICY "global_settings_deny_update_auth"
  ON public.global_settings FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "global_settings_deny_delete_auth" ON public.global_settings;
CREATE POLICY "global_settings_deny_delete_auth"
  ON public.global_settings FOR DELETE TO authenticated USING (false);

-- NOTE: `businesses` table is intentionally NOT locked down here: the tenant app still
-- updates branding via the browser anon key (updateGlobalSettings). When you move that
-- to an authenticated API, add: SELECT/UPDATE policies scoped by business_id or JWT.
