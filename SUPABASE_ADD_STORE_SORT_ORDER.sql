-- Add sort_order column to stores table for custom ordering
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Optional: Initial population to ensure some order (though 0 default is fine)
-- We can update existing stores to have sequential sort_order based on creation time
DO $$
DECLARE
    r RECORD;
    counter INTEGER := 0;
BEGIN
    FOR r IN SELECT id FROM public.stores ORDER BY created_at ASC LOOP
        counter := counter + 1;
        UPDATE public.stores SET sort_order = counter WHERE id = r.id;
    END LOOP;
END $$;
