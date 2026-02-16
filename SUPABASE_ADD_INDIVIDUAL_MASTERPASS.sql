-- Move master_password from stores to employees for individual 2FA

-- 1. Add master_password to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS master_password text;

-- 2. (Optional) Remove master_password from stores to avoid confusion
-- ALTER TABLE public.stores DROP COLUMN IF EXISTS master_password;
