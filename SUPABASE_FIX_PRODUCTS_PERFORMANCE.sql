-- Fix Products Table Performance Issues
-- Add indexes to speed up queries and prevent timeouts

-- 1. Index on store_id (most important - used in every query)
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);

-- 2. Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- 3. Composite index for store_id + created_at (optimal for paginated queries)
CREATE INDEX IF NOT EXISTS idx_products_store_created ON public.products(store_id, created_at DESC);

-- 4. Index on barcode for quick lookups during scanning
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- 5. Index on name for search functionality
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- 6. Analyze the table to update statistics
ANALYZE public.products;

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'products' 
ORDER BY indexname;
