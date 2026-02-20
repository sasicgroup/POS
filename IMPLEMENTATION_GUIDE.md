# Implementation Status & Remaining Tasks

## ✅ COMPLETED

### 1. Enhanced Activity Logging - COMPLETE
- ✅ Automatic page visit tracking
- ✅ Comprehensive action trackers
- ✅ Integrated into dashboard layout

### 2. Customer Editing - COMPLETE
- ✅ Edit customer name
- ✅ Edit customer phone
- ✅ Edit customer loyalty points
- ✅ Inline editing with save/cancel

### 3. Hubtel Integration - FOUNDATION READY
- ✅ Database migration for payment_settings
- ✅ Hubtel service created (`src/lib/hubtel.ts`)
- ✅ Payment initialization function
- ✅ Payment verification function
- ✅ Configuration management

---

## ⏳ IN PROGRESS - NEED TO COMPLETE

### A. Settings - Profile Tab
**Location:** `src/app/dashboard/settings/page.tsx` (line ~154)

**Add after general tab:**
```tsx
{activeTab === 'profile' && (
    <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">My Profile</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                    <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                    <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                    <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                    onClick={handleUpdateProfile}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                    Save Profile Changes
                </button>
            </div>
        </div>
    </div>
)}
```

**Add handler function:**
```tsx
const handleUpdateProfile = async () => {
    if (!user?.id) return;
    
    const { error } = await supabase
        .from('employees')
        .update({
            name: profileData.name,
            phone: profileData.phone,
            username: profileData.username
        })
        .eq('id', user.id);

    if (error) {
        showToast('error', 'Failed to update profile');
    } else {
        showToast('success', 'Profile updated successfully!');
        // Update local user object
        const updatedUser = { ...user, ...profileData };
        localStorage.setItem('sms_user', JSON.stringify(updatedUser));
    }
};
```

---

### B. Settings - Payments Tab (Hubtel Configuration + Method Toggles)
**Location:** `src/app/dashboard/settings/page.tsx`

The payments tab now does double duty: it lets you configure the Hubtel MoMo integration **and** toggle which of the four supported payment methods are available in the POS (cash, MoMo, installment and the new SusuPay option). Make sure you extend the store's `payment_settings` JSON to include a `methods` object with boolean flags.

**Add state:**
```tsx
const [hubtelConfig, setHubtelConfig] = useState({
    enabled: false,
    client_id: '',
    client_secret: '',
    merchant_account: ''
});
```

**Load config in useEffect:**
```tsx
useEffect(() => {
    const loadHubtelConfig = async () => {
        if (activeStore?.id) {
            const config = await getHubtelConfig(activeStore.id);
            if (config) setHubtelConfig(config);
        }
    };
    loadHubtelConfig();
}, [activeStore]);
```

**Add tab content:**
```tsx
{activeTab === 'payments' && (
    <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Hubtel Payment Integration</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure Hubtel MoMo payments for your store</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={hubtelConfig.enabled}
                        onChange={(e) => setHubtelConfig({...hubtelConfig, enabled: e.target.checked})}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
            </div>

            <div className="grid gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client ID</label>
                    <input
                        type="text"
                        value={hubtelConfig.client_id}
                        onChange={(e) => setHubtelConfig({...hubtelConfig, client_id: e.target.value})}
                        placeholder="Enter your Hubtel Client ID"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client Secret</label>
                    <input
                        type="password"
                        value={hubtelConfig.client_secret}
                        onChange={(e) => setHubtelConfig({...hubtelConfig, client_secret: e.target.value})}
                        placeholder="Enter your Hubtel Client Secret"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Merchant Account Number</label>
                    <input
                        type="text"
                        value={hubtelConfig.merchant_account}
                        onChange={(e) => setHubtelConfig({...hubtelConfig, merchant_account: e.target.value})}
                        placeholder="Enter your Merchant Account Number"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                    onClick={handleSaveHubtelConfig}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                    Save Payment Settings
                </button>
            </div>
        </div>
    </div>
)}
```

