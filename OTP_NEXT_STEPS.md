# OTP SMS Investigation - Next Steps

## ✅ Completed Actions

1. **Enhanced Logging Added**
   - ✅ Added detailed logging to `auth-context.tsx` (login & resend OTP)
   - ✅ Added detailed logging to `/api/auth/send-otp` route
   - ✅ Now shows clear success/failure messages with emojis

2. **Created Diagnostic Tools**
   - ✅ `OTP_AUDIT_REPORT.md` - Comprehensive analysis of the issue
   - ✅ `OTP_DIAGNOSTIC_QUERIES.sql` - SQL queries to check database configuration

3. **Improved Error Handling**
   - ✅ API responses are now properly validated
   - ✅ Errors are logged with context
   - ✅ User-friendly error messages

---

## 🔍 What to Check Now

### Step 1: Check Browser Console Logs
**Action:** Open your browser's Developer Tools (F12) and look at the Console tab

**What to look for:**
```
[OTP] Attempting to send SMS: { phone: "233XXXXXXXXX", storeId: "uuid-here" }
[OTP] ✅ SMS sent successfully
```

**OR**

```
[OTP] ❌ SMS send failed: SMS Configuration not found for this store or globally.
```

**OR**

```
[OTP] ❌ No valid storeId found, cannot send SMS
```

### Step 2: Check Server Terminal Logs
**Action:** Look at the terminal where `npm run dev` is running

**What to look for:**
```
[API] Sending OTP to 233XXXXXXXXX (Store: uuid-here)
[API] Fetching SMS config for store: uuid-here
[API] ✅ SMS config found for store uuid-here: { provider: 'hubtel' }
[API] Hubtel key response: { ... }
```

**OR**

```
[API] ❌ No SMS configuration found in database
```

### Step 3: Run Diagnostic Queries
**Action:** Open Supabase SQL Editor and run the queries from `OTP_DIAGNOSTIC_QUERIES.sql`

**Priority queries:**
1. Query #1: Check if SMS config exists
2. Query #2: Verify employee has OTP enabled and correct phone
3. Query #3: Check recent SMS logs

---

## 🎯 Most Likely Issues (In Order)

### Issue #1: SMS Configuration Missing (90% probability)
**Symptom:** Console shows "SMS Configuration not found"

**Solution:**
1. Go to Dashboard → Settings → SMS Configuration
2. Configure your SMS provider (Hubtel or mNotify)
3. Enter your API credentials
4. Save settings

**OR manually insert via SQL:**
```sql
-- Get your store ID first
SELECT id, name FROM stores WHERE status != 'deleted';

-- Insert SMS config (replace YOUR_STORE_ID and credentials)
INSERT INTO app_settings (store_id, sms_config)
VALUES (
    'YOUR_STORE_ID',
    '{
        "provider": "hubtel",
        "hubtel": {
            "clientId": "YOUR_CLIENT_ID",
            "clientSecret": "YOUR_CLIENT_SECRET",
            "senderId": "SASIC"
        }
    }'::jsonb
);
```

---

### Issue #2: No StoreId Found (5% probability)
**Symptom:** Console shows "No valid storeId found"

**Solution:**
1. Check if employee has a `store_id` in the database
2. Check if employee has access via `employee_access` table
3. Ensure at least one store exists and is not deleted

---

### Issue #3: Phone Number Format (3% probability)
**Symptom:** SMS config exists but SMS still fails

**Solution:**
1. Verify phone number format in database
2. Should be: `233XXXXXXXXX` (Ghana)
3. Update if needed:
```sql
UPDATE employees 
SET phone = '233XXXXXXXXX'  -- Replace with actual number
WHERE username = 'your_username';
```

---

### Issue #4: Invalid SMS Provider Credentials (2% probability)
**Symptom:** API shows config found but provider returns error

**Solution:**
1. Verify your Hubtel/mNotify credentials are correct
2. Test credentials directly with provider's API
3. Check if account has sufficient balance

---

## 📊 Quick Diagnostic Checklist

Run through this checklist and note the results:

- [ ] **Browser Console:** What does it say when you try to login?
  - Result: _______________________

- [ ] **Server Terminal:** What logs appear during login attempt?
  - Result: _______________________

- [ ] **SQL Query #1:** Does SMS config exist in `app_settings`?
  - Result: ☐ Yes ☐ No

- [ ] **SQL Query #2:** Is employee's OTP enabled and phone number correct?
  - Result: ☐ Yes ☐ No

- [ ] **SQL Query #3:** Are there any entries in `sms_logs` table?
  - Result: ☐ Yes ☐ No

- [ ] **SQL Query #4:** Does at least one store exist?
  - Result: ☐ Yes ☐ No

---

## 🚀 How to Test

1. **Try to login** with an OTP-enabled user
2. **Check browser console** immediately
3. **Check server terminal** for API logs
4. **Take a screenshot** of both console and terminal
5. **Share the logs** so we can see exactly what's happening

---

## 📝 Expected Flow (When Working)

```
1. User enters username + PIN
   ↓
2. [DEV] Alert shows OTP: 558742
   ↓
3. Browser Console: [OTP] Attempting to send SMS: { phone: "233...", storeId: "..." }
   ↓
4. Server Terminal: [API] Sending OTP to 233... (Store: ...)
   ↓
5. Server Terminal: [API] Fetching SMS config for store: ...
   ↓
6. Server Terminal: [API] ✅ SMS config found for store ...: { provider: 'hubtel' }
   ↓
7. Server Terminal: [API] Hubtel key response: { ... }
   ↓
8. Browser Console: [OTP] ✅ SMS sent successfully
   ↓
9. User receives SMS on phone
```

---

## 🔧 Quick Fix Commands

### If SMS config is missing:
```bash
# Open Supabase SQL Editor and run:
# 1. Get store ID
SELECT id, name FROM stores WHERE status != 'deleted' LIMIT 1;

# 2. Insert SMS config (replace values)
INSERT INTO app_settings (store_id, sms_config)
VALUES (
    'YOUR_STORE_ID_FROM_STEP_1',
    '{"provider":"hubtel","hubtel":{"clientId":"YOUR_ID","clientSecret":"YOUR_SECRET","senderId":"SASIC"}}'::jsonb
);
```

### If phone number is wrong:
```sql
-- Update employee phone number
UPDATE employees 
SET phone = '233XXXXXXXXX'  -- Replace with correct number
WHERE username = 'sasic';  -- Replace with your username
```

---

## 📞 What I Need From You

To continue debugging, please provide:

1. **Browser Console Output** when you try to login
2. **Server Terminal Output** during the login attempt
3. **Results from SQL Query #1** (SMS config check)
4. **Screenshot** of the error/alert you see

This will help me pinpoint the exact issue and provide a targeted fix!

---

**Status:** ⏳ Waiting for diagnostic results
**Next:** Once you provide the logs, I can give you the exact fix needed
