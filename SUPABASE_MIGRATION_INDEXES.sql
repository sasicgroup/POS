-- Create indexes to improve query performance and prevent timeouts

-- Install pg_trgm extension if not exists for search optimization (Must be first for gin_trgm_ops)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for products by store
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
-- Index for search performance on products
CREATE INDEX IF NOT EXISTS idx_products_name_tgrm ON public.products USING gin (name gin_trgm_ops);

-- Index for customers by store
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);

-- Index for sales by store
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_employee_id ON public.sales(employee_id);

-- Index for stock adjustments/alerts (if query by stock)
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock);

-- Sales items indexes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