**Add handler:**
```tsx
const handleSaveHubtelConfig = async () => {
    if (!activeStore?.id) return;
    
    const success = await saveHubtelConfig(activeStore.id, hubtelConfig);
    if (success) {
        showToast('success', 'Hubtel settings saved successfully!');
    } else {
        showToast('error', 'Failed to save Hubtel settings');
    }
};
```

**Add import:**
```tsx
import { getHubtelConfig, saveHubtelConfig } from '@/lib/hubtel';
```

---

### C. POS - Hubtel MoMo Integration
**Location:** `src/app/dashboard/sales/page.tsx`

**Add imports:**
```tsx
import { initializeHubtelPayment, getHubtelConfig, HubtelConfig } from '@/lib/hubtel';
```

**Add state:**
```tsx
const [hubtelConfig, setHubtelConfig] = useState<HubtelConfig | null>(null);
const [isProcessingPayment, setIsProcessingPayment] = useState(false);
```

**Load Hubtel config:**
```tsx
useEffect(() => {
    const loadHubtelConfig = async () => {
        if (activeStore?.id) {
            const config = await getHubtelConfig(activeStore.id);
            setHubtelConfig(config);
        }
    };
    loadHubtelConfig();
}, [activeStore]);
```

**Modify checkout to handle MoMo:**
Find the checkout confirmation handler (around line 1011) and replace with:
```tsx
onClick={async () => {
    setShowCheckoutConfirm(false);
    
    if (paymentMethod === 'momo' && hubtelConfig?.enabled) {
        // Process Hubtel MoMo payment
        setIsProcessingPayment(true);
        
        const paymentResult = await initializeHubtelPayment(hubtelConfig, {
            amount: grandTotal,
            customerName: customerName || 'Guest',
            customerPhone: customerPhone || '0000000000',
            description: `Purchase from ${activeStore.name}`,
            clientReference: `TRX-${Date.now()}`
        });

        setIsProcessingPayment(false);

        if (paymentResult.success && paymentResult.checkoutUrl) {
            // Open Hubtel checkout in new window
            window.open(paymentResult.checkoutUrl, '_blank');
            showToast('info', 'Complete payment in the opened window');
            
            // TODO: Implement payment verification callback
            // For now, proceed with checkout after user confirms
            setTimeout(() => {
                handleCheckout();
            }, 5000);
        } else {
            showToast('error', paymentResult.error || 'Payment initialization failed');
        }
    } else {
        // Cash payment - proceed normally
        handleCheckout();
    }
}}
```

---

### D. Loyalty Page - Fix Save Issues
**Location:** `src/app/dashboard/loyalty/page.tsx`

**Issues to fix:**
1. Data not persisting to database
2. Save buttons not working
3. Need to add proper database integration

**Check if loyalty_programs table exists in migrations.sql**
**If not, add:**
```sql
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    points_per_currency numeric DEFAULT 1,
    redemption_rate numeric DEFAULT 0.05,
    min_points_to_redeem int DEFAULT 100,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Then update loyalty page to save to database instead of localStorage**

---

## 🎯 PRIORITY ORDER

1. **Fix Loyalty Page** (Critical - data loss issue)
2. **Add Profile Tab** (Quick win)
3. **Add Payments Tab** (Enables Hubtel)
4. **Integrate Hubtel in POS** (Complete the feature)

---

## 📝 Files to Modify

1. ✅ `migrations.sql` - Add payment_settings column
2. ✅ `src/lib/hubtel.ts` - Hubtel service (created)
3. ⏳ `src/app/dashboard/settings/page.tsx` - Add profile & payments tabs
4. ⏳ `src/app/dashboard/sales/page.tsx` - Integrate Hubtel MoMo
5. ⏳ `src/app/dashboard/loyalty/page.tsx` - Fix save functionality

---

## 🚀 Quick Commands

```bash
# After implementing changes, run migrations
# (Execute migrations.sql in Supabase SQL editor)

# Test Hubtel integration
# 1. Go to Settings > Payments
# 2. Enable Hubtel and add credentials
# 3. Go to Sales/POS
# 4. Add items to cart
# 5. Select MoMo payment
# 6. Click Checkout
# 7. Should open Hubtel payment window
```
