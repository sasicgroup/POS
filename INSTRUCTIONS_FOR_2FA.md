# 2FA Implementation - User Choice Between SMS and Masterpass

We have implemented a flexible 2FA system where users can choose between SMS OTP and Masterpass verification at login time.

## 1. Database Update Required (CRITICAL)
You need to run the following SQL to update your database schema.
Copy the content below and run it in your **Supabase Dashboard > SQL Editor**.

```sql
-- Add master_password column to employees table for individual 2FA
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS master_password text;

-- Optionally add two_factor_method column (for future use/tracking)
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS two_factor_method text DEFAULT 'sms';
```

This SQL is also saved in `SUPABASE_ADD_INDIVIDUAL_MASTERPASS.sql`.

## 2. How It Works

### For Administrators (Settings):
1.  **Go to Settings > Team Members**.
2.  **Add or Edit a Team Member**.
3.  **Set Master Password (Optional)**: Enter a unique master password for the employee. This allows them to use Masterpass as a 2FA option.
4.  **Enable 2FA**: Toggle the "Enable 2FA" switch. When enabled, both SMS and Masterpass options are available at login.

### For Staff (Login):
1.  **Enter Username and PIN** on the login page.
2.  **Choose Verification Method**: After successful PIN verification, if 2FA is enabled, you'll see two options:
    *   **SMS OTP**: Receive a one-time code via text message
    *   **Master Password**: Use your personal master password
3.  **Complete Verification**: 
    *   If you choose SMS, enter the 6-digit code sent to your phone
    *   If you choose Masterpass, enter your personal master password
4.  **Access Granted**: Upon successful verification, you'll be logged into the dashboard.

## 3. Key Features
- **Dual Method Support**: Both SMS and Masterpass are always enabled when 2FA is on
- **User Choice**: Staff members choose their preferred method at login time
- **Fallback Option**: If SMS is unreliable, staff can use Masterpass instead
- **Individual Passwords**: Each staff member has their own unique master password
- **Flexible**: Staff can switch between methods on each login

## 4. Notes
- If a staff member doesn't have a master password set, only SMS OTP will be available
- If a staff member doesn't have a phone number, only Masterpass will be available (if set)
- The "Enable 2FA" toggle controls whether 2FA is required at all
