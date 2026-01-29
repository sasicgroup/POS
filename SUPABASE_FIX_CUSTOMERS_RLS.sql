-- FIX RLS for customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable all access" ON public.customers;
DROP POLICY IF EXISTS "Dev Access Customers" ON public.customers;

CREATE POLICY "Dev Access Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
