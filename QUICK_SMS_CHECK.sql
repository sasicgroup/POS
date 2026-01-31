-- ========================================
-- QUICK SMS DIAGNOSTIC - Run these one by one
-- ========================================

-- QUERY 1: Check if SMS config exists (MOST IMPORTANT)
-- Copy and run this first
SELECT 
    store_id,
    sms_config
FROM app_settings 
WHERE sms_config IS NOT NULL;

-- Expected: Should return at least 1 row with SMS config
-- If EMPTY: This is your problem! SMS config is missing.


-- QUERY 2: Get all stores (to find your store ID)
SELECT 
    id,
    name,
    status
FROM stores 
WHERE status != 'deleted'
ORDER BY name;

-- Expected: Shows all your stores
-- Note the 'id' column - you'll need this for Query 5


-- QUERY 3: Check your employee settings
SELECT 
    id,
    name,
    username,
    phone,
    otp_enabled,
    store_id,
    role
FROM employees 
WHERE username = 'sasic';  -- Replace with your username if different

-- Expected: Shows your employee record
-- Verify: otp_enabled = true, phone has a value


-- QUERY 4: Check recent SMS logs
SELECT 
    phone,
    message,
    status,
    store_id
FROM sms_logs 
ORDER BY id DESC 
LIMIT 10;

-- Expected: Shows recent SMS attempts
-- If EMPTY: SMS API has never been called


-- ========================================
-- QUERY 5: INSERT SMS CONFIG (Only if Query 1 was empty)
-- ========================================
-- IMPORTANT: Replace these values with your actual credentials!

/*
-- Step 1: Get your store ID from Query 2 above
-- Step 2: Replace YOUR_STORE_ID and credentials below
-- Step 3: Uncomment and run

-- For Hubtel:
INSERT INTO app_settings (store_id, sms_config)
VALUES (
    'YOUR_STORE_ID_HERE',  -- Replace with actual store ID from Query 2
    '{
        "provider": "hubtel",
        "hubtel": {
            "clientId": "YOUR_HUBTEL_CLIENT_ID",
            "clientSecret": "YOUR_HUBTEL_CLIENT_SECRET",
            "senderId": "SASIC"
        }
    }'::jsonb
)
ON CONFLICT (store_id) 
DO UPDATE SET sms_config = EXCLUDED.sms_config;

-- OR for mNotify:
INSERT INTO app_settings (store_id, sms_config)
VALUES (
    'YOUR_STORE_ID_HERE',  -- Replace with actual store ID from Query 2
    '{
        "provider": "mnotify",
        "mnotify": {
            "apiKey": "YOUR_MNOTIFY_API_KEY",
            "senderId": "SASIC"
        }
    }'::jsonb
)
ON CONFLICT (store_id) 
DO UPDATE SET sms_config = EXCLUDED.sms_config;
*/


-- ========================================
-- QUERY 6: Verify SMS config was inserted
-- ========================================
-- Run this after Query 5 to confirm it worked
SELECT 
    store_id,
    sms_config->>'provider' as provider,
    CASE 
        WHEN sms_config->>'provider' = 'hubtel' THEN 
            sms_config->'hubtel'->>'senderId'
        WHEN sms_config->>'provider' = 'mnotify' THEN 
            sms_config->'mnotify'->>'senderId'
    END as sender_id
FROM app_settings 
WHERE sms_config IS NOT NULL;

-- Expected: Shows your SMS provider and sender ID
