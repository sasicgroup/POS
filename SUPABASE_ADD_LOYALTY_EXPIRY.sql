-- Add expiry_months column to loyalty_programs table
ALTER TABLE public.loyalty_programs 
ADD COLUMN IF NOT EXISTS expiry_months int DEFAULT 12;

-- Update existing records to have 12 months expiry
UPDATE public.loyalty_programs 
SET expiry_months = 12 
WHERE expiry_months IS NULL;
