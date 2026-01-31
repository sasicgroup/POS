# OTP SMS Audit Report
**Date:** 2026-01-31  
**Priority:** HIGH (Critical Security Feature)  
**Status:** 🔴 SMS Not Sending (Alert Fallback Active)

---

## 🔍 Issue Summary

The OTP system is currently showing the OTP code in a browser alert instead of sending it via SMS. While the OTP is being generated and stored correctly in the database, the SMS delivery is failing silently.

**Current Behavior:**
- ✅ OTP code is generated (6-digit random number)
- ✅ OTP is stored in database with 5-minute expiry
- ✅ OTP verification works correctly
- ❌ SMS is NOT being sent to user's phone
- ⚠️ Fallback alert shows OTP in browser (development mode)

---

## 📋 OTP Flow Analysis

### 1. **Login Trigger** (`src/lib/auth-context.tsx` lines 281-412)

```
User enters username + PIN
  ↓
PIN validated against database
  ↓
Check if OTP is enabled (employee.otp_enabled === true)
  ↓
Generate 6-digit OTP code
  ↓
Store OTP in database (employees.otp_code, employees.otp_expiry)
  ↓
[ALERT] Show OTP in browser (line 364) ← DEVELOPMENT FALLBACK
  ↓
Call /api/auth/send-otp endpoint (lines 385-396)
  ↓
Return OTP_REQUIRED status to frontend
```

### 2. **API Route** (`src/app/api/auth/send-otp/route.ts`)

**Endpoint:** `POST /api/auth/send-otp`

**Request Body:**
```json
{
  "phone": "233XXXXXXXXX",
  "message": "Your OTP is 558742. Valid for 5 minutes.",
  "storeId": "store-uuid"
}
```

**Flow:**
1. Fetch SMS config from `app_settings` table for the given `storeId`
2. If no config found, try global fallback
3. Send SMS via configured provider (Hubtel or mNotify)
4. Log SMS attempt to `sms_logs` table

---

## 🐛 Identified Issues

### Issue #1: Silent API Failure
**Location:** `src/lib/auth-context.tsx` lines 384-396

```typescript
try {
    await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phone: employee.phone,
            message: `Your OTP is ${code}. Valid for 5 minutes.`,
            storeId: storeId
        })
    });
} catch (err) {
    console.error("Failed to send OTP via API", err);
}
```

**Problem:** The fetch call doesn't check the response status or handle API errors properly. Even if the API returns an error, the code continues silently.

**Impact:** User never knows if SMS failed to send.

---

### Issue #2: Missing Response Validation
**Location:** `src/lib/auth-context.tsx` lines 384-396

**Problem:** The code doesn't await or validate the API response:
- No check for `response.ok`
- No parsing of response JSON
- No error handling for failed SMS sends

**Expected Behavior:**
```typescript
const response = await fetch('/api/auth/send-otp', { ... });
const result = await response.json();

if (!result.success) {
    console.error('SMS failed:', result.error);
    // Show user-friendly error
}
```

---

### Issue #3: SMS Config May Not Exist
**Location:** `src/app/api/auth/send-otp/route.ts` lines 22-56

**Problem:** If no SMS configuration exists in the database for the store, the API returns:
```json
{
  "success": false,
  "error": "SMS Configuration not found for this store or globally."
}
```

**Root Cause:** SMS settings may not be configured in the `app_settings` table.

---

### Issue #4: StoreId May Be Null
**Location:** `src/lib/auth-context.tsx` lines 375-381

**Problem:** The code tries to find a storeId, but if none is found, it still proceeds with `storeId = undefined`, which causes the API to fail to fetch SMS config.

---

### Issue #5: Phone Number Format
**Location:** `src/app/api/auth/send-otp/route.ts` line 63

```typescript
const simplePhone = phone.replace(/\D/g, '');
```

**Potential Issue:** Phone numbers must be in the correct format for the SMS provider. For Ghana (Hubtel/mNotify):
- Should start with country code: `233XXXXXXXXX`
- Or local format: `0XXXXXXXXX`

---

## ✅ What's Working

1. ✅ **OTP Generation:** Random 6-digit codes are generated correctly
2. ✅ **Database Storage:** OTP and expiry are saved to `employees` table
3. ✅ **OTP Verification:** The `verifyOTP` function correctly validates codes
4. ✅ **Expiry Logic:** 5-minute expiry is enforced
5. ✅ **Service Role Key:** Configured in `.env.local` for bypassing RLS
6. ✅ **API Route Exists:** `/api/auth/send-otp/route.ts` is properly structured

