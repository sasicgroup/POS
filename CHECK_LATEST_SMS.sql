-- CHECK LATEST SMS STATUS
SELECT 
    id,
    phone,
    message,
    status,
    created_at
FROM sms_logs 
ORDER BY created_at DESC 
LIMIT 5;

-- CHECK USER PHONE FORMAT IN DB
SELECT 
    username, 
    phone 
FROM employees 
WHERE username = 'sasic';
