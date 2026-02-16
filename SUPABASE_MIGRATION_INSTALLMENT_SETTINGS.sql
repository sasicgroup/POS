-- Migration to add installment settings with SMS template
CREATE TABLE IF NOT EXISTS public.installment_settings (
    store_id uuid REFERENCES public.stores(id) PRIMARY KEY,
    default_duration_days INTEGER DEFAULT 30,
    min_deposit_percentage NUMERIC DEFAULT 20, -- Default 20% deposit
    enable_sms_reminders BOOLEAN DEFAULT true,
    reminder_days_before INTEGER DEFAULT 3,
    interest_rate_percentage NUMERIC DEFAULT 0,
    sms_template_payment TEXT DEFAULT 'Hi {Name}, your installment payment of GHS {AmountPaid} for {Id} has been received. Balance left: GHS {AmountLeft}. Thank you!',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.installment_settings ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Enable all for store users" ON public.installment_settings;
CREATE POLICY "Enable all for store users" ON public.installment_settings
    FOR ALL USING (true) WITH CHECK (true);