---

## 🔧 Required Fixes

### Fix #1: Add Response Validation (HIGH PRIORITY)
**File:** `src/lib/auth-context.tsx`

Add proper error handling and user feedback:

```typescript
try {
    const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phone: employee.phone,
            message: `Your OTP is ${code}. Valid for 5 minutes.`,
            storeId: storeId
        })
    });
    
    const result = await response.json();
    
    if (!result.success) {
        console.error('[OTP] SMS send failed:', result.error);
        // Optional: Show toast notification to user
    } else {
        console.log('[OTP] SMS sent successfully');
    }
} catch (err) {
    console.error("Failed to send OTP via API", err);
}
```

---

### Fix #2: Verify SMS Configuration (CRITICAL)
**Action Required:** Check if SMS settings exist in database

**Query to run in Supabase SQL Editor:**
```sql
-- Check if SMS config exists
SELECT store_id, sms_config 
FROM app_settings 
WHERE sms_config IS NOT NULL;

-- If empty, you need to configure SMS settings
```

**Expected SMS Config Structure:**
```json
{
  "provider": "hubtel",  // or "mnotify"
  "hubtel": {
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "senderId": "SASIC"
  }
}
```

---

### Fix #3: Add Detailed Logging (MEDIUM PRIORITY)
**File:** `src/app/api/auth/send-otp/route.ts`

Add more detailed logs to trace the flow:

```typescript
console.log('[API] SMS Config:', config ? 'Found' : 'Not Found');
console.log('[API] Provider:', config?.provider);
console.log('[API] Phone:', phone);
console.log('[API] StoreId:', storeId);
```

---

### Fix #4: Ensure StoreId is Valid
**File:** `src/lib/auth-context.tsx` lines 375-397

Add validation before calling API:

```typescript
if (!storeId) {
    console.error('[OTP] No valid storeId found, cannot send SMS');
    // Still allow OTP flow to continue (user can use alert OTP)
    return { success: true, status: 'OTP_REQUIRED', tempUser: userObj };
}
```

---

### Fix #5: Remove Development Alert (PRODUCTION)
**File:** `src/lib/auth-context.tsx` lines 364, 465

**Current Code:**
```typescript
if (typeof window !== 'undefined') alert(`[DEV] Your OTP code is: ${code}`);
```

**Production Fix:**
```typescript
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    alert(`[DEV] Your OTP code is: ${code}`);
}
```

---

## 🧪 Testing Checklist

### Test 1: Verify SMS Config Exists
- [ ] Check `app_settings` table for SMS configuration
- [ ] Verify provider credentials are correct
- [ ] Test SMS provider API credentials separately

### Test 2: Check API Logs
- [ ] Login with OTP-enabled user
- [ ] Check browser console for `[API]` logs
- [ ] Check server terminal for API route logs
- [ ] Verify API returns success/failure properly

### Test 3: Validate Phone Numbers
- [ ] Ensure employee phone numbers are in correct format
- [ ] Test with Ghana number: `233XXXXXXXXX`
- [ ] Verify phone number in database matches expected format

### Test 4: Test SMS Delivery
- [ ] Configure SMS settings in dashboard
- [ ] Login with test user
- [ ] Verify SMS is received on phone
- [ ] Check `sms_logs` table for delivery status

---

## 📊 Database Schema Check

### Required Tables:
1. ✅ `employees` - stores OTP code and expiry
2. ✅ `app_settings` - stores SMS configuration
3. ✅ `sms_logs` - logs SMS attempts

### Required Columns in `employees`:
- `otp_enabled` (boolean)
- `otp_code` (text)
- `otp_expiry` (timestamp)
- `phone` (text)

### Required Columns in `app_settings`:
- `store_id` (uuid)
- `sms_config` (jsonb)

---

## 🎯 Next Steps

1. **Immediate:** Check browser console and server logs during login
2. **Verify:** SMS configuration exists in `app_settings` table
3. **Test:** SMS provider credentials are valid
4. **Fix:** Add response validation to OTP sending code
5. **Monitor:** Check `sms_logs` table for delivery status

---

## 📝 Notes

- The alert popup is a **development fallback** - this is intentional for testing
- SMS will only send if configuration exists in database
- The Service Role Key is correctly configured for bypassing RLS
- OTP verification logic is working correctly

---

**Next Action:** Let's check the browser console and server logs to see what's happening when you try to login.
