-- OTP SMS Diagnostic Queries
-- Run these in your Supabase SQL Editor to diagnose the OTP SMS issue

-- ========================================
-- 1. CHECK SMS CONFIGURATION
-- ========================================
-- This checks if SMS config exists in app_settings table
SELECT 
    store_id,
    sms_config
FROM app_settings 
WHERE sms_config IS NOT NULL;

-- Expected output: Should show at least one row with SMS config
-- If empty, you need to configure SMS settings in the dashboard


-- ========================================
-- 2. CHECK EMPLOYEE OTP SETTINGS
-- ========================================
-- This checks which employees have OTP enabled and their phone numbers
SELECT 
    id,
    name,
    username,
    phone,
    otp_enabled,
    store_id,
    role
FROM employees 
WHERE otp_enabled = true;

-- Expected output: Should show employees with OTP enabled
-- Verify phone numbers are in correct format (e.g., 233XXXXXXXXX)


-- ========================================
-- 3. CHECK RECENT SMS LOGS
-- ========================================
-- This shows recent SMS sending attempts
SELECT 
    phone,
    message,
    status,
    channel,
    store_id,
    created_at
FROM sms_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- Expected output: Should show SMS attempts with status 'sent' or 'failed'
-- If empty, SMS API is not being called at all


-- ========================================
-- 4. CHECK STORES
-- ========================================
-- This shows all active stores
SELECT 
    id,
    name,
    status,
    phone,
    created_at
FROM stores 
WHERE status != 'deleted'
ORDER BY sort_order, created_at;

-- Expected output: List of all stores
-- Note the store IDs to match with app_settings


-- ========================================
-- 5. CHECK APP_SETTINGS TABLE STRUCTURE
-- ========================================
-- This verifies the app_settings table exists and has correct columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'app_settings'
ORDER BY ordinal_position;

-- Expected output: Should show columns including 'sms_config' (jsonb type)


-- ========================================
-- 6. SAMPLE SMS CONFIG INSERT (IF MISSING)
-- ========================================
-- If you don't have SMS config, use this template to insert one
-- IMPORTANT: Replace with your actual credentials!

/*
-- For Hubtel:
INSERT INTO app_settings (store_id, sms_config)
VALUES (
    'YOUR_STORE_ID_HERE',  -- Replace with actual store ID from query #4
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

-- For mNotify:
INSERT INTO app_settings (store_id, sms_config)
VALUES (
    'YOUR_STORE_ID_HERE',  -- Replace with actual store ID from query #4
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
-- 7. VERIFY EMPLOYEE PHONE FORMAT
-- ========================================
-- This checks if phone numbers are in the correct format
SELECT 
    id,
    name,
    phone,
    CASE 
        WHEN phone ~ '^233[0-9]{9}$' THEN '✅ Valid Ghana format'
        WHEN phone ~ '^0[0-9]{9}$' THEN '⚠️ Local format (may need country code)'
        ELSE '❌ Invalid format'
    END as phone_status
FROM employees 
WHERE otp_enabled = true;

-- Expected output: All phones should show ✅ Valid format
-- If not, update phone numbers to include country code (233XXXXXXXXX)


-- ========================================
-- 8. CHECK RECENT OTP CODES (DEBUG ONLY)
-- ========================================
-- This shows recent OTP codes for debugging
-- WARNING: Only use in development!
SELECT 
    id,
    name,
    username,
    otp_code,
    otp_expiry,
    CASE 
        WHEN otp_expiry > NOW() THEN '✅ Valid'
        ELSE '❌ Expired'
    END as otp_status
FROM employees 
WHERE otp_code IS NOT NULL
ORDER BY otp_expiry DESC
LIMIT 10;

-- Expected output: Should show recent OTP codes
-- Verify expiry is in the future (5 minutes from generation)
