-- =============================================================
-- SAAS FIX: MULTI-TENANT USERNAME UNIQUE CONSTRAINT
-- Replaces the global UNIQUE(username) with UNIQUE(business_id, username)
-- so different businesses can use the same usernames (like "admin" or phone numbers)
-- =============================================================

DO $$ 
BEGIN
    -- 1. Drop the global username unique constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_username_key') THEN
        ALTER TABLE public.employees DROP CONSTRAINT employees_username_key;
    END IF;

    -- 2. Add multi-tenant unique constraint (scoped to business_id)
    -- Note: If there are existing duplicates within the SAME business, this will fail.
    -- Assuming they are across different businesses.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_business_username_key') THEN
        ALTER TABLE public.employees ADD CONSTRAINT employees_business_username_key UNIQUE (business_id, username);
    END IF;

END $$;
