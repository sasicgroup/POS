-- Create a table for global application settings (Branding)
CREATE TABLE IF NOT EXISTS public.global_settings (
    id integer primary key default 1,
    app_name text default 'SASIC STORES',
    app_logo text,
    primary_color text default '#4f46e5',
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row if not exists
INSERT INTO public.global_settings (id, app_name, primary_color) 
VALUES (1, 'SASIC STORES', '#4f46e5') 
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Allow public access (Read/Write for simplicity in this prototype, restrict write to admins in prod)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'global_settings'
        AND policyname = 'Allow All Access'
    ) THEN
        CREATE POLICY "Allow All Access" ON public.global_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;
