-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references public.stores(id) on delete cascade,
    type text not null, -- 'order' | 'low_stock' | 'report' | 'custom'
    title text not null,
    message text not null,
    is_read boolean default false,
    metadata jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow public access (Check if policy exists before creating)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'notifications'
        AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" ON public.notifications FOR ALL USING (true);
    END IF;
END
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON public.notifications(store_id);
