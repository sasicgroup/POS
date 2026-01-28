-- FIX RLS POLICIES (RUN THIS script to fix permission errors)

-- 1. Ensure RLS is enabled
ALTER TABLE public.parked_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktake_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to ensure no conflicts
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.parked_orders;
DROP POLICY IF EXISTS "Enable all access" ON public.parked_orders;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.returns;
DROP POLICY IF EXISTS "Enable all access" ON public.returns;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.return_items;
DROP POLICY IF EXISTS "Enable all access" ON public.return_items;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.stocktakes;
DROP POLICY IF EXISTS "Enable all access" ON public.stocktakes;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.stocktake_items;
DROP POLICY IF EXISTS "Enable all access" ON public.stocktake_items;

-- 3. Create WIDE OPEN policies for Development
-- This allows anyone (even anon) to read/write, which fixes the "401" and "RLS" errors locally.
CREATE POLICY "Dev Access Parked Orders" ON public.parked_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Access Returns" ON public.returns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Access Return Items" ON public.return_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Access Stocktakes" ON public.stocktakes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Access Stocktake Items" ON public.stocktake_items FOR ALL USING (true) WITH CHECK (true);

-- 4. Create missing RPC functions for Stock Management
CREATE OR REPLACE FUNCTION increment_stock(row_id UUID, quantity INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock + quantity
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_points(row_id UUID, amount INT)
RETURNS VOID AS $$
BEGIN
  UPDATE customers 
  SET points = GREATEST(0, points - amount)
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
