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
