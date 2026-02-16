-- Migration to add loyalty points and profit tracking per product
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS earnable_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_profit NUMERIC DEFAULT 0;

-- Update existing products to have 0 if not set
UPDATE public.products 
SET earnable_points = 0, points_value = 0, estimated_profit = price - COALESCE(cost_price, 0)
WHERE earnable_points IS NULL;
