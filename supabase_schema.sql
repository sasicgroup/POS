
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Stores Table
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    location text,
    phone text,
    currency text default 'GHS',
    tax_settings jsonb default '{"enabled": true, "type": "percentage", "value": 12.5}'::jsonb,
    branding jsonb,
    receipt_prefix text,
    receipt_suffix text,
    role_permissions jsonb,
    last_transaction_number integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Employees Table (Users)
create table public.employees (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references public.stores(id) on delete cascade,
    name text not null,
    role text check (role in ('owner', 'manager', 'associate')) not null,
    pin text not null, -- Simple PIN/Password for POS
    email text, -- Optional for login/recovery
    salary numeric default 0,
    avatar text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Products Table
create table public.products (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references public.stores(id) on delete cascade,
    name text not null,
    category text not null,
    price numeric not null,
    stock integer default 0,
    sku text,
    barcode text,
    expiry_date date,
    image text,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Customers Table 
create table public.customers (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references public.stores(id) on delete cascade,
    name text not null,
    phone text,
    email text,
    total_spent numeric default 0,
    points integer default 0,
    last_visit timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Sales Table
create table public.sales (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references public.stores(id) on delete cascade,
    employee_id uuid references public.employees(id),
    customer_id uuid references public.customers(id),
    total_amount numeric not null,
    tax_amount numeric default 0,
    discount_amount numeric default 0,
    payment_method text not null,
    status text default 'completed',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Sale Items Table
create table public.sale_items (
    id uuid default uuid_generate_v4() primary key,
    sale_id uuid references public.sales(id) on delete cascade,
    product_id uuid references public.products(id),
    quantity integer not null,
    price_at_sale numeric not null,
    subtotal numeric not null
);

-- 7. Payroll History Table
create table public.payroll_runs (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references public.stores(id) on delete cascade,
    month text not null, -- e.g., "January 2026"
    total_amount numeric not null,
    employees_paid_count integer not null,
    status text default 'Completed',
    run_date timestamp with time zone default timezone('utc'::text, now())
);

-- 8. Settings / SMS Config (Stored per store or global?? Assuming per store in a real app, but single store for now)
create table public.app_settings (
    store_id uuid references public.stores(id) primary key,
    sms_config jsonb,
    whatsapp_config jsonb
);

-- RLS Policies (Row Level Security) - optional but recommended
alter table public.stores enable row level security;
alter table public.employees enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;

-- For demo simplicity, we are creating a public policy (NOT SECURE FOR PRODUCTION BUT GOOD FOR PROTOTYPE)
create policy "Public Access" on public.stores for all using (true);
create policy "Public Access" on public.employees for all using (true);
create policy "Public Access" on public.products for all using (true);
create policy "Public Access" on public.customers for all using (true);
create policy "Public Access" on public.sales for all using (true);
create policy "Public Access" on public.sale_items for all using (true);
create policy "Public Access" on public.payroll_runs for all using (true);
create policy "Public Access" on public.app_settings for all using (true);

-- Insert Default Store
insert into public.stores (name, location) values ('My Awesome Store', 'Accra, Ghana');
