-- =============================================================
-- SAAS EXPANSION V2: DYNAMIC PRICING & PLAN HIERARCHY
-- =============================================================

-- 1. PLAN DEFINITIONS (What features are included in which plan)
CREATE TABLE IF NOT EXISTS platform_plans (
    id TEXT PRIMARY KEY, -- 'starter', 'pro', 'enterprise'
    name TEXT NOT NULL,
    base_price_monthly DECIMAL NOT NULL,
    base_price_yearly DECIMAL NOT NULL,
    included_features JSONB DEFAULT '{}', -- e.g. {"loyalty": true, "whatsapp": false}
    max_stores INTEGER DEFAULT 1,
    max_employees INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed defaults
INSERT INTO platform_plans (id, name, base_price_monthly, base_price_yearly, included_features, max_stores, max_employees)
VALUES 
('starter', 'Starter', 50, 480, '{"loyalty": false, "whatsapp": false, "installments": true}', 1, 5),
('pro', 'Professional', 150, 1500, '{"loyalty": true, "whatsapp": true, "installments": true}', 3, 20),
('enterprise', 'Enterprise', 500, 5000, '{"loyalty": true, "whatsapp": true, "installments": true, "custom_domain": true}', 99, 999)
ON CONFLICT (id) DO UPDATE SET base_price_monthly = EXCLUDED.base_price_monthly;

-- 2. BUSINESS TABLE ENHANCEMENTS
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES platform_plans(id) DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS custom_price_monthly DECIMAL, -- Override if not null
ADD COLUMN IF NOT EXISTS custom_price_yearly DECIMAL,  -- Override if not null
ADD COLUMN IF NOT EXISTS domain_status TEXT DEFAULT 'none'; -- 'none', 'pending', 'active', 'failed'

-- 3. DOMAIN REQUESTS (White-Label)
CREATE TABLE IF NOT EXISTS domain_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    custom_domain TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'verifying', 'active', 'denied'
    dns_records JSONB, -- Required records to show user (A, CNAME)
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MARKETING CAMPAIGNS
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'sms', 'email', 'broadcast'
    target_criteria JSONB, -- e.g. {"plan_id": "pro"} or {"is_active": true}
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES super_admins(id)
);

-- 5. RLS
ALTER TABLE platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
