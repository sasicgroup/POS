-- =============================================================
-- SAAS RLS RESTORE ANON: HOTFIX FOR AUTH AND SETTINGS
-- Restores permissive access for standard tables so the custom PIN
-- auth and settings updates can successfully query and modify data.
-- =============================================================

DO $$ 
DECLARE
    t text;
    tables_to_restore text[] := ARRAY[
        'employees', 'employee_access', 'stores', 'products', 'sales', 
        'sale_items', 'customers', 'payroll_runs', 'other_income', 
        'parked_orders', 'returns', 'return_items', 'stocktakes', 
        'stocktake_items', 'app_settings', 'businesses',
        'admin_audit_logs', 'platform_settings', 'invoices',
        'sms_transactions', 'support_tickets', 'broadcasts',
        'installment_settings', 'loyalty_programs'
    ];
BEGIN
    FOR t IN SELECT unnest(tables_to_restore) LOOP
        -- Ensure RLS is enabled
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- Create a blanket policy for SELECT, INSERT, UPDATE, DELETE if it doesn't exist
        -- This restores the previous "Enable all access" functionality that was dropped
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations' AND tablename = t
        ) THEN
            EXECUTE format('CREATE POLICY "Allow all operations" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
        END IF;
    END LOOP;
END $$;
