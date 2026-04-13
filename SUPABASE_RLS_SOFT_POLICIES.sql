-- SAFETY NET POLICIES: Only allow access to data for the user's own business/store
-- These policies are permissive: they do NOT break your app, but help prevent accidental data leaks

-- PRODUCTS TABLE
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Soft tenant access - products" ON public.products;
CREATE POLICY "Soft tenant access - products"
  ON public.products
  FOR ALL
  TO public
  USING (business_id = auth.jwt() ->> 'business_id');

-- SALES TABLE
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Soft tenant access - sales" ON public.sales;
CREATE POLICY "Soft tenant access - sales"
  ON public.sales
  FOR ALL
  TO public
  USING (business_id = auth.jwt() ->> 'business_id');

-- EMPLOYEES TABLE
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Soft tenant access - employees" ON public.employees;
CREATE POLICY "Soft tenant access - employees"
  ON public.employees
  FOR ALL
  TO public
  USING (business_id = auth.jwt() ->> 'business_id');

-- CUSTOMERS TABLE
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Soft tenant access - customers" ON public.customers;
CREATE POLICY "Soft tenant access - customers"
  ON public.customers
  FOR ALL
  TO public
  USING (business_id = auth.jwt() ->> 'business_id');

-- You can run this file in the Supabase SQL editor.
-- Your app will keep working, but users will only see their own data.
