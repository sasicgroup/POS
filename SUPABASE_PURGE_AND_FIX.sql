-- DATA CLEANUP & OPTIMIZATION SCRIPT
-- Run this in the Supabase SQL Editor

-- 1. TRIM WHITESPACE (Fixes "hidden" spaces causing search failures)
UPDATE public.products 
SET 
  name = TRIM(name),
  sku = TRIM(sku),
  barcode = TRIM(barcode);

-- 2. ENSURE NULLS ARE HANDLED (Fixes distinct/search logic)
UPDATE public.products SET sku = NULL WHERE sku = '';
UPDATE public.products SET barcode = NULL WHERE barcode = '';

-- 3. REFRESH SEARCH INDEXES (Forces DB to rebuild lookup tables)
REINDEX TABLE public.products;

-- 4. UPDATE STATISTICS (Helps DB choose the fastest search method)
ANALYZE public.products;

-- 5. OPTIONAL: HARD RESET (DANGEROUS!!!)
-- Uncomment the lines below ONLY if you want to DELETE ALL PRODUCTS and start fresh.
-- TRUNCATE TABLE public.sale_items CASCADE;
-- TRUNCATE TABLE public.product_bundles CASCADE;
-- TRUNCATE TABLE public.products CASCADE;
