-- Optimizing Database Performance to fix timeout issues
-- Run this in your Supabase SQL Editor

-- 1. Create Index on products.store_id (CRITICAL for inventory fetch)
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);

-- 2. Create Index on customers.store_id (For customer lookups)
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- 3. Create Index on sales.store_id (For sales history)
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);

-- 4. Create Index on sale_items.sale_id
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);

-- 5. Additional Product Indexes for Search Performance (Future proofing)
-- Using gin index for text search if needed, but btree is fine for exact/prefix
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- 6. Employees Index
CREATE INDEX IF NOT EXISTS idx_employees_store_id ON public.employees(store_id);
