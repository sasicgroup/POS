-- Add referred_by to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Create referral logs table
CREATE TABLE IF NOT EXISTS public.referral_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    referrer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    referred_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
    reward_points numeric NOT NULL,
    created_at timestamp with time zone default now()
);

-- Enable RLS and setup policy
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev Access Referral Logs" ON public.referral_logs;
CREATE POLICY "Dev Access Referral Logs" ON public.referral_logs FOR ALL USING (true) WITH CHECK (true);
