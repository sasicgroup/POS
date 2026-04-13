-- =============================================================
-- SUPABASE SAAS EXPANSION V1
-- Implementing 9 core SaaS features for Super Admin
-- =============================================================

-- 1. PLATFORM SETTINGS (Global configuration)
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default SMS Wholesale Price
INSERT INTO platform_settings (key, value)
VALUES ('sms_pricing', '{"price_per_sms": 0.05, "currency": "GHS"}')
ON CONFLICT (key) DO NOTHING;

-- 2. BUSINESS TABLE UPDATES
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS sms_balance DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS billing_details JSONB DEFAULT '{}';

-- 3. SMS TRANSACTIONS (Wallet Tracking)
CREATE TABLE IF NOT EXISTS sms_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    amount DECIMAL NOT NULL, -- positive for deposit, negative for usage
    type TEXT NOT NULL, -- 'deposit', 'usage', 'refund'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- 4. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    invoice_number TEXT UNIQUE NOT NULL,
    amount DECIMAL NOT NULL,
    status TEXT DEFAULT 'unpaid', -- 'paid', 'unpaid', 'void'
    billing_period_start DATE,
    billing_period_end DATE,
    pdf_url TEXT, -- In case we use storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BROADCASTS (System-wide announcements)
CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
    display_style TEXT DEFAULT 'banner', -- 'banner', 'toast'
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    target_plan TEXT, -- null for all, or 'monthly', 'yearly', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ADMIN AUDIT LOGS (Compliance)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES super_admins(id),
    target_business_id UUID REFERENCES businesses(id),
    action TEXT NOT NULL, -- 'TOGGLE_ACTIVE', 'VIEW_AS', 'SMS_DEPOSIT', etc.
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id),
    sender_type TEXT NOT NULL, -- 'admin', 'business_owner'
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Super Admin restricted access (policies should be created carefully)
-- For now, we allow reading for verified contexts.
