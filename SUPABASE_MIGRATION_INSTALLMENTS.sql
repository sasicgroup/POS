-- Migration for Installments and Part Payments

-- 1. Installments Table
CREATE TABLE IF NOT EXISTS public.installments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id),
    sale_id UUID REFERENCES public.sales(id),
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted')),
    next_payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Installment Payments Table (History of payments for an installment)
CREATE TABLE IF NOT EXISTS public.installment_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    installment_id UUID REFERENCES public.installments(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    recorded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add Indices
CREATE INDEX IF NOT EXISTS idx_installments_store ON public.installments(store_id);
CREATE INDEX IF NOT EXISTS idx_installments_customer ON public.installments(customer_id);
CREATE INDEX IF NOT EXISTS idx_installments_sale ON public.installments(sale_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_parent ON public.installment_payments(installment_id);

-- 4. RLS Policies
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access" ON public.installments;
DROP POLICY IF EXISTS "Enable all access" ON public.installment_payments;

CREATE POLICY "Enable all access" ON public.installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.installment_payments FOR ALL USING (true) WITH CHECK (true);
