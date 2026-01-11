-- Create other_income table
create table public.other_income (
    id uuid default uuid_generate_v4() primary key,
    store_id uuid references public.stores(id) on delete cascade,
    source text not null, -- e.g. "Service", "Consultation", "Investment"
    amount numeric not null,
    description text,
    date date default CURRENT_DATE,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.other_income enable row level security;

-- Add policy
create policy "Public Access" on public.other_income for all using (true);
