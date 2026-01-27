-- Feature 3: Product Bundles (Kits)
-- Allows a product (parent) to be composed of other products (children)

-- Add is_bundle flag to products for easier filtering
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_bundle boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.product_bundles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    child_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    quantity integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Feature 7: Stocktake / Inventory Count
-- Tracks sessions where inventory is counted and reconciled
CREATE TABLE IF NOT EXISTS public.stocktakes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')), 
    notes text,
    created_by uuid, -- Link to user/employee if possible, or just text name
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.stocktake_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    stocktake_id uuid REFERENCES public.stocktakes(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    expected_stock integer DEFAULT 0,
    counted_stock integer DEFAULT 0,
    difference integer GENERATED ALWAYS AS (counted_stock - expected_stock) STORED,
    cost_variance numeric DEFAULT 0 -- Stores value difference
);

-- Feature 11: Layaway / Split Payments
-- Enhance Sales table to support partial payments and different statuses
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'pending', 'refunded')),
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due numeric DEFAULT 0, -- Can be calculated, but storing helps with queries
ADD COLUMN IF NOT EXISTS due_date timestamp with time zone;

-- Create a payment history table for split payments
CREATE TABLE IF NOT EXISTS public.sale_payments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    payment_method text, -- cash, mobile_money, card
    reference text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Feature 50: Multi-Site Dashboard Support (Views/Indexes)
-- Optimize queries for cross-store reporting
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON public.sales(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales(store_id, payment_status);

-- Enable RLS for new tables
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktake_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

-- Simple Policies (Open for now based on existing patterns, restrict in PROD)
CREATE POLICY "Enable all access for authenticated users" ON public.product_bundles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.stocktakes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.stocktake_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.sale_payments FOR ALL USING (auth.role() = 'authenticated');
