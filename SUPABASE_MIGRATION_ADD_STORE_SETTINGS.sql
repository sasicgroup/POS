-- Add business_types and categories columns to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS business_types jsonb DEFAULT '["Retail Store", "Pharmacy", "Restaurant", "Electronics", "Grocery", "Fashion", "Other"]'::jsonb,
ADD COLUMN IF NOT EXISTS categories jsonb DEFAULT '[]'::jsonb;
