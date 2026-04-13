-- Fix notifications table: Add business_id column and RLS policies

-- Add business_id column if it doesn't exist
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS business_id uuid references public.businesses(id) on delete cascade;

-- Enable RLS if not already enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON public.notifications;
DROP POLICY IF EXISTS "Soft tenant access - notifications" ON public.notifications;

-- Create proper RLS policies for multi-tenant access
CREATE POLICY "Soft tenant access - notifications"
  ON public.notifications
  FOR ALL
  TO public
  USING (
    business_id = (auth.jwt() ->> 'business_id')::uuid
    OR store_id IN (SELECT id FROM public.stores WHERE business_id = (auth.jwt() ->> 'business_id')::uuid)
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON public.notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON public.notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
