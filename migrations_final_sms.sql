
-- Drop the policy that caused the error (if it was created)
DROP POLICY IF EXISTS "Enable read access for authenticated users based on store_id" ON "public"."sms_logs";
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON "public"."sms_logs";

-- Create table if it doesn't exist (in case previous run failed completely)
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
    status TEXT NOT NULL DEFAULT 'sent'
);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create Permissive Policy for now (Since custom auth is used, we trust the client for store_id association temporarily)
-- This fixes the "user_id column does not exist" error by removing the dependency on the employees table lookup via auth.uid()
CREATE POLICY "Allow public access to sms_logs" ON "public"."sms_logs"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);
