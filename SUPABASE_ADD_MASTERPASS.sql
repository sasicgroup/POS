-- Add two_factor_method to employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS two_factor_method text DEFAULT 'sms';

-- Add master_password to stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS master_password text;

-- Update existing employees to have 'sms' as default
UPDATE public.employees SET two_factor_method = 'sms' WHERE two_factor_method IS NULL;
