-- ========================================
-- FIX SENDER ID (For SMS Delivery Issues)
-- ========================================

-- Sometimes SMS fails because the "Sender ID" is not registered or contains spaces.
-- Use this query to change the Sender ID to a simple "SASIC" for the store "SASIC ELEC"

UPDATE app_settings
SET sms_config = jsonb_set(sms_config, '{mnotify,senderId}', '"SASIC"')
WHERE store_id = '51adfb6d-78e8-4f12-b10f-6afbebc777fb';

-- Check if it updated
SELECT 
    store_id,
    sms_config->'mnotify'->>'senderId' as new_sender_id
FROM app_settings 
WHERE store_id = '51adfb6d-78e8-4f12-b10f-6afbebc777fb';
