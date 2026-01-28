-- Migration for Parked Orders, Returns, and Refunds
-- Improved V3

-- 0. Clean cleanup (Use with caution in production, safe for dev iteration)
DROP TABLE IF EXISTS public.return_items CASCADE;
DROP TABLE IF EXISTS public.returns CASCADE;
DROP TABLE IF EXISTS public.parked_orders CASCADE;

-- 1. Parked Orders Table
CREATE TABLE IF NOT EXISTS public.parked_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    items JSONB NOT NULL, -- Array of cart items
    customer_id UUID REFERENCES public.customers(id), -- Optional
    customer_info JSONB, -- Backup name/phone if not linked to ID
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- Storing UUID directly without strict FK to avoid auth sync issues during dev
);

-- Index for fast retrieval
CREATE INDEX IF NOT EXISTS idx_parked_orders_store ON public.parked_orders(store_id);

-- 2. Returns Table
CREATE TABLE IF NOT EXISTS public.returns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    original_sale_id UUID REFERENCES public.sales(id),
    rma_number TEXT, -- Optional Human Readable ID
    reason TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_method TEXT CHECK (refund_method IN ('cash', 'card', 'momo', 'store_credit')),
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    processed_by UUID, -- Storing UUID directly
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Return Items Table (details of what was returned)
CREATE TABLE IF NOT EXISTS public.return_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    condition TEXT CHECK (condition IN ('sellable', 'damaged', 'expired')),
    restock_fee DECIMAL(10,2) DEFAULT 0
);

-- 4. Add indices
CREATE INDEX IF NOT EXISTS idx_returns_store ON public.returns(store_id);
CREATE INDEX IF NOT EXISTS idx_returns_sale ON public.returns(original_sale_id);

-- 5. RLS Policies (Crucial for access)
ALTER TABLE public.parked_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts if re-running
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.parked_orders;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.returns;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.return_items;
DROP POLICY IF EXISTS "Enable all access" ON public.parked_orders;
DROP POLICY IF EXISTS "Enable all access" ON public.returns;
DROP POLICY IF EXISTS "Enable all access" ON public.return_items;

-- Permissive Policies for Development
CREATE POLICY "Enable all access" ON public.parked_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.returns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.return_items FOR ALL USING (true) WITH CHECK (true);

-- 6. Retroactive Fix for Stocktakes (in case V2 policies failed)
-- Ensure RLS is on and policies exist
ALTER TABLE public.stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktake_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Drop old restrictive policies if they exist to replace with permissive ones
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.stocktakes;
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.stocktake_items;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'stocktakes' AND policyname = 'Enable all access'
    ) THEN
        CREATE POLICY "Enable all access" ON public.stocktakes FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'stocktake_items' AND policyname = 'Enable all access'
    ) THEN
        CREATE POLICY "Enable all access" ON public.stocktake_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;
