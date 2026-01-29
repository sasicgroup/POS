-- Update Loyalty Program to 1% Cashback System
-- Earn Rate: 1 point per GHS spent
-- Redemption: 100 points = 1 GHS discount
-- This gives customers 1% cashback

UPDATE loyalty_programs 
SET 
    points_per_currency = 1,        -- Earn 1 point per 1 GHS spent
    redemption_rate = 0.01,          -- 100 points = 1 GHS (0.01 GHS per point)
    min_points_to_redeem = 50        -- Allow redemption from 50 points (GHS 0.50 discount)
WHERE store_id = '51adfb6d-78e8-4f12-b10f-6afbebc777fb';

-- Verify the update
SELECT 
    points_per_currency as "Earn Rate (pts/GHS)",
    redemption_rate as "Redemption (GHS/pt)",
    min_points_to_redeem as "Min Points to Redeem"
FROM loyalty_programs 
WHERE store_id = '51adfb6d-78e8-4f12-b10f-6afbebc777fb';
