-- Run these commands in your Supabase SQL Editor to update your database schema

-- 1. Add missing columns to the 'products' table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS video text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'In Stock',
ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- 2. Verify 'image' column exists (it should, but just in case)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image text;

-- 3. (Optional) If you want to persist tax settings and currency for stores properly
--    ensure the columns exist (they are in the original schema but good to verify)
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GHS',
ADD COLUMN IF NOT EXISTS tax_settings jsonb DEFAULT '{"enabled": true, "type": "percentage", "value": 12.5}'::jsonb;

-- 4. Multi-Store Employee Access
create table if not exists public.employee_access (
    id uuid default uuid_generate_v4() primary key,
    employee_id uuid references public.employees(id) on delete cascade,
    store_id uuid references public.stores(id) on delete cascade,
    role text check (role in ('owner', 'manager', 'associate')), 
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(employee_id, store_id)
);

-- Backfill existing employees
insert into public.employee_access (employee_id, store_id, role)
select id, store_id, role from public.employees
on conflict do nothing;

-- 5. Expenses Table
create table if not exists public.expenses (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references public.stores(id) on delete cascade,
    category text not null, -- 'Rent', 'Utilities', 'Salary', 'Maintenance', 'Other'
    amount numeric not null,
    description text,
    date date default CURRENT_DATE,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Authentication & Security Updates
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS failed_attempts int DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS otp_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS otp_code text,
ADD COLUMN IF NOT EXISTS otp_expiry timestamp with time zone;

-- Ensure username is unique (Safe execution)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_username_key') THEN
        ALTER TABLE public.employees ADD CONSTRAINT employees_username_key UNIQUE (username);
    END IF;
END $$;

-- 7. Add 'username' to owner/existing employees if null
-- update public.employees set username = lower(name) where username is null;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_url text;

-- 8. Shift Management
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS shift_start time,
ADD COLUMN IF NOT EXISTS shift_end time,
ADD COLUMN IF NOT EXISTS work_days text[] DEFAULT '{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}';

-- 9. Activity Logs
create table if not exists public.activity_logs (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references public.stores(id) on delete set null,
    user_id uuid references public.employees(id) on delete set null,
    action text not null,
    details jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Rename 'associate' role to 'staff' (Correct Order)

-- A. Drop existing constraints first to allow data modification
DO $$
BEGIN
    -- Drop constraint on employees table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_role_check') THEN
        ALTER TABLE public.employees DROP CONSTRAINT employees_role_check;
    END IF;

    -- Drop constraint on employee_access table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_access_role_check') THEN
        ALTER TABLE public.employee_access DROP CONSTRAINT employee_access_role_check;
    END IF;
END $$;

-- B. Now it is safe to update the data (no constraints blocking 'staff')
UPDATE public.employees SET role = 'staff' WHERE role = 'associate';
UPDATE public.employee_access SET role = 'staff' WHERE role = 'associate';

-- C. Apply new constraints with 'staff' included
ALTER TABLE public.employees 
ADD CONSTRAINT employees_role_check 
CHECK (role IN ('owner', 'manager', 'staff'));

ALTER TABLE public.employee_access 
ADD CONSTRAINT employee_access_role_check 
CHECK (role IN ('owner', 'manager', 'staff'));

-- 11. Add role_permissions to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS role_permissions jsonb;

-- 12. Add 'employee_id' to 'sales' table for tracking "Sold By"
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS employee_id uuid references public.employees(id) on delete set null;

-- 13. Add new Customer Metrics
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS points int DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_visits int DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_visit timestamp with time zone;

-- 14. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'order', 'low_stock', 'report', 'custom'
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    metadata jsonb, -- Additional data like order_id, product_id, etc.
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON public.notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- 15. Add payment_settings to stores table for Hubtel integration
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS payment_settings jsonb DEFAULT '{
    "default_provider": "hubtel",
    "hubtel": {
        "enabled": false,
        "api_id": "",
        "api_key": ""
    },
    "paystack": {
        "enabled": false,
        "public_key": "",
        "secret_key": ""
    }
}'::jsonb;

-- 16. Create Loyalty Programs Table
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    points_per_currency numeric DEFAULT 1,
    redemption_rate numeric DEFAULT 0.05,
    min_points_to_redeem int DEFAULT 100,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id)
);

-- 16.5 Create Loyalty Logs Table
CREATE TABLE IF NOT EXISTS public.loyalty_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    points int NOT NULL, -- Positive for earned, negative for redeemed
    type text NOT NULL, -- 'earned', 'redeemed', 'adjustment'
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_loyalty_logs_customer_id ON public.loyalty_logs(customer_id);

-- 17. Create SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    phone text NOT NULL,
    message text NOT NULL,
    channel text DEFAULT 'sms', -- 'sms', 'whatsapp'
    status text DEFAULT 'sent', -- 'sent', 'failed'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_store_id ON public.sms_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs(created_at DESC);
  
-- 18. Add receipt ID settings  
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS receipt_prefix text DEFAULT 'TRX';  
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS receipt_suffix text DEFAULT ''; 
