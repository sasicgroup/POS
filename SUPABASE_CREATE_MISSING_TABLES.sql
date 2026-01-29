-- Create Missing Tables to Fix 404 Errors
-- These tables are for optional features but will silence console warnings

-- 1. SMS Templates Table
-- Allows storing custom SMS templates per store
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL, -- 'receipt', 'welcome', 'low_stock', 'custom'
    message text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_store_id ON public.sms_templates(store_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_type ON public.sms_templates(type);

-- 2. Loyalty Campaigns Table
-- Allows creating special loyalty promotions (e.g., "Double Points Weekend")
CREATE TABLE IF NOT EXISTS public.loyalty_campaigns (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    campaign_type text NOT NULL, -- 'double_points', 'bonus_points', 'discount'
    multiplier numeric DEFAULT 2, -- For double/triple points campaigns
    bonus_points int DEFAULT 0, -- Fixed bonus points to award
    discount_percentage numeric DEFAULT 0, -- Discount percentage for campaign
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_store_id ON public.loyalty_campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_dates ON public.loyalty_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_active ON public.loyalty_campaigns(is_active);

-- 3. Enable RLS on new tables
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_campaigns ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for development access
DROP POLICY IF EXISTS "Dev Access SMS Templates" ON public.sms_templates;
CREATE POLICY "Dev Access SMS Templates" ON public.sms_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Dev Access Loyalty Campaigns" ON public.loyalty_campaigns;
CREATE POLICY "Dev Access Loyalty Campaigns" ON public.loyalty_campaigns FOR ALL USING (true) WITH CHECK (true);

-- Verify tables were created
SELECT 
    table_name,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('sms_templates', 'loyalty_campaigns')
ORDER BY table_name;
