-- =============================================================
-- SaaS FINAL SCOPING MIGRATION
-- Description: Adds business_id to all remaining unsized tables,
-- backfills data from store_id relationships, and enforces 
-- strict multi-tenant Row Level Security policies.
-- =============================================================

-- List of tables to migrate:
-- tasks, notes, sale_payments, expenses, installments, 
-- installment_payments, installment_settings, loyalty_programs, 
-- loyalty_logs, sms_logs

-- 1. Add business_id columns
DO $$ 
BEGIN 
    -- tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='business_id') THEN
        ALTER TABLE public.tasks ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

    -- notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='business_id') THEN
        ALTER TABLE public.notes ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

    -- sale_payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_payments' AND column_name='business_id') THEN
        ALTER TABLE public.sale_payments ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

    -- expenses
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='business_id') THEN
        ALTER TABLE public.expenses ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

    -- installments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='installments' AND column_name='business_id') THEN
        ALTER TABLE public.installments ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

    -- installment_payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='installment_payments' AND column_name='business_id') THEN
        ALTER TABLE public.installment_payments ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

    -- installment_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='installment_settings' AND column_name='business_id') THEN
        ALTER TABLE public.installment_settings ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

    -- loyalty_programs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loyalty_programs' AND column_name='business_id') THEN
        ALTER TABLE public.loyalty_programs ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

    -- loyalty_logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loyalty_logs' AND column_name='business_id') THEN
        ALTER TABLE public.loyalty_logs ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

    -- sms_logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sms_logs' AND column_name='business_id') THEN
        ALTER TABLE public.sms_logs ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;

END $$;

-- 2. Backfill business_id based on store_id relationship
UPDATE public.tasks t SET business_id = s.business_id FROM public.stores s WHERE t.store_id = s.id AND t.business_id IS NULL;
UPDATE public.notes n SET business_id = s.business_id FROM public.stores s WHERE n.store_id = s.id AND n.business_id IS NULL;
UPDATE public.sale_payments p SET business_id = s.business_id FROM public.sales sl JOIN public.stores s ON sl.store_id = s.id WHERE p.sale_id = sl.id AND p.business_id IS NULL;
UPDATE public.expenses e SET business_id = s.business_id FROM public.stores s WHERE e.store_id = s.id AND e.business_id IS NULL;
UPDATE public.installments i SET business_id = s.business_id FROM public.stores s WHERE i.store_id = s.id AND i.business_id IS NULL;
UPDATE public.installment_payments ip SET business_id = i.business_id FROM public.installments i WHERE ip.installment_id = i.id AND ip.business_id IS NULL;
UPDATE public.installment_settings iset SET business_id = s.business_id FROM public.stores s WHERE iset.store_id = s.id AND iset.business_id IS NULL;
UPDATE public.loyalty_programs lp SET business_id = s.business_id FROM public.stores s WHERE lp.store_id = s.id AND lp.business_id IS NULL;
UPDATE public.loyalty_logs ll SET business_id = s.business_id FROM public.stores s WHERE ll.store_id = s.id AND ll.business_id IS NULL;
UPDATE public.sms_logs sl SET business_id = s.business_id FROM public.stores s WHERE sl.store_id = s.id AND sl.business_id IS NULL;

-- 3. Enable RLS and create isolation policies
DO $$ 
DECLARE 
    t_name text;
    tables_to_policy text[] := ARRAY['tasks', 'notes', 'sale_payments', 'expenses', 'installments', 'installment_payments', 'installment_settings', 'loyalty_programs', 'loyalty_logs', 'sms_logs'];
BEGIN 
    FOREACH t_name IN ARRAY tables_to_policy LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Strict Tenant Policy" ON public.%I', t_name);
        EXECUTE format('CREATE POLICY "Strict Tenant Policy" ON public.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (business_id = nullif(current_setting(''app.current_business_id'', true), '''')::uuid) WITH CHECK (business_id = nullif(current_setting(''app.current_business_id'', true), '''')::uuid)', t_name);
    END LOOP;
END $$;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_business_id ON public.tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_notes_business_id ON public.notes(business_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_business_id ON public.sale_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON public.expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_installments_business_id ON public.installments(business_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_business_id ON public.installment_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_business_id ON public.loyalty_programs(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_logs_business_id ON public.loyalty_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_business_id ON public.sms_logs(business_id);

-- Migration Complete
