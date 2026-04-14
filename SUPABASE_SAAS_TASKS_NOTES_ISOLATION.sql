-- =============================================================
-- SaaS ISOLATION PATCH: TASKS & NOTES
-- Description: Adds business_id to tasks and notes tables,
-- backfills the data from the stores table, and enforces 
-- strict multi-tenant Row Level Security policies.
-- =============================================================

-- 1. Add business_id columns (with foreign key constraints)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- 2. Backfill business_id based on store_id relationship
UPDATE public.tasks t
SET business_id = s.business_id
FROM public.stores s
WHERE t.store_id = s.id AND t.business_id IS NULL;

UPDATE public.notes n
SET business_id = s.business_id
FROM public.stores s
WHERE n.store_id = s.id AND n.business_id IS NULL;

-- 3. Enforce Data Integrity (Optional but recommended for strict isolation)
-- Uncomment these if you want to strictly enforce it on all future inserts:
-- ALTER TABLE public.tasks ALTER COLUMN business_id SET NOT NULL;
-- ALTER TABLE public.notes ALTER COLUMN business_id SET NOT NULL;

-- 4. Enable Row Level Security (redundant if already enabled, but safe)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 5. Drop old overly-permissive "Dev Access" policies
DROP POLICY IF EXISTS "Dev Access Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Dev Access Notes" ON public.notes;

-- 6. Create Strict Multi-Tenant Isolation Policies for Tasks
DROP POLICY IF EXISTS "Strict Tenant Policy: Tasks" ON public.tasks;
CREATE POLICY "Strict Tenant Policy: Tasks" ON public.tasks
AS PERMISSIVE FOR ALL 
TO PUBLIC 
USING (business_id = nullif(current_setting('app.current_business_id', true), '')::uuid)
WITH CHECK (business_id = nullif(current_setting('app.current_business_id', true), '')::uuid);

-- 7. Create Strict Multi-Tenant Isolation Policies for Notes
DROP POLICY IF EXISTS "Strict Tenant Policy: Notes" ON public.notes;
CREATE POLICY "Strict Tenant Policy: Notes" ON public.notes
AS PERMISSIVE FOR ALL 
TO PUBLIC 
USING (business_id = nullif(current_setting('app.current_business_id', true), '')::uuid)
WITH CHECK (business_id = nullif(current_setting('app.current_business_id', true), '')::uuid);

-- 8. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_tasks_business_id ON public.tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_notes_business_id ON public.notes(business_id);

-- Migration Complete
