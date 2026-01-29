-- Add product_name column to sale_items table
-- This allows us to preserve the product name at the time of sale
-- even if the product is later renamed or deleted

ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Update existing records to populate product_name from products table
UPDATE public.sale_items si
SET product_name = p.name
FROM public.products p
WHERE si.product_id = p.id
AND si.product_name IS NULL;
