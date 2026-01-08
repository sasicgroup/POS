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
