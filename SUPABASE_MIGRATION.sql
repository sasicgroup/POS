-- Migration to add missing columns to 'stores' table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS branding jsonb,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS receipt_prefix text,
ADD COLUMN IF NOT EXISTS receipt_suffix text,
ADD COLUMN IF NOT EXISTS role_permissions jsonb,
ADD COLUMN IF NOT EXISTS last_transaction_number integer default 0,
ADD COLUMN IF NOT EXISTS pwa_settings jsonb DEFAULT '{"app_name": "Store Management Software", "short_name": "POS System", "theme_color": "#4f46e5", "icon_192": null, "icon_512": null}'::jsonb;

-- Optional: Update RLS policies if needed, but existing "for all using (true)" should cover new columns.
